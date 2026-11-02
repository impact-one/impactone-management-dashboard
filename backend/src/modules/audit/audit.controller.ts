import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { auditService } from "./audit.service.js";

export class AuditController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = auditService.list(requireUser(req));
    sendData(res, result.events, { note: result.note });
  });
}

export const auditController = new AuditController();
