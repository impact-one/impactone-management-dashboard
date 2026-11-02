import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { aiToolsController } from "./ai-tools.controller.js";

export const aiToolsRouter = Router();

aiToolsRouter.use(authenticate);
aiToolsRouter.get("/", aiToolsController.list);
