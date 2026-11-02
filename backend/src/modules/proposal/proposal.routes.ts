import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { proposalController } from "./proposal.controller.js";

export const proposalRouter = Router();

proposalRouter.use(authenticate);
proposalRouter.get("/", proposalController.get);
