import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { slackController } from "./slack.controller.js";

export const slackRouter = Router();

slackRouter.use(authenticate);
slackRouter.get("/", slackController.list);
slackRouter.get("/desk", slackController.desk);
slackRouter.get("/files/:id/preview", slackController.preview);
slackRouter.post("/messages", slackController.post);
