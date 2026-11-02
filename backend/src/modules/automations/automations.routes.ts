import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { automationsController } from "./automations.controller.js";

export const automationsRouter = Router();

automationsRouter.use(authenticate);
automationsRouter.get("/", automationsController.list);
