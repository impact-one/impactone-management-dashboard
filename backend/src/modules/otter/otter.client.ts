import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type { OtterActionItem, OtterInsight, OtterMeeting, OtterPerson, OtterShare } from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";

const API = "https://api.otter.ai/v1";
const LIST_LIMIT = 8;
const TRANSCRIPT_CAP = 16_000;
const CACHE_MS = 45_000;

let statusCache: { at: number; result: LiveResult<{ name: string }> } | null = null;
let meetingsCache: { at: number; result: LiveResult<OtterMeeting[]> } | null = null;
let statusFlight: Promise<LiveResult<{ name: string }>> | null = null;
let meetingsFlight: Promise<LiveResult<OtterMeeting[]>> | null = null;

export const otterClient = {
  get,
  meetings,
};

async function get(): Promise<LiveResult<{ name: string }>> {
  if (statusCache && Date.now() - statusCache.at < CACHE_MS) return statusCache.result;
  if (statusFlight) return statusFlight;
  statusFlight = loadStatus()
    .then((result) => {
      statusCache = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      statusFlight = null;
    });
  return statusFlight;
}

async function meetings(): Promise<LiveResult<OtterMeeting[]>> {
  if (meetingsCache && Date.now() - meetingsCache.at < CACHE_MS) return meetingsCache.result;
  if (meetingsFlight) return meetingsFlight;
  meetingsFlight = loadMeetings()
    .then((result) => {
      meetingsCache = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      meetingsFlight = null;
    });
  return meetingsFlight;
}

async function loadStatus(): Promise<LiveResult<{ name: string }>> {
  const checkedAt = new Date().toISOString();
  if (!env.otterApiKey) {
    return {
      ok: false,
      configured: false,
      checkedAt,
      message: "Otter API key is not set. Meeting notes stay on labelled sample data.",
      data: null,
    };
  }
  try {
    const payload = asRecord(await otterGet("/workspace"));
    const data = asRecord(payload.data);
    const name = text(data.name, "Otter workspace");
    return {
      ok: true,
      configured: true,
      checkedAt,
      message: `Connected to ${name}. Transcripts, summaries, and action items can be read. This desk does not change sharing.`,
      data: { name },
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      checkedAt,
      message: error instanceof Error ? error.message : "Otter could not be reached.",
      data: null,
    };
  }
}

async function loadMeetings(): Promise<LiveResult<OtterMeeting[]>> {
  const checkedAt = new Date().toISOString();
  if (!env.otterApiKey) {
    return {
      ok: false,
      configured: false,
      checkedAt,
      message: "Otter API key is not set. Meeting notes stay on labelled sample data.",
      data: null,
    };
  }
  try {
    const listed = asRecord(
      await otterGet(`/conversations?include_shared=true&limit=${LIST_LIMIT}`),
    );
    const rows = Array.isArray(listed.data) ? listed.data : [];
    const detailed = await Promise.all(
      rows.map(async (row) => {
        const summary = asRecord(row);
        const id = text(summary.id);
        if (!id) return mapMeeting(summary, {});
        try {
          const payload = asRecord(await otterGet(`/conversations/${encodeURIComponent(id)}?include=action_items,insights,transcript`));
          return mapMeeting(asRecord(payload.data), asRecord(asRecord(payload.data).relationships));
        } catch {
          return mapMeeting(summary, {});
        }
      }),
    );
    return {
      ok: true,
      configured: true,
      checkedAt,
      message: "Live Otter conversations for executive and manager roles. Confirm consent and sharing before opening notes.",
      data: detailed.filter((item) => item.id),
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      checkedAt,
      message: error instanceof Error ? error.message : "Otter conversations could not be read.",
      data: null,
    };
  }
}

function mapMeeting(row: Record<string, unknown>, relationships: Record<string, unknown>): OtterMeeting {
  const owner = asRecord(row.owner);
  const status = asRecord(row.process_status);
  const transcript = asRecord(relationships.transcript);
  const rawTranscript = text(transcript.content);
  const transcriptTruncated = rawTranscript.length > TRANSCRIPT_CAP;
  return {
    id: text(row.id),
    title: text(row.title, "Untitled conversation"),
    summary: text(row.abstract_summary),
    transcript: rawTranscript.slice(0, TRANSCRIPT_CAP),
    transcriptTruncated,
    createdAt: text(row.created_at, new Date().toISOString()),
    owner: text(owner.name, text(owner.email, "Unknown")),
    url: text(row.url) || null,
    joinUrl: text(row.conf_join_url) || null,
    guests: mapGuests(row.calendar_guests),
    shares: mapShares(row),
    actionItems: mapActions(relationships.action_items),
    insights: mapInsights(relationships.insights),
    summaryStatus: text(status.abstract_summary) || null,
    actionStatus: text(status.action_item) || null,
    source: {
      origin: "live",
      system: "Otter.ai",
      detail: "Read from the Enterprise workspace. Sharing is shown as Otter recorded it.",
    },
  };
}

function mapGuests(value: unknown): OtterPerson[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    return { name: text(row.name, text(row.email, "Guest")), email: text(row.email) || null };
  });
}

function mapShares(row: Record<string, unknown>): OtterShare[] {
  const people = Array.isArray(row.shared_emails) ? row.shared_emails : [];
  const channels = Array.isArray(row.shared_channels) ? row.shared_channels : [];
  const mapped: OtterShare[] = [];
  for (const item of people) {
    const share = asRecord(item);
    const user = asRecord(share.user);
    mapped.push({
      name: text(user.name, text(share.email, "Shared person")),
      email: text(share.email, text(user.email)) || null,
      permission: text(share.permission, "unspecified"),
      kind: "person",
      discoverability: null,
    });
  }
  for (const item of channels) {
    const share = asRecord(item);
    const channel = asRecord(share.channel);
    mapped.push({
      name: text(channel.name, "Shared channel"),
      email: null,
      permission: text(share.permission, "unspecified"),
      kind: "channel",
      discoverability: text(channel.discoverability) || null,
    });
  }
  return mapped;
}

function mapActions(value: unknown): OtterActionItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = asRecord(item);
    const assignee = asRecord(row.assignee);
    const status = asRecord(row.status);
    return {
      id: text(row.id, `action-${index}`),
      text: text(row.text, "Action item"),
      assignee: text(assignee.name, text(assignee.email)) || null,
      completed: status.completed === true,
    };
  });
}

function mapInsights(value: unknown): OtterInsight[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    const points = Array.isArray(row.text) ? row.text.filter((point): point is string => typeof point === "string") : [];
    return { topic: text(row.topic, "Insight"), points };
  });
}

async function otterGet(path: string): Promise<unknown> {
  const token = env.otterApiKey;
  if (!token) throw new AppError(503, "Otter API key is not set.");
  const response = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (response.status === 401 || response.status === 403) {
    throw new AppError(502, "Otter rejected the API key. Use an Enterprise key from Integrations → Developer.");
  }
  if (response.status === 429) {
    throw new AppError(502, "Otter rate limit reached. Try again in a moment.");
  }
  if (!response.ok) {
    throw new AppError(502, `Otter returned ${response.status}.`);
  }
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
