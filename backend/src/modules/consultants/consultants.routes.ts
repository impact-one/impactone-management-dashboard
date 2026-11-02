import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { consultantsController } from "./consultants.controller.js";

export const consultantsRouter = Router();

consultantsRouter.use(authenticate);
consultantsRouter.get("/", consultantsController.list);
