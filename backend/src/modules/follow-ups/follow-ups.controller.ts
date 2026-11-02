import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { followUpsService } from "./follow-ups.service.js";

export class FollowUpsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    sendData(res, followUpsService.list(requireUser(req), projectId || undefined));
  });
}

export const followUpsController = new FollowUpsController();
