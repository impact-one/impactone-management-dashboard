import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type { ClaudeWorkflow } from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";
import { CLAUDE_SYSTEM, claudeUserPrompt } from "./claude.prompts.js";

const API = "https://api.anthropic.com/v1";
const STATUS_CACHE_MS = 60_000;

let statusCache: { at: number; result: LiveResult<{ model: string }> } | null = null;

export function invalidateClaudeCache() {
  statusCache = null;
}

export const claudeClient = {
  status,
  complete,
};

async function status(): Promise<LiveResult<{ model: string }>> {
  if (statusCache && Date.now() - statusCache.at < STATUS_CACHE_MS) return statusCache.result;
  const result = await loadStatus();
  statusCache = { at: Date.now(), result };
  return result;
}

async function loadStatus(): Promise<LiveResult<{ model: string }>> {
  const checkedAt = new Date().toISOString();
  const model = env.anthropicModel;
  if (!env.anthropicApiKey) {
    return {
      ok: false,
      configured: false,
      checkedAt,
      message: "Anthropic API key is not set. Claude stays off until ANTHROPIC_API_KEY is added.",
      data: null,
    };
  }
  try {
    const response = await fetch(`${API}/models?limit=100`, {
      headers: {
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401) {
      return {
        ok: false,
        configured: true,
        checkedAt,
        message: "Anthropic rejected the API key. Issue a new key and restart the API.",
        data: null,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        checkedAt,
        message: "Claude could not be confirmed. Check the Anthropic key and billing.",
        data: null,
      };
    }
    const payload = (await response.json().catch(() => null)) as { data?: { id?: string }[] } | null;
    const listed = payload?.data?.some((item) => item.id === model) ?? false;
    if (!listed) {
      return {
        ok: false,
        configured: true,
        checkedAt,
        message: `Anthropic did not list model ${model}. Set ANTHROPIC_MODEL to a model that account can use.`,
        data: null,
      };
    }
    return {
      ok: true,
      configured: true,
      checkedAt,
      message: `Claude is connected with ${model}. Staff can write, review, synthesize, and work on coding notes.`,
      data: { model },
    };
  } catch {
    return {
      ok: false,
      configured: true,
      checkedAt,
      message: "Claude could not be reached. Check the network and try again.",
      data: null,
    };
  }
}

async function complete(workflow: ClaudeWorkflow, brief: string): Promise<{ model: string; output: string }> {
  if (!env.anthropicApiKey) throw new AppError(503, "Anthropic API key is not set.");
  const model = env.anthropicModel;
  let response: Response;
  try {
    response = await fetch(`${API}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        system: CLAUDE_SYSTEM,
        messages: [{ role: "user", content: claudeUserPrompt(workflow, brief) }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AppError(502, "Claude could not be reached.");
  }

  const payload = (await response.json().catch(() => null)) as {
    content?: { type?: string; text?: string }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    if (response.status === 401) throw new AppError(502, "Anthropic rejected the API key.");
    if (response.status === 429) throw new AppError(502, "Anthropic rate limit or billing limit was hit. Try again later.");
    const detail = payload?.error?.message?.replace(/\s+/g, " ").slice(0, 180);
    throw new AppError(502, detail ? `Claude could not complete that request. ${detail}` : "Claude could not complete that request.");
  }

  const output = payload?.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text?.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (!output) throw new AppError(502, "Claude returned an empty reply.");
  return { model, output };
}
