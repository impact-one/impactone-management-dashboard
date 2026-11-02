import type { IntegrationStatus, Origin } from "../../types/domain.js";
import { calendarClient } from "./clients/calendar.client.js";
import { clickUpClient } from "./clients/clickup.client.js";
import { driveClient } from "./clients/drive.client.js";
import type { LiveResult } from "./clients/readOnlyClient.js";

function fromClient(id: string, name: string, result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id,
      name,
      mode: "read-only",
      configured: false,
      origin: "sample",
      detail: result.message,
      limitation: "Not configured. Sample data is used.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id,
      name,
      mode: "read-only",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id,
    name,
    mode: "read-only",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: null,
    lastCheckedAt: result.checkedAt,
  };
}

function absent(id: string, name: string, detail: string, limitation: string, origin: Origin = "documented"): IntegrationStatus {
  return {
    id,
    name,
    mode: "not-connected",
    configured: false,
    origin,
    detail,
    limitation,
    lastCheckedAt: null,
  };
}

export class IntegrationsService {
  async list(): Promise<IntegrationStatus[]> {
    const [clickup, calendar, drive] = await Promise.all([clickUpClient.get(), calendarClient.get(), driveClient.get()]);
    return [
      fromClient("clickup", "ClickUp", clickup),
      fromClient("calendar", "Google Calendar", calendar),
      fromClient("drive", "Google Drive", drive),
      absent(
        "slack",
        "Slack",
        "No Slack client is included, so this API cannot post, edit, or delete messages.",
        "Intake channel name was not provided.",
      ),
      absent(
        "sheets",
        "IOC budget Google Sheet",
        "No Sheets client. The budget screen uses fictional figures.",
        "Finance approval is required before a live read.",
        "sample",
      ),
      absent("make", "Make", "No Make client. Scenarios cannot be changed from this app.", "Scenario id was not provided."),
      absent("instagram", "Instagram", "No Instagram client. This app cannot send messages.", "Used only as a documented intake step."),
      absent(
        "html-dashboard",
        "HTML master dashboard",
        "Not embedded. The URL was not provided.",
        "URL needs review.",
        "needs-review",
      ),
    ];
  }
}

export const integrationsService = new IntegrationsService();
