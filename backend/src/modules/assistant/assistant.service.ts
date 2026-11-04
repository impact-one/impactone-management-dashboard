import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import type { AssistantDesk, AssistantRun, PublicUser } from "../../types/domain.js";
import { assistantClient } from "./assistant.client.js";
import { answerLookup, formatAutomations, refusalAnswer } from "./assistant.desk.js";
import { findConfidential } from "./assistant.guard.js";
import { INTENT_LABEL, classifyIntent, type ClassifiedIntent } from "./assistant.intent.js";
import { AUTOMATE_TASK, CHAT_TASK, WORKFLOWS } from "./assistant.prompts.js";
import { parseBody, runSchema } from "./assistant.schema.js";

const MODEL_REVIEW =
  "Review this output before you share it or act on it. It was sent to OpenAI and is not stored on this desk.";
const DESK_REVIEW = "Review this before you share it. It was read from the desk and was not sent to a model.";

export class AssistantService {
  async desk(user: PublicUser): Promise<{ desk: AssistantDesk; note: string }> {
    const live = await assistantClient.status();
    const staff = isStaff(user);
    const connected = Boolean(staff && live.ok && live.data);
    let note = live.message;
    if (!staff) {
      note = "ChatGPT runs are limited to executive and manager roles.";
    } else if (!live.configured) {
      note = "Desk questions still work. Drafting needs OPENAI_API_KEY on the API.";
    } else if (!live.ok) {
      note = `${live.message} Desk questions still work.`;
    } else {
      note = "Ask about a message, a meeting, or the desk. Review every draft. Do not paste tokens, passwords, fees, or live budget figures.";
    }
    const desk: AssistantDesk = {
      connected,
      canRun: staff,
      model: live.data?.model ?? null,
      provider: "ChatGPT",
      bestFit: "Desk questions, writing, and analysis",
      implementationNote: "The desk chooses the task. Review outputs and protect confidential information.",
      operatingModel:
        "Staff can ask about Slack, ClickUp, the calendar, and the rest of the desk, or paste notes to draft, research, analyze, or brainstorm. The chat does not post, book, or store the reply.",
      workflows: [],
      safeguards: [
        "Review the reply before it is shared or treated as a decision.",
        "Do not paste API keys, passwords, fees, or live budget lines.",
        "The chat can read Slack, ClickUp, Calendar, and the desk lists. It does not post, book, or change them.",
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

    const classified = await this.resolveIntent(input.brief);
    if (classified.refuseWrite) {
      const refused = refusalAnswer();
      return this.deskRun("automate", refused.text, refused.origin);
    }
    if (classified.intent === "overview" && classified.lookup) {
      const answer = await answerLookup(user, classified.lookup, {
        latest: classified.latest,
        mine: classified.mine,
        person: user.name,
      });
      return this.deskRun("overview", answer.text, answer.origin);
    }
    if (classified.intent === "chat") {
      await this.requireModel();
      const written = await assistantClient.complete({
        instruction: CHAT_TASK.instruction,
        temperature: CHAT_TASK.temperature,
        brief: input.brief,
      });
      return {
        workflow: "chat",
        intent: "chat",
        intentLabel: INTENT_LABEL.chat,
        model: written.model,
        output: written.output,
        reviewNote: MODEL_REVIEW,
        origin: "live",
      };
    }
    if (classified.intent === "automate") {
      await this.requireModel();
      const written = await assistantClient.complete({
        instruction: AUTOMATE_TASK.instruction,
        temperature: AUTOMATE_TASK.temperature,
        brief: input.brief,
        snapshot: formatAutomations(),
        automate: true,
      });
      return {
        workflow: "automate",
        intent: "automate",
        intentLabel: INTENT_LABEL.automate,
        model: written.model,
        output: written.output,
        reviewNote: MODEL_REVIEW,
        origin: "live",
      };
    }

    const writing = classified.writing ?? "draft";
    const task = WORKFLOWS[writing];
    await this.requireModel();
    const written = await assistantClient.complete({
      instruction: task.instruction,
      temperature: task.temperature,
      brief: input.brief,
    });
    return {
      workflow: classified.intent,
      intent: classified.intent,
      intentLabel: INTENT_LABEL[classified.intent],
      model: written.model,
      output: written.output,
      reviewNote: MODEL_REVIEW,
      origin: "live",
    };
  }

  private deskRun(intent: "overview" | "automate", output: string, origin: "live" | "sample"): AssistantRun {
    return {
      workflow: intent,
      intent,
      intentLabel: INTENT_LABEL[intent],
      model: null,
      output,
      reviewNote: DESK_REVIEW,
      origin,
    };
  }

  private async requireModel() {
    const live = await assistantClient.status();
    if (!live.configured) throw new AppError(503, "OpenAI API key is not set.");
    if (!live.ok || !live.data) throw new AppError(503, live.message);
    return live.data;
  }

  private async resolveIntent(brief: string): Promise<ClassifiedIntent> {
    return classifyIntent(brief) ?? { intent: "chat" };
  }
}

export const assistantService = new AssistantService();
