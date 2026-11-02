import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { aiToolsService } from "./ai-tools.service.js";

export class AiToolsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, aiToolsService.list(), {
      note: "Items marked Needs review still need confirmed purpose or ownership.",
    });
  });
}

export const aiToolsController = new AiToolsController();
