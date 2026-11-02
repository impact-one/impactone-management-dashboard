import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { calendarController } from "./calendar.controller.js";

export const calendarRouter = Router();

calendarRouter.use(authenticate);
calendarRouter.get("/", calendarController.list);
calendarRouter.get("/desk", calendarController.desk);
calendarRouter.post("/meetings", calendarController.schedule);
calendarRouter.post("/meetings/:id/invitations", calendarController.invitations);
calendarRouter.post("/availability", calendarController.availability);
calendarRouter.post("/calendars/:id/sharing", calendarController.share);
calendarRouter.post("/calendars/:id/unshare", calendarController.unshare);
