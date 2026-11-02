import { z } from "zod";
import { AppError } from "../../lib/AppError.js";

const timeZone = z.string().trim().min(1, "Set a time zone.").max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date as YYYY-MM-DD.");
const clock = z.string().regex(/^\d{2}:\d{2}$/, "Use a time as HH:mm.");
const email = z.string().trim().email("Use a full email address.").max(200);

const reminder = z.object({
  method: z.enum(["email", "popup"]),
  minutesBefore: z.number().int().min(0).max(40320),
});

const invitationInput = z.object({
  email,
  name: z.string().trim().max(120).optional().default(""),
  optional: z.boolean().optional().default(false),
});

export const scheduleSchema = z.object({
  calendarId: z.string().trim().min(1, "Choose a calendar.").max(300),
  title: z.string().trim().min(1, "Add a meeting title.").max(140),
  date,
  startTime: clock,
  endTime: clock,
  timeZone,
  location: z.string().trim().max(200).optional().default(""),
  invitations: z.array(invitationInput).max(30).optional().default([]),
  reminders: z.array(reminder).max(5).optional().default([]),
});

export const invitationsSchema = z.object({
  invitations: z
    .array(
      invitationInput.extend({
        response: z.enum(["needsAction", "accepted", "declined", "tentative"]).optional().default("needsAction"),
      }),
    )
    .max(30),
});

export const availabilitySchema = z.object({
  timeZone,
  date,
  startTime: clock,
  endTime: clock,
  emails: z.array(email).min(1, "Add at least one person.").max(20),
});

export const shareSchema = z.object({
  email,
  role: z.enum(["writer", "reader", "freeBusyReader"], {
    errorMap: () => ({ message: "Sharing can be writer, reader, or free/busy. Owner stays with the calendar." }),
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
