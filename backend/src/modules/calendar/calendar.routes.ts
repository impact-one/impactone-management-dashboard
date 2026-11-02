import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { calendarController } from "./calendar.controller.js";

export const calendarRouter = Router();

calendarRouter.use(authenticate);
calendarRouter.get("/", calendarController.list);
