import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { auditController } from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.use(authenticate, authorize("executive", "manager"));
auditRouter.get("/", auditController.list);
