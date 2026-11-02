import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type {
  AvailabilityReport,
  CalendarDesk,
  Meeting,
  MeetingInvitation,
  MeetingReminder,
  PublicUser,
  SharedCalendar,
} from "../../types/domain.js";
import { calendarClient, parseLiveId } from "./calendar.client.js";
import {
  availabilitySchema,
  invitationsSchema,
  parseBody,
  removeShareSchema,
  scheduleSchema,
  shareSchema,
} from "./calendar.schema.js";
import { TEAM_TIME_ZONE, zonedDateTime } from "./calendar.time.js";

const DEFAULT_REMINDERS: MeetingReminder[] = [
  { method: "email", minutesBefore: 1440 },
  { method: "popup", minutesBefore: 30 },
];

const OPERATING_MODEL = {
  bestFit: "Meeting scheduling · reminders",
  implementationNote:
    "Every meeting and calendar keeps an IANA time zone. Sharing is writer, reader, or free/busy. This desk does not grant owner.",
  operatingModel:
    "Google Calendar books the meeting. ClickUp keeps the task, Drive keeps the file, and Otter keeps the transcript. Slack, Make, and Instagram are not written from this screen.",
  steps: [
    {
      name: "Shared calendars",
      detail: "Impact team and IOC project each have one time zone and an access list. Free/busy readers see availability, not titles.",
    },
    {
      name: "Availability",
      detail: "Before a required guest is invited, the desk checks free/busy in the meeting time zone.",
    },
    {
      name: "Schedule",
      detail: "Executive and manager roles place the meeting on a calendar they can write. Start and end stay in the chosen time zone.",
    },
    {
      name: "Invitations",
      detail: "Guests are stored on the event. When Google is connected, Calendar sends the invite and later updates.",
    },
    {
      name: "Reminders",
      detail: "The default is an email one day before and a popup 30 minutes before.",
    },
    {
      name: "The rest of the desk",
      detail: "A meeting does not create a ClickUp task, upload a Drive file, or post to Slack. Those systems stay where they are.",
    },
  ],
};

export class CalendarService {
  async list(user: PublicUser) {
    const local = this.localMeetings();
    if (!isStaff(user)) {
      return {
        items: local,
        note: "Live calendars stay with executive and manager roles so private events are not copied into other sessions.",
      };
    }
    if (!env.googleAccessToken) {
      return {
        items: local,
        note: "Google Calendar is not connected. Scheduling, invitations, and sharing run on the labelled team workspace in Asia/Riyadh.",
      };
    }
    const live = await calendarClient.get();
    if (live.ok && live.data) {
      const kept = local.filter((meeting) => meeting.source.system !== "Google Calendar");
      return {
        items: [...live.data, ...kept],
        note: "Live Google Calendar events for executive and manager roles. Invitations stay on the event.",
      };
    }
    return {
      items: local,
      note: live.configured ? `${live.message} The labelled workspace is shown instead.` : live.message,
    };
  }

  async desk(user: PublicUser): Promise<{ desk: CalendarDesk; note: string }> {
    const listed = await this.list(user);
    let calendars = this.visibleCalendars(user);
    let connected = false;
    let note = listed.note;
    if (isStaff(user) && env.googleAccessToken) {
      try {
        const liveCalendars = await calendarClient.listCalendars();
        calendars = liveCalendars;
        connected = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Google Calendar sharing could not be read.";
        note = `${message} Shared calendars from the labelled workspace are shown instead.`;
      }
    }
    return {
      note,
      desk: {
        connected,
        timeZone: TEAM_TIME_ZONE,
        canSchedule: isStaff(user),
        bestFit: OPERATING_MODEL.bestFit,
        implementationNote: OPERATING_MODEL.implementationNote,
        operatingModel: OPERATING_MODEL.operatingModel,
        steps: OPERATING_MODEL.steps,
        calendars,
        meetings: listed.items,
      },
    };
  }

  async schedule(user: PublicUser, body: unknown): Promise<Meeting> {
    this.assertStaff(user);
    const input = parseBody(scheduleSchema, body);
    const start = zonedDateTime(input.date, input.startTime, input.timeZone);
    const end = zonedDateTime(input.date, input.endTime, input.timeZone);
    if (end.instant.getTime() <= start.instant.getTime()) {
      throw new AppError(400, "End time has to be later than the start, in the meeting time zone.");
    }
    const invitations = this.normalizeInvitations(
      (input.invitations ?? []).map((person) => ({
        email: person.email,
        name: person.name ?? "",
        optional: person.optional ?? false,
        response: "needsAction" as const,
      })),
      user.email,
    );
    const reminders = (input.reminders ?? []).length > 0 ? (input.reminders ?? []) : DEFAULT_REMINDERS;
    const location = input.location ?? "";

    if (env.googleAccessToken) {
      await this.assertLiveFree(user.email, invitations, start.instant, end.instant, start.timeZone);
      return calendarClient.createEvent({
        calendarId: input.calendarId,
        title: input.title,
        location,
        startIso: start.iso,
        endIso: end.iso,
        timeZone: start.timeZone,
        invitations,
        reminders,
      });
    }

    this.assertNoConflict(user.email, invitations, start.instant, end.instant, null);
    const calendar = this.writableCalendar(input.calendarId);
    const meeting: Meeting = {
      id: `meet-${randomUUID()}`,
      title: input.title,
      date: input.date,
      timeLabel: `${input.startTime}–${input.endTime}`,
      owner: user.name,
      ownerEmail: user.email.toLowerCase(),
      source: {
        origin: "sample",
        system: "Google Calendar",
        detail: `Scheduled on the labelled workspace in ${start.timeZone}. A Google token sends this invite to Calendar.`,
      },
      href: null,
      calendarId: calendar.id,
      calendarName: calendar.name,
      timeZone: start.timeZone,
      startsAt: start.iso,
      endsAt: end.iso,
      location,
      invitations,
      reminders,
    };
    store.meetings.push(meeting);
    return meeting;
  }

  async updateInvitations(user: PublicUser, meetingId: string, body: unknown): Promise<Meeting> {
    this.assertStaff(user);
    const input = parseBody(invitationsSchema, body);
    const invitations = this.normalizeInvitations(
      input.invitations.map((person) => ({
        email: person.email,
        name: person.name ?? "",
        optional: person.optional ?? false,
        response: person.response ?? "needsAction",
      })),
      user.email,
    );
    if (env.googleAccessToken && parseLiveId(meetingId)) {
      return calendarClient.updateInvitations(meetingId, invitations);
    }
    const meeting = store.meetings.find((item) => item.id === meetingId);
    if (!meeting) throw new AppError(404, "That meeting is not on this workspace.");
    if (meeting.startsAt && meeting.endsAt) {
      this.assertNoConflict(meeting.ownerEmail, invitations, new Date(meeting.startsAt), new Date(meeting.endsAt), meeting.id);
    }
    meeting.invitations = invitations;
    return meeting;
  }

  async availability(user: PublicUser, body: unknown): Promise<AvailabilityReport> {
    this.assertStaff(user);
    const input = parseBody(availabilitySchema, body);
    const start = zonedDateTime(input.date, input.startTime, input.timeZone);
    const end = zonedDateTime(input.date, input.endTime, input.timeZone);
    if (end.instant.getTime() <= start.instant.getTime()) {
      throw new AppError(400, "End time has to be later than the start, in the meeting time zone.");
    }
    const emails = [...new Set(input.emails.map((value) => value.toLowerCase()))];
    if (env.googleAccessToken) {
      const people = await calendarClient.freeBusy(start.instant.toISOString(), end.instant.toISOString(), start.timeZone, emails);
      return {
        timeZone: start.timeZone,
        windowStart: start.iso,
        windowEnd: end.iso,
        clear: people.every((person) => person.busy.length === 0 && !person.warning),
        people,
      };
    }
    const people = emails.map((email) => ({
      email,
      warning: null,
      busy: this.localMeetings()
        .filter((meeting) => this.overlaps(meeting, start.instant, end.instant) && this.personIsBusy(meeting, email))
        .map((meeting) => ({
          start: meeting.startsAt ?? "",
          end: meeting.endsAt ?? "",
          title: meeting.title,
        })),
    }));
    return {
      timeZone: start.timeZone,
      windowStart: start.iso,
      windowEnd: end.iso,
      clear: people.every((person) => person.busy.length === 0),
      people,
    };
  }

  async share(user: PublicUser, calendarId: string, body: unknown): Promise<SharedCalendar> {
    this.assertStaff(user);
    const input = parseBody(shareSchema, body);
    const email = input.email.toLowerCase();
    if (env.googleAccessToken) {
      await calendarClient.upsertShare(calendarId, email, input.role);
      const calendars = await calendarClient.listCalendars();
      const calendar = calendars.find((item) => item.id === calendarId);
      if (!calendar) throw new AppError(404, "That calendar is not shared with this Google account.");
      return calendar;
    }
    const calendar = this.ownedCalendar(calendarId);
    const existing = calendar.shares.find((share) => share.email === email);
    if (existing?.role === "owner") throw new AppError(403, "The owner share stays on the calendar.");
    if (existing) existing.role = input.role;
    else calendar.shares.push({ email, role: input.role });
    return calendar;
  }

  async unshare(user: PublicUser, calendarId: string, body: unknown): Promise<SharedCalendar> {
    this.assertStaff(user);
    const input = parseBody(removeShareSchema, body);
    const email = input.email.toLowerCase();
    if (env.googleAccessToken) {
      await calendarClient.removeShare(calendarId, email);
      const calendars = await calendarClient.listCalendars();
      const calendar = calendars.find((item) => item.id === calendarId);
      if (!calendar) throw new AppError(404, "That calendar is not shared with this Google account.");
      return calendar;
    }
    const calendar = this.ownedCalendar(calendarId);
    const existing = calendar.shares.find((share) => share.email === email);
    if (!existing) throw new AppError(404, "That person is not on the sharing list.");
    if (existing.role === "owner") throw new AppError(403, "The owner share stays on the calendar.");
    calendar.shares = calendar.shares.filter((share) => share.email !== email);
    return calendar;
  }

  private localMeetings(): Meeting[] {
    return [...store.meetings].sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999"));
  }

  private visibleCalendars(user: PublicUser): SharedCalendar[] {
    return store.calendars.map((calendar) => ({
      ...calendar,
      shares: isStaff(user) ? calendar.shares.map((share) => ({ ...share })) : [],
    }));
  }

  private assertStaff(user: PublicUser) {
    if (!isStaff(user)) throw new AppError(403, "Scheduling, invitations, and sharing are limited to executive and manager roles.");
  }

  private writableCalendar(calendarId: string): SharedCalendar {
    const calendar = store.calendars.find((item) => item.id === calendarId);
    if (!calendar) throw new AppError(404, "Choose a shared calendar from the list.");
    if (calendar.accessRole !== "owner" && calendar.accessRole !== "writer") {
      throw new AppError(403, "Scheduling needs a calendar shared as writer or owner.");
    }
    return calendar;
  }

  private ownedCalendar(calendarId: string): SharedCalendar {
    const calendar = store.calendars.find((item) => item.id === calendarId);
    if (!calendar) throw new AppError(404, "That calendar is not on this workspace.");
    if (calendar.accessRole !== "owner") {
      throw new AppError(403, "Only an owner can change sharing. A writer can still schedule.");
    }
    return calendar;
  }

  private normalizeInvitations(invitations: MeetingInvitation[], organizerEmail: string): MeetingInvitation[] {
    const seen = new Set<string>();
    return invitations.map((person) => {
      const email = person.email.toLowerCase();
      if (email === organizerEmail.toLowerCase()) {
        throw new AppError(400, "The organizer is already on the meeting. Invite the other people.");
      }
      if (seen.has(email)) throw new AppError(400, "Each invited email can appear once.");
      seen.add(email);
      const known = store.users.find((user) => user.email.toLowerCase() === email);
      return {
        email,
        name: person.name.trim() || known?.name || "",
        response: person.response,
        optional: person.optional,
      };
    });
  }

  private async assertLiveFree(
    organizerEmail: string,
    invitations: MeetingInvitation[],
    start: Date,
    end: Date,
    timeZone: string,
  ) {
    const emails = [
      organizerEmail.toLowerCase(),
      ...invitations.filter((person) => !person.optional).map((person) => person.email),
    ];
    const people = await calendarClient.freeBusy(start.toISOString(), end.toISOString(), timeZone, emails);
    const blocked = people.find((person) => person.busy.length > 0);
    if (blocked) {
      throw new AppError(409, `${blocked.email} is already booked in this window (${timeZone}).`);
    }
    const unseen = people.find((person) => person.email !== organizerEmail.toLowerCase() && person.warning);
    if (unseen) {
      throw new AppError(409, `${unseen.email} is not shared for free/busy. Set that sharing before sending the invite.`);
    }
  }

  private assertNoConflict(
    organizerEmail: string,
    invitations: MeetingInvitation[],
    start: Date,
    end: Date,
    ignoreId: string | null,
  ) {
    const required = [organizerEmail.toLowerCase(), ...invitations.filter((person) => !person.optional).map((person) => person.email)];
    for (const email of required) {
      const clash = this.localMeetings().find(
        (meeting) => meeting.id !== ignoreId && this.overlapsWindow(meeting, start, end) && this.personIsBusy(meeting, email),
      );
      if (clash) {
        throw new AppError(
          409,
          `${email} is already booked ${clash.timeLabel} (${clash.timeZone}) for “${clash.title}”.`,
        );
      }
    }
  }

  private overlaps(meeting: Meeting, start: Date, end: Date) {
    return this.overlapsWindow(meeting, start, end);
  }

  private overlapsWindow(meeting: Meeting, start: Date, end: Date) {
    if (!meeting.startsAt || !meeting.endsAt) return false;
    const meetingStart = new Date(meeting.startsAt).getTime();
    const meetingEnd = new Date(meeting.endsAt).getTime();
    if (Number.isNaN(meetingStart) || Number.isNaN(meetingEnd)) return false;
    return meetingStart < end.getTime() && start.getTime() < meetingEnd;
  }

  private personIsBusy(meeting: Meeting, email: string) {
    const target = email.toLowerCase();
    if (meeting.ownerEmail.toLowerCase() === target) return true;
    const invitation = meeting.invitations.find((person) => person.email === target);
    return Boolean(invitation && invitation.response !== "declined");
  }
}

export const calendarService = new CalendarService();
