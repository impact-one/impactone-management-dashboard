import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { documentsService } from "./documents.service.js";

function writes() {
  return { liveWritesEnabled: Boolean(env.googleAccessToken) };
}

function routeId(req: Request) {
  return typeof req.params.id === "string" ? req.params.id : "";
}

export class DocumentsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const result = await documentsService.list(requireUser(req), projectId || undefined);
    sendData(res, result.items, { note: result.note, ...writes() });
  });

  desk = asyncHandler(async (req: Request, res: Response) => {
    const result = await documentsService.desk(requireUser(req));
    sendData(res, result.desk, { note: result.note, ...writes() });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const file = await documentsService.create(requireUser(req), req.body);
    sendData(res, file, { note: "File added.", ...writes() });
  });

  share = asyncHandler(async (req: Request, res: Response) => {
    const file = await documentsService.share(requireUser(req), routeId(req), req.body);
    sendData(res, file, { note: "Sharing updated.", ...writes() });
  });

  unshare = asyncHandler(async (req: Request, res: Response) => {
    const file = await documentsService.unshare(requireUser(req), routeId(req), req.body);
    sendData(res, file, { note: "Sharing removed.", ...writes() });
  });
}

export const documentsController = new DocumentsController();
