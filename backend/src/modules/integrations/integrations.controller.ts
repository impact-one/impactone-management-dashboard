import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { integrationsService } from "./integrations.service.js";

export class IntegrationsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, await integrationsService.list(), {
      note: "Every external call in this API is an HTTP GET. There is no route that posts, edits, or deletes in a live tool.",
    });
  });
}

export const integrationsController = new IntegrationsController();
