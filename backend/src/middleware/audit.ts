import type { NextFunction, Request, Response } from "express";
import { recordAudit } from "../data/store.js";

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (!req.user) return;
    if (req.originalUrl.startsWith("/api/health")) return;
    recordAudit({
      actorEmail: req.user.email,
      role: req.user.role,
      method: req.method,
      path: req.originalUrl.split("?")[0] ?? req.originalUrl,
      status: res.statusCode,
      action: `${req.method} ${req.originalUrl.split("?")[0] ?? req.originalUrl}`,
    });
  });
  next();
}
