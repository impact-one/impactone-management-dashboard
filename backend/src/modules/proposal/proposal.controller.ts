import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { proposalService } from "./proposal.service.js";

export class ProposalController {
  get = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, proposalService.get());
  });
}

export const proposalController = new ProposalController();
