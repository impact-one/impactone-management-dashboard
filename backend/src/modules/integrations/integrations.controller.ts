import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { sendData } from "../../lib/http.js";
import { integrationsService } from "./integrations.service.js";

export class IntegrationsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendData(res, await integrationsService.list(), {
      note: "Integrations report live connection status. Write actions stay scoped to Calendar, Drive, and Slack where enabled.",
    });
  });
}

export const integrationsController = new IntegrationsController();
