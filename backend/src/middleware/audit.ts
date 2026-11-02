import type { NextFunction, Request, Response } from "express";
import { recordAudit } from "../data/store.js";

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (!req.user) return;
    const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
    if (path.startsWith("/api/health")) return;
    // Soft Slack desk polls would flood the in-memory audit trail.
    if (req.method === "GET" && (path === "/api/slack" || path === "/api/slack/desk")) return;
    recordAudit({
      actorEmail: req.user.email,
      role: req.user.role,
      method: req.method,
      path,
      status: res.statusCode,
      action: `${req.method} ${path}`,
    });
  });
  next();
}
