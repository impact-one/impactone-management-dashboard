import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { milestonesController } from "./milestones.controller.js";

export const milestonesRouter = Router();

milestonesRouter.use(authenticate);
milestonesRouter.get("/", milestonesController.list);
