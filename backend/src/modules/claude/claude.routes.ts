import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { claudeController } from "./claude.controller.js";

export const claudeRouter = Router();

claudeRouter.use(authenticate);
claudeRouter.get("/desk", claudeController.desk);
claudeRouter.post("/runs", claudeController.run);
