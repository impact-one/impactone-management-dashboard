import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { systemMapController } from "./system-map.controller.js";

export const systemMapRouter = Router();

systemMapRouter.use(authenticate);
systemMapRouter.get("/", systemMapController.get);
