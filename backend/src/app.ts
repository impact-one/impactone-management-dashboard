import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { auditTrail } from "./middleware/audit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { aiToolsRouter } from "./modules/ai-tools/ai-tools.routes.js";
import { assistantRouter } from "./modules/assistant/assistant.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { automationsRouter } from "./modules/automations/automations.routes.js";
import { budgetsRouter } from "./modules/budgets/budgets.routes.js";
import { calendarRouter } from "./modules/calendar/calendar.routes.js";
import { consultantsRouter } from "./modules/consultants/consultants.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";
import { followUpsRouter } from "./modules/follow-ups/follow-ups.routes.js";
import { integrationsRouter } from "./modules/integrations/integrations.routes.js";
import { milestonesRouter } from "./modules/milestones/milestones.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { proposalRouter } from "./modules/proposal/proposal.routes.js";
import { slackRouter } from "./modules/slack/slack.routes.js";
import { systemMapRouter } from "./modules/system-map/system-map.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(auditTrail);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "impact-management-dashboard", liveWritesEnabled: false });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/follow-ups", followUpsRouter);
  app.use("/api/milestones", milestonesRouter);
  app.use("/api/consultants", consultantsRouter);
  app.use("/api/budgets", budgetsRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/ai-tools", aiToolsRouter);
  app.use("/api/assistant", assistantRouter);
  app.use("/api/automations", automationsRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api/slack", slackRouter);
  app.use("/api/system-map", systemMapRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/proposal", proposalRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });
  app.use(errorHandler);
  return app;
}
