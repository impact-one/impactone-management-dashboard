import type { Request, Response } from "express";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { tasksService } from "./tasks.service.js";

function projectIdFrom(req: Request): string | undefined {
  return typeof req.query.projectId === "string" && req.query.projectId ? req.query.projectId : undefined;
}

function routeId(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export class TasksController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await tasksService.list(requireUser(req), projectIdFrom(req));
    sendData(res, result.items, { note: result.note, statuses: result.statuses });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.get(requireUser(req), routeId(req.params.id));
    if (!task) throw new AppError(404, "Task not found.");
    sendData(res, task);
  });

  file = asyncHandler(async (req: Request, res: Response) => {
    const result = await tasksService.file(
      requireUser(req),
      routeId(req.params.id),
      routeId(req.params.fileId),
      req.query.size === "thumb",
    );
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `${result.inline ? "inline" : "attachment"}; filename="${result.filename}"`);
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=120");
    res.send(result.body);
  });
}

export const tasksController = new TasksController();
