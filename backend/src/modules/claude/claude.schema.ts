import { z } from "zod";
import { AppError } from "../../lib/AppError.js";

export const claudeWorkflows = ["write", "review", "synthesize", "code"] as const;

export const claudeRunSchema = z.object({
  workflow: z.enum(claudeWorkflows, { message: "Choose write, review, synthesize, or code." }),
  brief: z
    .string()
    .trim()
    .min(8, "Add the document or notes Claude should work from.")
    .max(80000, "Keep the source under 80,000 characters."),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Confirm that you will validate important facts and that this source has no secrets." }),
  }),
});

export function parseClaudeBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Check the form and try again.");
  }
  return result.data;
}
