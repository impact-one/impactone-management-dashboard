import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type {
  CalendarAccess,
  InvitationResponse,
  Meeting,
  MeetingInvitation,
  MeetingReminder,
  SharedCalendar,
} from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";

const API = "https://www.googleapis.com/calendar/v3";

export interface GoogleEventInput {
  calendarId: string;
  title: string;
  location: string;
  startIso: string;
  endIso: string;
  timeZone: string;
  invitations: MeetingInvitation[];
  reminders: MeetingReminder[];
}

let cache: { at: number; result: LiveResult<Meeting[]> } | null = null;

export function invalidateCalendarCache() {
  cache = null;
}

export const calendarClient = {
  async get(): Promise<LiveResult<Meeting[]>> {
    if (cache && Date.now() - cache.at < 60_000) return cache.result;
    const checkedAt = new Date().toISOString();
    if (!env.googleAccessToken) {
      const result: LiveResult<Meeting[]> = {
        ok: false,
        configured: false,
        checkedAt,
        message: "Google access token is not set. Scheduling stays on the labelled team workspace.",
        data: null,
      };
      cache = { at: Date.now(), result };
      return result;
    }
    try {
      const calendars = await listCalendars();
      const data = await listEvents(calendars);
      const result: LiveResult<Meeting[]> = {
        ok: true,
        configured: true,
        checkedAt,
        message: "Connected. Meetings, invitations, availability, and sharing can be sent to Google Calendar.",
        data,
      };
      cache = { at: Date.now(), result };
      return result;
    } catch (error) {
      const result: LiveResult<Meeting[]> = {
        ok: false,
        configured: true,
        checkedAt,
        message: error instanceof Error ? error.message : "Google Calendar could not be read.",
        data: null,
      };
      cache = { at: Date.now(), result };
      return result;
    }
  },

  listCalendars,
  listEvents,
  createEvent,
  updateInvitations,
  freeBusy,
  upsertShare,
  removeShare,
};

async function google(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = env.googleAccessToken;
  if (!token) throw new AppError(503, "Google access token is not set.");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? textField((payload as { error?: { message?: unknown } }).error?.message)
        : "";
    throw new AppError(502, message ? `Google Calendar: ${message}` : `Google Calendar returned ${response.status}.`);
  }
  return payload;
}

async function listCalendars(): Promise<SharedCalendar[]> {
  const payload = await google("/users/me/calendarList?maxResults=50");
  const items = arrayOf(record(payload).items);
  const calendars = await Promise.all(
    items.map(async (item) => {
      const row = record(item);
      const id = textField(row.id);
      const accessRole = asAccess(textField(row.accessRole));
      const shares = accessRole === "owner" ? await listShares(id) : [];
      return {
        id,
        name: textField(row.summary) || id,
        timeZone: textField(row.timeZone) || "UTC",
        accessRole,
        primary: row.primary === true,
        shares,
        source: {
          origin: "live" as const,
          system: "Google Calendar",
          detail:
            accessRole === "freeBusyReader"
              ? "Shared as free/busy only. Event titles are not copied."
              : `Shared as ${accessRole}. Time zone ${textField(row.timeZone) || "UTC"}.`,
        },
      };
    }),
  );
  return calendars.filter((calendar) => calendar.id);
}

async function listShares(calendarId: string) {
  try {
    const payload = await google(`/calendars/${encodeURIComponent(calendarId)}/acl`);
    return arrayOf(record(payload).items).flatMap((item) => {
      const row = record(item);
      const scope = record(row.scope);
      if (textField(scope.type) !== "user") return [];
      const email = textField(scope.value).toLowerCase();
      if (!email) return [];
      return [{ email, role: asAccess(textField(row.role)) }];
    });
  } catch {
    return [];
  }
}

async function listEvents(calendars: SharedCalendar[]): Promise<Meeting[]> {
  const readable = calendars.filter((calendar) => calendar.accessRole !== "freeBusyReader");
  const batches = await Promise.all(readable.map((calendar) => listCalendarEvents(calendar)));
  return batches
    .flat()
    .sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999"))
    .slice(0, 40);
}

async function listCalendarEvents(calendar: SharedCalendar): Promise<Meeting[]> {
  const params = new URLSearchParams({
    maxResults: "15",
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
  });
  const payload = await google(`/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`);
  return arrayOf(record(payload).items).map((item) => toMeeting(record(item), calendar));
}

async function createEvent(input: GoogleEventInput): Promise<Meeting> {
  const calendar = await requireCalendar(input.calendarId);
  if (calendar.accessRole !== "owner" && calendar.accessRole !== "writer") {
    throw new AppError(403, "This calendar is not shared with permission to add meetings.");
  }
  const sendUpdates = input.invitations.length > 0 ? "all" : "none";
  const payload = await google(
    `/calendars/${encodeURIComponent(input.calendarId)}/events?sendUpdates=${sendUpdates}`,
    { method: "POST", body: JSON.stringify(eventBody(input)) },
  );
  invalidateCalendarCache();
  return toMeeting(record(payload), calendar);
}

async function updateInvitations(meetingId: string, invitations: MeetingInvitation[]): Promise<Meeting> {
  const parsed = parseLiveId(meetingId);
  if (!parsed) throw new AppError(404, "That meeting is not on the connected Google calendar.");
  const calendar = await requireCalendar(parsed.calendarId);
  const sendUpdates = invitations.length > 0 ? "all" : "none";
  const payload = await google(
    `/calendars/${encodeURIComponent(parsed.calendarId)}/events/${encodeURIComponent(parsed.eventId)}?sendUpdates=${sendUpdates}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        attendees: invitations.map((person) => ({
          email: person.email,
          displayName: person.name || undefined,
          optional: person.optional,
          responseStatus: person.response,
        })),
      }),
    },
  );
  invalidateCalendarCache();
  return toMeeting(record(payload), calendar);
}

async function freeBusy(timeMin: string, timeMax: string, timeZone: string, emails: string[]) {
  const payload = await google("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone,
      items: emails.map((id) => ({ id })),
    }),
  });
  const calendars = record(record(payload).calendars);
  return emails.map((email) => {
    const row = record(calendars[email]);
    const errors = arrayOf(row.errors);
    const warning = errors.length > 0 ? "This calendar is not shared for free/busy." : null;
    const busy = arrayOf(row.busy).map((block) => {
      const item = record(block);
      return { start: textField(item.start), end: textField(item.end), title: null };
    });
    return { email, busy, warning };
  });
}

async function upsertShare(calendarId: string, email: string, role: "writer" | "reader" | "freeBusyReader") {
  const calendar = await requireCalendar(calendarId);
  if (calendar.accessRole !== "owner") {
    throw new AppError(403, "Only an owner can change sharing.");
  }
  const payload = await google(`/calendars/${encodeURIComponent(calendarId)}/acl`);
  const rules = arrayOf(record(payload).items).map((item) => record(item));
  const existing = rules.find((rule) => {
    const scope = record(rule.scope);
    return textField(scope.type) === "user" && textField(scope.value).toLowerCase() === email;
  });
  if (existing && asAccess(textField(existing.role)) === "owner") {
    throw new AppError(403, "The owner share stays on the calendar.");
  }
  if (existing && textField(existing.id)) {
    await google(`/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(textField(existing.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  } else {
    await google(`/calendars/${encodeURIComponent(calendarId)}/acl?sendNotifications=true`, {
      method: "POST",
      body: JSON.stringify({ role, scope: { type: "user", value: email } }),
    });
  }
  invalidateCalendarCache();
}

async function removeShare(calendarId: string, email: string) {
  const calendar = await requireCalendar(calendarId);
  if (calendar.accessRole !== "owner") throw new AppError(403, "Only an owner can change sharing.");
  const payload = await google(`/calendars/${encodeURIComponent(calendarId)}/acl`);
  const existing = arrayOf(record(payload).items)
    .map((item) => record(item))
    .find((rule) => {
      const scope = record(rule.scope);
      return textField(scope.type) === "user" && textField(scope.value).toLowerCase() === email;
    });
  if (!existing) throw new AppError(404, "That person is not on the sharing list.");
  if (asAccess(textField(existing.role)) === "owner") {
    throw new AppError(403, "The owner share stays on the calendar.");
  }
  await google(`/calendars/${encodeURIComponent(calendarId)}/acl/${encodeURIComponent(textField(existing.id))}`, {
    method: "DELETE",
  });
  invalidateCalendarCache();
}

async function requireCalendar(calendarId: string): Promise<SharedCalendar> {
  const calendars = await listCalendars();
  const calendar = calendars.find((item) => item.id === calendarId);
  if (!calendar) throw new AppError(404, "That calendar is not shared with this Google account.");
  return calendar;
}

function eventBody(input: GoogleEventInput) {
  return {
    summary: input.title,
    location: input.location || undefined,
    start: { dateTime: input.startIso, timeZone: input.timeZone },
    end: { dateTime: input.endIso, timeZone: input.timeZone },
    attendees: input.invitations.map((person) => ({
      email: person.email,
      displayName: person.name || undefined,
      optional: person.optional,
      responseStatus: person.response,
    })),
    reminders: {
      useDefault: false,
      overrides: input.reminders.map((reminder) => ({ method: reminder.method, minutes: reminder.minutesBefore })),
    },
  };
}

function toMeeting(event: Record<string, unknown>, calendar: SharedCalendar): Meeting {
  const start = record(event.start);
  const end = record(event.end);
  const dateTime = textField(start.dateTime);
  const endDateTime = textField(end.dateTime);
  const allDay = textField(start.date);
  const zone = textField(start.timeZone) || calendar.timeZone;
  const zonedDate = dateTime ? dateInZone(dateTime, zone) : allDay;
  const eventId = textField(event.id);
  const invitations = arrayOf(event.attendees).map((item) => {
    const person = record(item);
    return {
      email: textField(person.email).toLowerCase(),
      name: textField(person.displayName),
      response: asResponse(textField(person.responseStatus)),
      optional: person.optional === true,
    };
  }).filter((person) => person.email);
  const reminderRecord = record(event.reminders);
  const overrides = arrayOf(reminderRecord.overrides);
  const reminders: MeetingReminder[] = overrides.map((item) => {
    const reminder = record(item);
    const method = textField(reminder.method) === "email" ? "email" : "popup";
    return { method, minutesBefore: Number(reminder.minutes) || 0 };
  });
  const organizer = record(event.organizer);
  return {
    id: liveMeetingId(calendar.id, eventId),
    title: textField(event.summary) || "Untitled event",
    date: zonedDate || null,
    timeLabel: dateTime ? `${clockInZone(dateTime, zone)}–${clockInZone(endDateTime, zone)}` : "All day",
    owner: textField(organizer.displayName) || textField(organizer.email) || "Google Calendar",
    ownerEmail: textField(organizer.email).toLowerCase(),
    source: {
      origin: "live",
      system: "Google Calendar",
      detail: `Live event in ${zone}. Invitations stay on the event.`,
    },
    href: textField(event.htmlLink) || null,
    calendarId: calendar.id,
    calendarName: calendar.name,
    timeZone: zone,
    startsAt: dateTime || allDay || null,
    endsAt: endDateTime || textField(end.date) || null,
    location: textField(event.location),
    invitations,
    reminders,
  };
}

export function liveMeetingId(calendarId: string, eventId: string) {
  return `gcal:${encodeURIComponent(calendarId)}:${encodeURIComponent(eventId)}`;
}

export function parseLiveId(id: string): { calendarId: string; eventId: string } | null {
  if (!id.startsWith("gcal:")) return null;
  const rest = id.slice(5);
  const split = rest.indexOf(":");
  if (split <= 0) return null;
  return {
    calendarId: decodeURIComponent(rest.slice(0, split)),
    eventId: decodeURIComponent(rest.slice(split + 1)),
  };
}

function clockInZone(iso: string, timeZone: string) {
  const instant = new Date(iso);
  if (!iso || Number.isNaN(instant.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

function dateInZone(iso: string, timeZone: string) {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

function asAccess(value: string): CalendarAccess {
  if (value === "owner" || value === "writer" || value === "reader" || value === "freeBusyReader") return value;
  return "reader";
}

function asResponse(value: string): InvitationResponse {
  if (value === "accepted" || value === "declined" || value === "tentative" || value === "needsAction") return value;
  return "needsAction";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textField(value: unknown): string {
  return typeof value === "string" ? value : "";
}
