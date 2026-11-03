import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { otterService } from "./otter.service.js";

export class OtterController {
  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await otterService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note });
  });
}

export const otterController = new OtterController();
