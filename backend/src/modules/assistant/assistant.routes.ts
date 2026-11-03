import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { assistantController } from "./assistant.controller.js";

export const assistantRouter = Router();

assistantRouter.use(authenticate);
assistantRouter.get("/desk", assistantController.desk);
assistantRouter.post("/runs", assistantController.run);
