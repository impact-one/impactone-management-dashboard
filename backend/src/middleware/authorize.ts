import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import type { Role } from "../types/domain.js";

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Sign in required."));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have access to this."));
    }
    next();
  };
}
