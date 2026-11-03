import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type { AssistantWorkflow } from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";
import { SYSTEM_PROMPT, WORKFLOWS, userPrompt } from "./assistant.prompts.js";

const API = "https://api.openai.com/v1";
const STATUS_CACHE_MS = 60_000;

let statusCache: { at: number; result: LiveResult<{ model: string }> } | null = null;

export function invalidateAssistantCache() {
  statusCache = null;
}

export const assistantClient = {
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
  const model = env.openaiModel;
  if (!env.openaiApiKey) {
    return {
      ok: false,
      configured: false,
      checkedAt,
      message: "OpenAI API key is not set. The assistant stays off until OPENAI_API_KEY is added.",
      data: null,
    };
  }
  try {
    const response = await fetch(`${API}/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${env.openaiApiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401) {
      return {
        ok: false,
        configured: true,
        checkedAt,
        message: "OpenAI rejected the API key. Issue a new key and restart the API.",
        data: null,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        checkedAt,
        message: `OpenAI could not confirm model ${model}. Check OPENAI_MODEL and billing on the OpenAI account.`,
        data: null,
      };
    }
    return {
      ok: true,
      configured: true,
      checkedAt,
      message: `ChatGPT is connected with ${model}. Staff can draft, research, analyze, brainstorm, and summarize.`,
      data: { model },
    };
  } catch {
    return {
      ok: false,
      configured: true,
      checkedAt,
      message: "ChatGPT could not be reached. Check the network and try again.",
      data: null,
    };
  }
}

async function complete(workflow: AssistantWorkflow, brief: string): Promise<{ model: string; output: string }> {
  if (!env.openaiApiKey) {
    throw new AppError(503, "OpenAI API key is not set.");
  }
  const model = env.openaiModel;
  let response: Response;
  try {
    response = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: WORKFLOWS[workflow].temperature,
        max_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(workflow, brief) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AppError(502, "ChatGPT could not be reached.");
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    const detail = payload?.error?.message;
    if (response.status === 401) throw new AppError(502, "OpenAI rejected the API key.");
    if (response.status === 429) throw new AppError(502, "OpenAI rate limit or billing limit was hit. Try again later.");
    throw new AppError(502, detail ? `ChatGPT could not complete that request. ${detail}` : "ChatGPT could not complete that request.");
  }

  const output = payload?.choices?.[0]?.message?.content?.trim();
  if (!output) throw new AppError(502, "ChatGPT returned an empty reply.");
  return { model, output };
}
