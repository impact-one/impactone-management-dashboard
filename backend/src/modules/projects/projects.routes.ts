import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { projectsController } from "./projects.controller.js";

export const projectsRouter = Router();

projectsRouter.use(authenticate);
projectsRouter.get("/", projectsController.list);
projectsRouter.get("/:id", projectsController.getById);
