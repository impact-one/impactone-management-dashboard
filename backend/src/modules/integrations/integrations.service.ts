import type { IntegrationStatus, Origin } from "../../types/domain.js";
import { calendarClient } from "../calendar/calendar.client.js";
import type { LiveResult } from "./clients/readOnlyClient.js";
import { clickUpClient } from "./clients/clickup.client.js";
import { driveClient } from "../documents/drive.client.js";
import { assistantClient } from "../assistant/assistant.client.js";
import { claudeClient } from "../claude/claude.client.js";
import { otterClient } from "../otter/otter.client.js";
import { slackClient } from "../slack/slack.client.js";

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

function calendarStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "calendar",
      name: "Google Calendar",
      mode: "schedule",
      configured: false,
      origin: "sample",
      detail: "Meetings, invitations, availability, and shared calendars run on the labelled workspace in Asia/Riyadh.",
      limitation: "A Google token with events, free/busy, and ACL scopes sends those changes to Calendar. Owner is never granted here.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "calendar",
      name: "Google Calendar",
      mode: "schedule",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "calendar",
    name: "Google Calendar",
    mode: "schedule",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Each event keeps its time zone. Sharing can be writer, reader, or free/busy.",
    lastCheckedAt: result.checkedAt,
  };
}

function driveStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "drive",
      name: "Google Drive",
      mode: "library",
      configured: false,
      origin: "sample",
      detail: "Folders, empty Docs and Sheets, and sharing run on the labelled library.",
      limitation: "A Google token with Drive scope sends those changes to Drive. Owner is never granted here. File contents stay in Drive.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "drive",
      name: "Google Drive",
      mode: "library",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "drive",
    name: "Google Drive",
    mode: "library",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Sharing can be writer, commenter, or reader. File contents stay in Drive.",
    lastCheckedAt: result.checkedAt,
  };
}

function otterStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "otter",
      name: "Otter.ai",
      mode: "meetings",
      configured: false,
      origin: "sample",
      detail: "Transcripts, summaries, and action items run on labelled sample notes.",
      limitation: "Set OTTER_API_KEY from an Enterprise workspace. Confirm consent and sharing before opening notes.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "otter",
      name: "Otter.ai",
      mode: "meetings",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "otter",
    name: "Otter.ai",
    mode: "meetings",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Read only. This desk does not change transcript sharing or send action items to ClickUp.",
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

function slackStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "slack",
      name: "Slack",
      mode: "channel",
      configured: false,
      origin: "sample",
      detail: "Recent channel messages and daily updates run on labelled sample data.",
      limitation: "Set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID, then invite the bot to the channel.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "slack",
      name: "Slack",
      mode: "channel",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "slack",
    name: "Slack",
    mode: "channel",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Posts as the bot. Edit and delete stay in Slack.",
    lastCheckedAt: result.checkedAt,
  };
}

function assistantStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "chatgpt",
      name: "ChatGPT",
      mode: "assistant",
      configured: false,
      origin: "sample",
      detail: "Drafts, research, analysis, brainstorming, and summaries stay off until an OpenAI API key is set.",
      limitation: "Add OPENAI_API_KEY and restart the API. Review outputs. Do not paste confidential information.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "chatgpt",
      name: "ChatGPT",
      mode: "assistant",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "chatgpt",
    name: "ChatGPT",
    mode: "assistant",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Review every output. The desk does not store the note or the reply, and it does not attach other systems.",
    lastCheckedAt: result.checkedAt,
  };
}

function claudeStatus(result: LiveResult<unknown>): IntegrationStatus {
  if (!result.configured) {
    return {
      id: "claude",
      name: "Claude",
      mode: "assistant",
      configured: false,
      origin: "sample",
      detail: "Long-form writing, document review, synthesis, and coding notes stay off until an Anthropic API key is set.",
      limitation: "Add ANTHROPIC_API_KEY and restart the API. Validate important facts. Do not paste confidential information.",
      lastCheckedAt: result.checkedAt,
    };
  }
  if (!result.ok) {
    return {
      id: "claude",
      name: "Claude",
      mode: "assistant",
      configured: true,
      origin: "needs-review",
      detail: result.message,
      limitation: result.message,
      lastCheckedAt: result.checkedAt,
    };
  }
  return {
    id: "claude",
    name: "Claude",
    mode: "assistant",
    configured: true,
    origin: "live",
    detail: result.message,
    limitation: "Validate important facts in every reply. The desk does not store the source or the reply.",
    lastCheckedAt: result.checkedAt,
  };
}

export class IntegrationsService {
  async list(): Promise<IntegrationStatus[]> {
    const [clickup, calendar, drive, slack, assistant, claude, otter] = await Promise.all([
      clickUpClient.get(),
      calendarClient.get(),
      driveClient.get(),
      slackClient.get(),
      assistantClient.status(),
      claudeClient.status(),
      otterClient.get(),
    ]);
    return [
      fromClient("clickup", "ClickUp", clickup),
      calendarStatus(calendar),
      driveStatus(drive),
      slackStatus(slack),
      assistantStatus(assistant),
      claudeStatus(claude),
      otterStatus(otter),
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
