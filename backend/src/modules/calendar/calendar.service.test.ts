import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { initStore, store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { calendarService } from "./calendar.service.js";
import { zonedDateTime } from "./calendar.time.js";

function user(role: Role): PublicUser {
  return {
    id: role,
    email: `${role}@impactone.example`,
    name: role,
    role,
    title: role,
    assignedProjectIds: ["ksp-hills"],
    permissions: permissionsFor(role),
  };
}

describe("calendar time zones", () => {
  it("keeps Asia/Riyadh at +03:00", () => {
    assert.equal(zonedDateTime("2026-11-03", "10:00", "Asia/Riyadh").iso, "2026-11-03T10:00:00+03:00");
  });

  it("applies the offset that belongs to the date", () => {
    assert.equal(zonedDateTime("2026-11-03", "10:00", "America/New_York").iso, "2026-11-03T10:00:00-05:00");
    assert.equal(zonedDateTime("2026-07-15", "10:00", "America/New_York").iso, "2026-07-15T10:00:00-04:00");
  });

  it("rejects a zone that is not an IANA name", () => {
    assert.throws(() => zonedDateTime("2026-11-03", "10:00", "Riyadh"), AppError);
  });
});

describe("calendar scheduling", () => {
  before(async () => {
    await initStore();
  });

  it("hides sharing from consultant and viewer roles", async () => {
    const desk = await calendarService.desk(user("consultant"));
    assert.equal(desk.desk.canSchedule, false);
    assert.ok(desk.desk.calendars.every((calendar) => calendar.shares.length === 0));
    assert.equal(desk.desk.timeZone, "Asia/Riyadh");
  });

  it("rejects scheduling from a viewer", async () => {
    await assert.rejects(
      () =>
        calendarService.schedule(user("viewer"), {
          calendarId: "impact-team",
          title: "Should fail",
          date: "2026-11-04",
          startTime: "09:00",
          endTime: "09:30",
          timeZone: "Asia/Riyadh",
          invitations: [],
          reminders: [],
        }),
      (error: unknown) => error instanceof AppError && error.status === 403,
    );
  });

  it("schedules in the given time zone with default reminders", async () => {
    const meeting = await calendarService.schedule(user("manager"), {
      calendarId: "impact-team",
      title: "Access review",
      date: "2026-11-04",
      startTime: "09:00",
      endTime: "09:30",
      timeZone: "Asia/Riyadh",
      location: "Riyadh",
      invitations: [{ email: "Tetia@impactone.example", optional: false }],
      reminders: [],
    });
    assert.equal(meeting.startsAt, "2026-11-04T09:00:00+03:00");
    assert.equal(meeting.endsAt, "2026-11-04T09:30:00+03:00");
    assert.equal(meeting.timeZone, "Asia/Riyadh");
    assert.deepEqual(meeting.reminders, [
      { method: "email", minutesBefore: 1440 },
      { method: "popup", minutesBefore: 30 },
    ]);
    assert.equal(meeting.invitations[0]?.email, "tetia@impactone.example");
    assert.equal(meeting.invitations[0]?.name, "Tetia");
  });

  it("refuses a required guest who is already booked", async () => {
    await assert.rejects(
      () =>
        calendarService.schedule(user("executive"), {
          calendarId: "impact-team",
          title: "Overlap",
          date: "2026-10-30",
          startTime: "10:15",
          endTime: "10:45",
          timeZone: "Asia/Riyadh",
          invitations: [{ email: "zygm@impactone.example" }],
        }),
      (error: unknown) => error instanceof AppError && error.status === 409,
    );
  });

  it("allows an optional guest who is already booked", async () => {
    const meeting = await calendarService.schedule(user("executive"), {
      calendarId: "ioc-project",
      title: "Optional overlap",
      date: "2026-10-30",
      startTime: "10:15",
      endTime: "10:45",
      timeZone: "Asia/Riyadh",
      invitations: [{ email: "zygm@impactone.example", optional: true }],
    });
    assert.equal(meeting.invitations[0]?.optional, true);
  });

  it("reports availability in the requested zone", async () => {
    const report = await calendarService.availability(user("manager"), {
      date: "2026-10-30",
      startTime: "14:00",
      endTime: "15:00",
      timeZone: "Asia/Riyadh",
      emails: ["saray@impactone.example", "kulde@impactone.example"],
    });
    assert.equal(report.clear, false);
    assert.equal(report.windowStart, "2026-10-30T14:00:00+03:00");
    const saray = report.people.find((person) => person.email === "saray@impactone.example");
    const kulde = report.people.find((person) => person.email === "kulde@impactone.example");
    assert.equal(saray?.busy.length, 1);
    assert.equal(kulde?.busy.length, 0);
  });

  it("records an invitation reply", async () => {
    const scheduled = store.meetings.find((meeting) => meeting.title === "Access review");
    assert.ok(scheduled);
    const meeting = await calendarService.updateInvitations(user("manager"), scheduled.id, {
      invitations: [{ email: "tetia@impactone.example", response: "declined", optional: false }],
    });
    assert.equal(meeting.invitations[0]?.response, "declined");
  });

  it("does not grant owner, and does not remove the owner", async () => {
    await assert.rejects(
      () => calendarService.share(user("manager"), "impact-team", { email: "new@impactone.example", role: "owner" }),
      (error: unknown) => error instanceof AppError && error.status === 400,
    );
    const shared = await calendarService.share(user("manager"), "impact-team", {
      email: "consultant@impactone.example",
      role: "freeBusyReader",
    });
    assert.equal(
      shared.shares.find((share) => share.email === "consultant@impactone.example")?.role,
      "freeBusyReader",
    );
    await assert.rejects(
      () => calendarService.unshare(user("manager"), "impact-team", { email: "mikolaj@impactone.example" }),
      (error: unknown) => error instanceof AppError && error.status === 403,
    );
  });

  it("lets a writer schedule and blocks them from changing sharing", async () => {
    await assert.rejects(
      () => calendarService.share(user("manager"), "ioc-project", { email: "tetia@impactone.example", role: "reader" }),
      (error: unknown) => error instanceof AppError && error.status === 403,
    );
    assert.ok(store.calendars.some((calendar) => calendar.id === "ioc-project" && calendar.accessRole === "writer"));
  });
});
