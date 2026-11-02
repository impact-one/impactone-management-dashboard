import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { store } from "../data/store.js";
import { AppError } from "../lib/AppError.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { permissionsFor } from "../lib/permissions.js";
import { clearSessionCookie, readAccessToken } from "../lib/sessionCookie.js";
import { revokeSession, sessionIsActive } from "../lib/sessions.js";
import type { PublicUser } from "../types/domain.js";

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: PublicUser["role"];
  title: string;
  assignedProjectIds: string[];
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    title: user.title,
    assignedProjectIds: user.assignedProjectIds,
    permissions: permissionsFor(user.role),
  };
}

function userFromToken(token: string): PublicUser {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.jti !== "string" ||
    !sessionIsActive(decoded.jti)
  ) {
    throw new AppError(401, "Session expired. Sign in again.");
  }
  const user = store.users.find((item) => item.id === decoded.sub);
  if (!user) throw new AppError(401, "Sign in required.");
  return toPublicUser(user);
}

export function revokePresentedToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded !== "string" && typeof decoded.jti === "string") revokeSession(decoded.jti);
  } catch {
    // An expired or altered token is already unusable.
  }
}

/** Verifies the session cookie, or a Bearer token for non-browser clients, and sets req.user. */
export const jwtMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = readAccessToken(req);
  if (!token) throw new AppError(401, "Sign in required.");
  try {
    req.user = userFromToken(token);
  } catch (error) {
    clearSessionCookie(res);
    if (error instanceof AppError) throw error;
    throw new AppError(401, "Session expired. Sign in again.");
  }
  next();
});

/** Best-effort attach for logout, so an expired cookie can still be cleared. */
export function attachUserIfPresent(req: Request): void {
  const token = readAccessToken(req);
  if (!token) return;
  try {
    req.user = userFromToken(token);
  } catch {
    req.user = undefined;
  }
}
