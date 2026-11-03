import { z } from "zod";
import { AppError } from "../../lib/AppError.js";

export const assistantWorkflows = ["draft", "research", "analyze", "brainstorm", "summarize"] as const;

export const runSchema = z.object({
  workflow: z.enum(assistantWorkflows, { message: "Choose draft, research, analyze, brainstorm, or summarize." }),
  brief: z
    .string()
    .trim()
    .min(8, "Write a few sentences so ChatGPT has something to work with.")
    .max(6000, "Keep the note under 6000 characters."),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Confirm that you will review the output and that this note has no secrets." }),
  }),
});

export type AssistantRunInput = z.infer<typeof runSchema>;

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Check the form and try again.");
  }
  return result.data;
}
