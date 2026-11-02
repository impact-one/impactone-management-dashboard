import { store } from "../../data/store.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser } from "../../types/domain.js";
import { calendarClient } from "../integrations/clients/calendar.client.js";

export class CalendarService {
  async list(user: PublicUser) {
    let items = [...store.meetings];
    let note = "Google Calendar is not connected. These meetings are labelled samples or open questions from the brief.";

    if (!isStaff(user)) {
      return {
        items,
        note: "The live calendar is limited to executive and manager roles so private events are not copied into other sessions.",
      };
    }

    const live = await calendarClient.get();
    if (live.ok && live.data && live.data.length > 0) {
      items = [...live.data, ...items.filter((meeting) => meeting.source.system !== "Google Calendar")];
      note = "Live calendar events are listed for executive and manager roles. Attendees are not stored.";
    } else if (live.configured && !live.ok) {
      note = `${live.message} Sample meetings are shown instead.`;
    }
    return { items, note };
  }
}

export const calendarService = new CalendarService();
