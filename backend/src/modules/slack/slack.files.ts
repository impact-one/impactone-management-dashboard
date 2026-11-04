import type { SlackFile, SlackMessage } from "../../types/domain.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const IMAGE_FILETYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

const SKIP_SUBTYPES = new Set([
  "channel_join",
  "channel_leave",
  "channel_purpose",
  "channel_topic",
  "channel_name",
  "message_deleted",
  "tombstone",
]);

export interface SlackFilePreview {
  id: string;
  name: string;
  url: string;
}

export interface MappedSlackMessage {
  message: SlackMessage;
  previews: SlackFilePreview[];
}

export function mapChannelMessages(
  rows: unknown[],
  channel: { id: string; name: string },
  names: ReadonlyMap<string, string>,
): MappedSlackMessage[] {
  const mapped: MappedSlackMessage[] = [];
  for (const [index, item] of rows.entries()) {
    const result = mapRow(asRecord(item), channel, names, index);
    if (result) mapped.push(result);
  }
  return mapped;
}

/** Accept only Slack-hosted file bytes. Permalink pages and other hosts stay out. */
export function slackFileUrl(value: string): string | null {
  return slackHttpsUrl(value, (host) => host === "files.slack.com" || host.endsWith(".slack-edge.com"));
}

export function slackPermalink(value: string): string | null {
  return slackHttpsUrl(
    value,
    (host) => host !== "files.slack.com" && (host === "slack.com" || host.endsWith(".slack.com")),
  );
}

export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function safeFilename(name: string): string {
  const base = name.replace(/[/\\"]/g, "").replace(/[\r\n]/g, "").slice(0, 120).trim();
  return base || "file";
}

function mapRow(
  row: Record<string, unknown>,
  channel: { id: string; name: string },
  names: ReadonlyMap<string, string>,
  index: number,
): MappedSlackMessage | null {
  const subtype = text(row.subtype);
  if (SKIP_SUBTYPES.has(subtype)) return null;
  const files = filesFrom(row);
  const body = text(row.text);
  if (!body && files.publicFiles.length === 0) return null;
  const ts = text(row.ts, String(index));
  const seconds = Number(ts);
  return {
    message: {
      id: `slack-${ts}`,
      channelId: channel.id,
      channelName: channel.name,
      text: body,
      author: authorFrom(row, names),
      postedAt: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString(),
      source: {
        origin: "live",
        system: "Slack",
        detail: "Read from the configured channel. Visible to executive and manager roles.",
      },
      href: null,
      files: files.publicFiles,
    },
    previews: files.previews,
  };
}

function filesFrom(row: Record<string, unknown>): { publicFiles: SlackFile[]; previews: SlackFilePreview[] } {
  const rows = Array.isArray(row.files) ? row.files : [];
  const publicFiles: SlackFile[] = [];
  const previews: SlackFilePreview[] = [];
  const seen = new Set<string>();
  for (const item of rows) {
    const file = asRecord(item);
    const id = text(file.id);
    if (!/^F[A-Z0-9]{6,}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    const name = text(file.name) || text(file.title) || "File";
    const title = text(file.title) || name;
    const mimetype = text(file.mimetype).toLowerCase();
    const filetype = text(file.filetype).toLowerCase();
    const image = IMAGE_TYPES.has(mimetype) || (!mimetype && IMAGE_FILETYPES.has(filetype));
    const preview = previewUrl(file, image);
    publicFiles.push({
      id,
      name,
      title,
      mimetype: mimetype || "application/octet-stream",
      filetype,
      prettyType: text(file.pretty_type) || (filetype ? filetype.toUpperCase() : "File"),
      size: bytes(file.size),
      permalink: slackPermalink(text(file.permalink)),
      kind: image ? "image" : "file",
      preview: Boolean(preview),
    });
    if (preview) previews.push({ id, name, url: preview });
  }
  return { publicFiles, previews };
}

function previewUrl(file: Record<string, unknown>, image: boolean): string | null {
  const thumb =
    text(file.thumb_480) || text(file.thumb_360) || text(file.thumb_720) || text(file.thumb_160) || text(file.thumb_80);
  const thumbnail = slackFileUrl(thumb);
  if (thumbnail) return thumbnail;
  if (!image) return null;
  const size = bytes(file.size);
  if (size > 4 * 1024 * 1024) return null;
  return slackFileUrl(text(file.url_private));
}

function authorFrom(row: Record<string, unknown>, names: ReadonlyMap<string, string>): string {
  const userId = text(row.user);
  const botProfile = asRecord(row.bot_profile);
  return (
    text(botProfile.name) ||
    text(row.username) ||
    names.get(userId) ||
    (text(row.bot_id) ? "Impact Dashboard" : userId || "Unknown")
  );
}

function slackHttpsUrl(value: string, allowHost: (host: string) => boolean): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!allowHost(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bytes(value: unknown): number {
  const size = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(size) || size < 0) return 0;
  return Math.round(size);
}
