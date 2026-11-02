import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Request body must be JSON." });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Unexpected error." });
}
