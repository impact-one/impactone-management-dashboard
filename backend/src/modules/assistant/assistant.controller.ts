import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { assistantService } from "./assistant.service.js";

export class AssistantController {
  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await assistantService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note, liveWritesEnabled: false });
  });

  run = asyncHandler(async (req: Request, res: Response) => {
    const result = await assistantService.run(requireUser(req), req.body);
    sendData(res, result, { note: result.reviewNote, liveWritesEnabled: false });
  });
}

export const assistantController = new AssistantController();
