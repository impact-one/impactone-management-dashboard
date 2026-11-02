import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { budgetsService } from "./budgets.service.js";

export class BudgetsController {
  get = asyncHandler(async (req: Request, res: Response) => {
    sendData(res, budgetsService.get(requireUser(req)), {
      note: "Figures are fictional. The live Google Sheet is not connected.",
    });
  });
}

export const budgetsController = new BudgetsController();
