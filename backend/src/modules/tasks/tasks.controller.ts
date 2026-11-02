import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { tasksService } from "./tasks.service.js";

function projectIdFrom(req: Request): string | undefined {
  return typeof req.query.projectId === "string" && req.query.projectId ? req.query.projectId : undefined;
}

export class TasksController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await tasksService.list(requireUser(req), projectIdFrom(req));
    sendData(res, result.items, { note: result.note });
  });
}

export const tasksController = new TasksController();
