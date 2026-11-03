import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { otterController } from "./otter.controller.js";

export const otterRouter = Router();

otterRouter.use(authenticate);
otterRouter.get("/desk", otterController.desk);
