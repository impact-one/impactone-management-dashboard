import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { documentsService } from "./documents.service.js";

export class DocumentsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const result = await documentsService.list(requireUser(req), projectId || undefined);
    sendData(res, result.items, { note: result.note });
  });
}

export const documentsController = new DocumentsController();
