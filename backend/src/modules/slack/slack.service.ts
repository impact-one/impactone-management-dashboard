import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser, SlackDesk, SlackMessage } from "../../types/domain.js";
import { invalidateSlackCache, slackClient } from "./slack.client.js";
import { parseBody, postMessageSchema } from "./slack.schema.js";

const OPERATING_MODEL = {
  bestFit: "Channel updates",
  implementationNote: "Reads and posts stay in the configured channel.",
  operatingModel: "Slack holds channel updates for the operations team.",
  steps: [
    { name: "Channel", detail: "One configured channel. Invite the bot before reading or posting." },
    { name: "Read", detail: "Executive and manager roles see recent messages." },
    { name: "Post", detail: "Staff can send a short update as the Impact Dashboard bot." },
  ],
};

function sampleMessages(): SlackMessage[] {
  return [
    {
      id: "slack-sample-1",
      channelId: "sample",
      channelName: "all-impact-testing",
      text: "Daily update: Calendar and Drive are connected. Confirm Slack posting access for the operations channel.",
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
        note: "Live Slack is limited to executive and manager roles.",
      };
    }
    if (!env.slackBotToken || !env.slackChannelId) {
      return {
        items: sampleMessages(),
        note: "Slack is not connected. Showing reference channel activity.",
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
      note: live.configured ? `${live.message} Showing reference messages instead.` : live.message,
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
