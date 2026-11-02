import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { budgetsController } from "./budgets.controller.js";

export const budgetsRouter = Router();

budgetsRouter.use(authenticate);
budgetsRouter.get("/", budgetsController.get);
