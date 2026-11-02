import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { followUpsController } from "./follow-ups.controller.js";

export const followUpsRouter = Router();

followUpsRouter.use(authenticate);
followUpsRouter.get("/", followUpsController.list);
