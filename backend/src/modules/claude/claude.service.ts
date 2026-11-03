import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type { ClaudeDesk, ClaudeRun, PublicUser } from "../../types/domain.js";
import { findConfidential } from "../assistant/assistant.guard.js";
import { claudeClient } from "./claude.client.js";
import { CLAUDE_WORKFLOWS } from "./claude.prompts.js";
import { claudeRunSchema, parseClaudeBody } from "./claude.schema.js";

const REVIEW_NOTE =
  "Validate important facts in this reply before you share it or act on it. It was sent to Anthropic and is not stored on this desk.";

export class ClaudeService {
  async desk(user: PublicUser): Promise<{ desk: ClaudeDesk; note: string }> {
    const live = await claudeClient.status();
    const staff = isStaff(user);
    const connected = Boolean(staff && live.ok && live.data);
    let note = live.message;
    if (!staff) {
      note = "Claude runs are limited to executive and manager roles.";
    } else if (!live.configured) {
      note = "Claude is not connected. Add ANTHROPIC_API_KEY on the API, then restart it.";
    } else if (!live.ok) {
      note = live.message;
    } else {
      note = "Validate important facts in every reply. Do not paste tokens, passwords, fees, or live budget figures.";
    }
    const desk: ClaudeDesk = {
      connected,
      canRun: staff,
      model: live.data?.model ?? null,
      provider: "Claude",
      bestFit: "Long-form writing, document review",
      implementationNote: "Validate important facts and generated outputs.",
      operatingModel:
        "Staff can write, review a long document, synthesize it, or work through a coding note. Only the source in the form is sent to Anthropic. This desk does not attach other systems, and it does not store the source or the reply.",
      workflows: (Object.keys(CLAUDE_WORKFLOWS) as (keyof typeof CLAUDE_WORKFLOWS)[]).map((id) => ({
        id,
        label: CLAUDE_WORKFLOWS[id].label,
        hint: CLAUDE_WORKFLOWS[id].hint,
      })),
      safeguards: [
        "Validate important facts before the reply is shared.",
        "Do not paste API keys, passwords, fees, or live budget lines.",
        "The desk does not send Drive files, budgets, or tokens on its own.",
        "Sources and replies are not saved on this desk.",
      ],
    };
    return { desk, note };
  }

  async run(user: PublicUser, body: unknown): Promise<ClaudeRun> {
    if (!isStaff(user)) {
      throw new AppError(403, "Only executive and manager roles can run Claude from this desk.");
    }
    const input = parseClaudeBody(claudeRunSchema, body);
    const blocked = findConfidential(input.brief);
    if (blocked) throw new AppError(400, blocked);
    const live = await claudeClient.status();
    if (!live.configured) throw new AppError(503, "Anthropic API key is not set.");
    if (!live.ok) throw new AppError(503, live.message);
    const result = await claudeClient.complete(input.workflow, input.brief);
    return {
      workflow: input.workflow,
      model: result.model,
      output: result.output,
      reviewNote: REVIEW_NOTE,
      origin: "live",
    };
  }
}

export const claudeService = new ClaudeService();
