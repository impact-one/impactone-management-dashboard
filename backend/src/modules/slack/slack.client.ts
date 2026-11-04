import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type { SlackMessage } from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";
import {
  mapChannelMessages,
  safeFilename,
  slackFileUrl,
  sniffImageType,
  type SlackFilePreview,
} from "./slack.files.js";

const API = "https://slack.com/api";

export interface SlackChannelInfo {
  id: string;
  name: string;
}

let listCache: { at: number; result: LiveResult<SlackMessage[]> } | null = null;
let channelCache: { at: number; info: SlackChannelInfo } | null = null;
let userNameCache = new Map<string, string>();
let usersReadMissing = false;
let inFlightList: Promise<LiveResult<SlackMessage[]>> | null = null;

const LIST_CACHE_MS = 10_000;
const CHANNEL_CACHE_MS = 5 * 60_000;
const HISTORY_PAGE_SIZE = 100;
const HISTORY_PAGES = 3;
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const PREVIEW_CACHE_MAX = 400;

const previews = new Map<string, SlackFilePreview>();

export function invalidateSlackCache() {
  listCache = null;
  inFlightList = null;
}

export const slackClient = {
  async get(options: { fresh?: boolean } = {}): Promise<LiveResult<SlackMessage[]>> {
    if (!options.fresh && listCache && Date.now() - listCache.at < LIST_CACHE_MS) {
      return listCache.result;
    }
    if (inFlightList) return inFlightList;

    inFlightList = loadList()
      .then((result) => {
        listCache = { at: Date.now(), result };
        return result;
      })
      .finally(() => {
        inFlightList = null;
      });

    return inFlightList;
  },

  authTest,
  channelInfo,
  listMessages,
  postMessage,
  readFilePreview,
};

async function loadList(): Promise<LiveResult<SlackMessage[]>> {
  const checkedAt = new Date().toISOString();
  if (!env.slackBotToken || !env.slackChannelId) {
    return {
      ok: false,
      configured: false,
      checkedAt,
      message: "Slack bot token or channel id is not set. The channel stays on labelled sample data.",
      data: null,
    };
  }
  try {
    const channel = await channelInfo(env.slackChannelId);
    const data = await listMessages(channel);
    return {
      ok: true,
      configured: true,
      checkedAt,
      message: `Connected to #${channel.name}. Recent messages can be read; staff can post an update.`,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      checkedAt,
      message: error instanceof Error ? error.message : "Slack could not be read.",
      data: null,
    };
  }
}

async function authTest(): Promise<{ team: string; user: string }> {
  const payload = await slack("auth.test");
  return {
    team: text(payload.team, "Slack"),
    user: text(payload.user, "bot"),
  };
}

async function channelInfo(channelId: string): Promise<SlackChannelInfo> {
  if (channelCache && channelCache.info.id === channelId && Date.now() - channelCache.at < CHANNEL_CACHE_MS) {
    return channelCache.info;
  }
  const payload = await slack("conversations.info", { channel: channelId });
  const channel = asRecord(payload.channel);
  const info = {
    id: text(channel.id, channelId),
    name: text(channel.name, "channel"),
  };
  channelCache = { at: Date.now(), info };
  return info;
}

async function listMessages(channel: SlackChannelInfo): Promise<SlackMessage[]> {
  const messages: unknown[] = [];
  let cursor = "";
  for (let page = 0; page < HISTORY_PAGES; page += 1) {
    const payload = await slack("conversations.history", {
      channel: channel.id,
      limit: String(HISTORY_PAGE_SIZE),
      cursor: cursor || undefined,
    });
    const batch = Array.isArray(payload.messages) ? payload.messages : [];
    messages.push(...batch);
    cursor = text(asRecord(payload.response_metadata).next_cursor);
    if (!cursor || batch.length === 0) break;
  }

  const userIds = [
    ...new Set(
      messages
        .map((item) => text(asRecord(item).user))
        .filter(Boolean),
    ),
  ];
  await resolveUserNames(userIds);

  const mapped = mapChannelMessages(messages, channel, userNameCache);
  rememberPreviews(mapped.flatMap((item) => item.previews));
  // Slack returns newest first; keep that order for the desk.
  return mapped.map((item) => item.message);
}

async function readFilePreview(fileId: string): Promise<{ body: Buffer; contentType: string; filename: string }> {
  if (!/^F[A-Z0-9]{6,}$/.test(fileId)) throw new AppError(400, "That file id is not valid.");
  let cached = previews.get(fileId);
  if (!cached) {
    await slackClient.get();
    cached = previews.get(fileId);
  }
  if (!cached) throw new AppError(404, "That file is not in the recent channel history.");

  const response = await fetchSlackAsset(cached.url);
  if (!response.ok) throw new AppError(502, "Slack could not load that file preview.");
  const bytes = await readLimited(response, MAX_PREVIEW_BYTES);
  const contentType = sniffImageType(bytes);
  if (!contentType) throw new AppError(415, "That file does not have an image preview.");
  return { body: Buffer.from(bytes), contentType, filename: safeFilename(cached.name) };
}

function rememberPreviews(items: SlackFilePreview[]) {
  for (const item of items) {
    if (!slackFileUrl(item.url)) continue;
    previews.delete(item.id);
    previews.set(item.id, item);
  }
  while (previews.size > PREVIEW_CACHE_MAX) {
    const oldest = previews.keys().next().value;
    if (!oldest) break;
    previews.delete(oldest);
  }
}

async function fetchSlackAsset(start: string): Promise<Response> {
  const token = env.slackBotToken;
  if (!token) throw new AppError(503, "Slack bot token is not set.");
  let current = slackFileUrl(start);
  if (!current) throw new AppError(502, "Slack file preview URL was rejected.");

  for (let hop = 0; hop < 3; hop += 1) {
    const response = await fetch(current, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new AppError(502, "Slack file preview could not be loaded.");
      const next = slackFileUrl(new URL(location, current).toString());
      if (!next) throw new AppError(502, "Slack file preview URL was rejected.");
      current = next;
      continue;
    }
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_PREVIEW_BYTES) {
      throw new AppError(413, "That file is too large to preview.");
    }
    return response;
  }
  throw new AppError(502, "Slack file preview could not be loaded.");
}

async function readLimited(response: Response, max: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new AppError(413, "That file is too large to preview.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function postMessage(channelId: string, textBody: string): Promise<SlackMessage> {
  const payload = await slack("chat.postMessage", {
    channel: channelId,
    text: textBody,
    unfurl_links: "false",
    unfurl_media: "false",
  });
  invalidateSlackCache();
  const channel = await channelInfo(channelId);
  const message = asRecord(payload.message);
  const ts = text(message.ts, String(Date.now() / 1000));
  return toMessage(channel, message, text(message.text, textBody), ts, "Impact Dashboard");
}

function toMessage(
  channel: SlackChannelInfo,
  row: Record<string, unknown>,
  body: string,
  ts: string,
  forcedAuthor?: string,
): SlackMessage {
  const userId = text(row.user);
  const botProfile = asRecord(row.bot_profile);
  const author =
    forcedAuthor ||
    text(botProfile.name) ||
    text(row.username) ||
    userNameCache.get(userId) ||
    (text(row.bot_id) ? "Impact Dashboard" : userId || "Unknown");
  const seconds = Number(ts);
  return {
    id: `slack-${ts}`,
    channelId: channel.id,
    channelName: channel.name,
    text: body,
    author,
    postedAt: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString(),
    source: {
      origin: "live",
      system: "Slack",
      detail: forcedAuthor
        ? "Posted from this desk. ClickUp, Drive, and Calendar are unchanged."
        : "Read from the configured channel. Visible to executive and manager roles.",
    },
    href: null,
    files: [],
  };
}

async function resolveUserNames(ids: string[]): Promise<void> {
  if (usersReadMissing || ids.length === 0) return;
  const missing = ids.filter((id) => !userNameCache.has(id));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (id) => {
      if (usersReadMissing) {
        userNameCache.set(id, id);
        return;
      }
      try {
        const payload = await slack("users.info", { user: id });
        const user = asRecord(payload.user);
        const profile = asRecord(user.profile);
        userNameCache.set(id, text(profile.display_name) || text(user.real_name) || text(user.name, id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("missing_scope")) usersReadMissing = true;
        userNameCache.set(id, id);
      }
    }),
  );
}

async function slack(method: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = env.slackBotToken;
  if (!token) throw new AppError(503, "Slack bot token is not set.");

  const form = new URLSearchParams();
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      form.set(key, String(value));
    }
  }

  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
    signal: AbortSignal.timeout(8000),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new AppError(502, `Slack returned ${response.status}.`);
  }
  if (payload.ok !== true) {
    const error = text(payload.error, "unknown_error");
    throw new AppError(502, `Slack: ${error}. Invite the bot to the channel if needed.`);
  }
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
