import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/", dashboardController.get);
