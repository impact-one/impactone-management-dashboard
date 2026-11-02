import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { automationsService } from "./automations.service.js";

export class AutomationsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, automationsService.list());
  });
}

export const automationsController = new AutomationsController();
