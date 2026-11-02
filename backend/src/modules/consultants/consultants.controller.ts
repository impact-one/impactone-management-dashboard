import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { consultantsService } from "./consultants.service.js";

export class ConsultantsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const items = consultantsService.list(requireUser(req), projectId || undefined);
    const user = requireUser(req);
    sendData(res, items, {
      note: user.permissions.viewConsultantFees
        ? "Fee amounts are reference figures, not contracts."
        : "Consultant fees are hidden for this role.",
    });
  });
}

export const consultantsController = new ConsultantsController();
