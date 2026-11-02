import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { systemMapService } from "./system-map.service.js";

export class SystemMapController {
  get = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, systemMapService.get());
  });
}

export const systemMapController = new SystemMapController();
