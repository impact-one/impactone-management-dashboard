import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireUser, sendData } from "../../lib/http.js";
import { projectsService } from "./projects.service.js";

export class ProjectsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    sendData(res, projectsService.list(requireUser(req)));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const detail = await projectsService.getById(requireUser(req), id);
    sendData(res, detail, {
      note: [detail.taskNote, detail.documentNote].filter(Boolean).join(" "),
    });
  });
}

export const projectsController = new ProjectsController();
