import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { aiToolsService } from "./ai-tools.service.js";

export class AiToolsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, aiToolsService.list(), {
      note: "Rows marked Needs review are waiting on Zygm's overview, which was in preparation from 26 October 2026.",
    });
  });
}

export const aiToolsController = new AiToolsController();
