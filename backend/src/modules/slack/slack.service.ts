import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser, SlackDesk, SlackMessage } from "../../types/domain.js";
import { invalidateSlackCache, slackClient } from "./slack.client.js";
import { parseBody, postMessageSchema } from "./slack.schema.js";

const OPERATING_MODEL = {
  bestFit: "Channel updates · recent messages",
  implementationNote:
    "The bot reads and posts only in the configured channel. Delete and edit stay in Slack.",
  operatingModel:
    "Slack holds the channel thread. ClickUp keeps the task, Calendar keeps the meeting, and Drive keeps the file. Make and Instagram are not written from this screen.",
  steps: [
    {
      name: "Channel",
      detail: "One configured channel id. Invite the bot before reading or posting.",
    },
    {
      name: "Read",
      detail: "Executive and manager roles see recent messages from that channel.",
    },
    {
      name: "Post",
      detail: "Staff can send a short daily update as the Impact Dashboard bot.",
    },
    {
      name: "The rest of the desk",
      detail: "A Slack post does not create a ClickUp task, Calendar event, or Drive file.",
    },
  ],
};

function sampleMessages(): SlackMessage[] {
  return [
    {
      id: "slack-sample-1",
      channelId: "sample",
      channelName: "all-impact-testing",
      text: "Sample daily update: Calendar and Drive are live on the pilot desk. Slack token path still needs confirmation.",
      author: "Sample",
      postedAt: new Date().toISOString(),
      source: {
        origin: "sample",
        system: "Slack",
        detail: "Labelled sample until SLACK_BOT_TOKEN and SLACK_CHANNEL_ID are set.",
      },
      href: null,
    },
  ];
}

export class SlackService {
  async list(user: PublicUser) {
    if (!isStaff(user)) {
      return {
        items: [] as SlackMessage[],
        note: "Live Slack stays with executive and manager roles so channel traffic is not copied into other sessions.",
      };
    }
    if (!env.slackBotToken || !env.slackChannelId) {
      return {
        items: sampleMessages(),
        note: "Slack is not connected. Recent messages stay on labelled sample data.",
      };
    }
    // Use shared cache — do not force fresh on every desk poll (avoids hammering Slack).
    const live = await slackClient.get();
    if (live.ok && live.data) {
      return {
        items: live.data,
        note: "Live Slack messages for executive and manager roles.",
      };
    }
    return {
      items: sampleMessages(),
      note: live.configured ? `${live.message} Sample messages are shown instead.` : live.message,
    };
  }

  async desk(user: PublicUser): Promise<{ desk: SlackDesk; note: string }> {
    const listed = await this.list(user);
    const configured = Boolean(env.slackBotToken && env.slackChannelId);
    const connected = Boolean(
      isStaff(user) && configured && !listed.items.some((item) => item.source.origin === "sample"),
    );
    const channelName =
      listed.items.find((item) => item.source.origin === "live")?.channelName ??
      listed.items[0]?.channelName ??
      "all-impact-testing";
    return {
      note: listed.note,
      desk: {
        connected,
        canPost: isStaff(user) && configured,
        channelId: env.slackChannelId ?? null,
        channelName,
        bestFit: OPERATING_MODEL.bestFit,
        implementationNote: OPERATING_MODEL.implementationNote,
        operatingModel: OPERATING_MODEL.operatingModel,
        steps: OPERATING_MODEL.steps,
        messages: listed.items,
      },
    };
  }

  async post(user: PublicUser, body: unknown): Promise<SlackMessage> {
    if (!isStaff(user)) {
      throw new AppError(403, "Only executive and manager roles can post to Slack from this desk.");
    }
    if (!env.slackBotToken || !env.slackChannelId) {
      throw new AppError(503, "Slack bot token or channel id is not set.");
    }
    const input = parseBody(postMessageSchema, body);
    const message = await slackClient.postMessage(env.slackChannelId, input.text);
    invalidateSlackCache();
    return message;
  }
}

export const slackService = new SlackService();
