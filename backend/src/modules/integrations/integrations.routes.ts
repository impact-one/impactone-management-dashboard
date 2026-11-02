import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { integrationsController } from "./integrations.controller.js";

export const integrationsRouter = Router();

integrationsRouter.use(authenticate);
integrationsRouter.get("/", integrationsController.list);
