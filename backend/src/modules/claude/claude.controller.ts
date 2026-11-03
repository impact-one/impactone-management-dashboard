import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { claudeService } from "./claude.service.js";

export class ClaudeController {
  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await claudeService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note, liveWritesEnabled: false });
  });

  run = asyncHandler(async (req: Request, res: Response) => {
    const result = await claudeService.run(requireUser(req), req.body);
    sendData(res, result, { note: result.reviewNote, liveWritesEnabled: false });
  });
}

export const claudeController = new ClaudeController();
