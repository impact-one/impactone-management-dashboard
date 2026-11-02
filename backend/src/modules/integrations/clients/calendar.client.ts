import { env } from "../../../config/env.js";
import type { Meeting } from "../../../types/domain.js";
import { readJson, ReadOnlyClient } from "./readOnlyClient.js";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const calendarClient = new ReadOnlyClient<Meeting[]>({
  isConfigured: () => Boolean(env.googleAccessToken),
  missingMessage: "Google access token is not set. Meetings stay on labelled sample data.",
  load: async () => {
    const params = new URLSearchParams({
      maxResults: "10",
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
    });
    const calendarId = encodeURIComponent(env.googleCalendarId);
    const payload = await readJson(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
      { Authorization: `Bearer ${env.googleAccessToken ?? ""}` },
    );
    const record = payload && typeof payload === "object" ? (payload as { items?: unknown }) : {};
    const items = Array.isArray(record.items) ? record.items : [];
    return items.slice(0, 10).map((item, index) => {
      const event = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const start = event.start && typeof event.start === "object" ? (event.start as { date?: unknown; dateTime?: unknown }) : {};
      const dateTime = text(start.dateTime);
      const date = text(start.date) || (dateTime ? dateTime.slice(0, 10) : "");
      const href = text(event.htmlLink);
      return {
        id: `gcal-${text(event.id) || String(index)}`,
        title: text(event.summary) || "Untitled event",
        date: date || null,
        timeLabel: dateTime ? dateTime.slice(11, 16) : "All day",
        owner: "Google Calendar",
        source: {
          origin: "live" as const,
          system: "Google Calendar",
          detail: "Read-only event list. Attendees are not copied into this dashboard.",
        },
        href: href || null,
      };
    });
  },
});
