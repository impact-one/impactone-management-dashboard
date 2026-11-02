import { z } from "zod";
import { AppError } from "../../lib/AppError.js";

const email = z
  .string()
  .trim()
  .email("Use a full email address.")
  .max(200)
  .transform((value) => value.toLowerCase());

export const createFileSchema = z.object({
  title: z.string().trim().min(1, "Add a name.").max(140),
  kind: z.enum(["folder", "document", "spreadsheet"]),
  folderId: z.string().trim().max(300).optional().default(""),
  projectId: z.string().trim().max(80).optional().default(""),
});

export const shareFileSchema = z.object({
  email,
  role: z.enum(["writer", "commenter", "reader"], {
    errorMap: () => ({ message: "Sharing can be writer, commenter, or reader. Owner stays with the file." }),
  }),
});

export const removeShareSchema = z.object({
  email,
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Check the form and try again.");
  }
  return result.data;
}
