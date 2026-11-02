import type { Request, Response } from "express";
import { AppError } from "./AppError.js";
import type { PublicUser } from "../types/domain.js";

export function requireUser(req: Request): PublicUser {
  if (!req.user) throw new AppError(401, "Sign in required.");
  return req.user;
}

export function sendData(res: Response, data: unknown, meta: Record<string, unknown> = {}) {
  res.json({
    data,
    meta: {
      liveWritesEnabled: false,
      ...meta,
    },
  });
}
