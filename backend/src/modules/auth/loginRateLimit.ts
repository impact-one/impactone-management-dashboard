import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/AppError.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }
  if (existing.count >= 8) {
    next(new AppError(429, "Too many sign-in attempts. Wait a few minutes and try again."));
    return;
  }
  existing.count += 1;
  next();
}
