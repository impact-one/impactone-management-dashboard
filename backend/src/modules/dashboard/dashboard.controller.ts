import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { dashboardService } from "./dashboard.service.js";

export class DashboardController {
  get = asyncHandler(async (req: Request, res: Response) => {
    sendData(res, await dashboardService.get(requireUser(req)));
  });
}

export const dashboardController = new DashboardController();
