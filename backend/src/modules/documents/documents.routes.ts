import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { documentsController } from "./documents.controller.js";

export const documentsRouter = Router();

documentsRouter.use(authenticate);
documentsRouter.get("/", documentsController.list);
documentsRouter.get("/desk", documentsController.desk);
documentsRouter.post("/files", documentsController.create);
documentsRouter.post("/files/:id/sharing", documentsController.share);
documentsRouter.post("/files/:id/unshare", documentsController.unshare);
