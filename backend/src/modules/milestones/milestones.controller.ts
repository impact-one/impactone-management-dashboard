import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { milestonesService } from "./milestones.service.js";

export class MilestonesController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    sendData(res, milestonesService.list(requireUser(req), projectId || undefined));
  });
}

export const milestonesController = new MilestonesController();
