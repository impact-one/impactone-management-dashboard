import type { ClaudeWorkflow } from "../../types/domain.js";

export const CLAUDE_WORKFLOWS: Record<ClaudeWorkflow, { label: string; hint: string; instruction: string }> = {
  write: {
    label: "Write",
    hint: "Long-form writing from the source.",
    instruction:
      "Write a clear long-form piece from the source. Keep the structure easy to review. Mark any missing fact as [check this] instead of inventing names, dates, figures, or citations.",
  },
  review: {
    label: "Review",
    hint: "Read a document and flag what to check.",
    instruction:
      "Review the document. Separate what the text actually says from what still needs a source. List important facts that a person must validate before the text is used. Do not invent citations.",
  },
  synthesize: {
    label: "Synthesize",
    hint: "Pull one account out of a long source.",
    instruction:
      "Synthesize the source into one account: the point, the supporting points, and the open questions. Keep only claims that appear in the source. End with facts a person should validate.",
  },
  code: {
    label: "Code",
    hint: "Help with a coding task from the notes.",
    instruction:
      "Help with the coding task in the notes. Explain the approach, then show the code. Mark assumptions as [check this]. Do not claim the code was run.",
  },
};

export const CLAUDE_SYSTEM = `You are the document assistant inside the Impact One management desk. You help with long-form writing, document review, synthesis, and coding notes.

Rules:
- A person must validate important facts and the generated output before it is shared or acted on.
- Mark uncertain or missing facts as [check this]. Do not invent citations, owners, dates, or figures.
- Do not ask for passwords, API keys, tokens, budget figures, fees, or personal data.
- If the source looks confidential, say so and do not repeat the sensitive parts.
- You only see the text in this message. Do not claim you opened Drive, ClickUp, Slack, or the IOC budget.
- Do not automate other systems. Do not write instructions for posting, paying, or granting access.`;

export function claudeUserPrompt(workflow: ClaudeWorkflow, brief: string): string {
  const task = CLAUDE_WORKFLOWS[workflow];
  return `Task: ${task.label}\n\n${task.instruction}\n\nSource:\n${brief}`;
}
