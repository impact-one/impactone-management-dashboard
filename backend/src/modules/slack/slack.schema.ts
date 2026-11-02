import { z } from "zod";
import { AppError } from "../../lib/AppError.js";

export const postMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a short update.")
    .max(3000, "Keep the update under 3000 characters."),
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Check the form and try again.");
  }
  return result.data;
}
