import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { tasksController } from "./tasks.controller.js";

export const tasksRouter = Router();

tasksRouter.use(authenticate);
tasksRouter.get("/", tasksController.list);
tasksRouter.get("/:id/files/:fileId", tasksController.file);
tasksRouter.get("/:id", tasksController.get);
