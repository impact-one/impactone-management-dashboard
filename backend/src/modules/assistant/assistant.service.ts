import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type { AssistantDesk, AssistantRun, PublicUser } from "../../types/domain.js";
import { assistantClient } from "./assistant.client.js";
import { findConfidential } from "./assistant.guard.js";
import { WORKFLOWS } from "./assistant.prompts.js";
import { parseBody, runSchema } from "./assistant.schema.js";

const REVIEW_NOTE =
  "Review this output before you share it or act on it. It was sent to OpenAI and is not stored on this desk.";

export class AssistantService {
  async desk(user: PublicUser): Promise<{ desk: AssistantDesk; note: string }> {
    const live = await assistantClient.status();
    const staff = isStaff(user);
    const connected = Boolean(staff && live.ok && live.data);
    let note = live.message;
    if (!staff) {
      note = "ChatGPT runs are limited to executive and manager roles.";
    } else if (!live.configured) {
      note = "ChatGPT is not connected. Add OPENAI_API_KEY on the API, then restart it.";
    } else if (!live.ok) {
      note = live.message;
    } else {
      note = "Review every output. Do not paste tokens, passwords, fees, or live budget figures.";
    }
    const desk: AssistantDesk = {
      connected,
      canRun: staff && live.ok,
      model: live.data?.model ?? null,
      provider: "ChatGPT",
      bestFit: "Writing, analysis, summaries",
      implementationNote: "Review outputs and protect confidential information.",
      operatingModel:
        "Staff can draft, research, analyze, brainstorm, and summarize. Only the note in the form is sent to OpenAI. This desk does not attach budgets, documents, or tokens, and it does not store the note or the reply.",
      workflows: (Object.keys(WORKFLOWS) as (keyof typeof WORKFLOWS)[]).map((id) => ({
        id,
        label: WORKFLOWS[id].label,
        hint: WORKFLOWS[id].hint,
      })),
      safeguards: [
        "Review the reply before it is shared or treated as a decision.",
        "Do not paste API keys, passwords, fees, or live budget lines.",
        "The desk does not send ClickUp, Drive, Calendar, Slack, or budget data on its own.",
        "Notes and replies are not saved on this desk.",
      ],
    };
    return { desk, note };
  }

  async run(user: PublicUser, body: unknown): Promise<AssistantRun> {
    if (!isStaff(user)) {
      throw new AppError(403, "Only executive and manager roles can run ChatGPT from this desk.");
    }
    const input = parseBody(runSchema, body);
    const blocked = findConfidential(input.brief);
    if (blocked) throw new AppError(400, blocked);
    const live = await assistantClient.status();
    if (!live.configured) {
      throw new AppError(503, "OpenAI API key is not set.");
    }
    if (!live.ok) {
      throw new AppError(503, live.message);
    }
    const result = await assistantClient.complete(input.workflow, input.brief);
    return {
      workflow: input.workflow,
      model: result.model,
      output: result.output,
      reviewNote: REVIEW_NOTE,
      origin: "live",
    };
  }
}

export const assistantService = new AssistantService();
