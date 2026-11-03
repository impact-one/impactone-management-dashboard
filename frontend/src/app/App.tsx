import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { AiToolsPage } from "../pages/AiToolsPage";
import { AssistantPage } from "../pages/AssistantPage";
import { ClaudePage } from "../pages/ClaudePage";
import { AuditPage } from "../pages/AuditPage";
import { CalendarPage } from "../pages/CalendarPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { FollowUpsPage } from "../pages/FollowUpsPage";
import { IntegrationsPage } from "../pages/IntegrationsPage";
import { IocPage } from "../pages/IocPage";
import { LoginPage } from "../pages/LoginPage";
import { MeetingsPage } from "../pages/MeetingsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OverviewPage } from "../pages/OverviewPage";
import { PilotPage } from "../pages/PilotPage";
import { ProjectPage } from "../pages/ProjectPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { SlackPage } from "../pages/SlackPage";
import { SystemMapPage } from "../pages/SystemMapPage";
import { TasksPage } from "../pages/TasksPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./AuthContext";
import { RequireAuth } from "./RequireAuth";

export function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="follow-ups" element={<FollowUpsPage />} />
              <Route path="slack" element={<SlackPage />} />
              <Route path="ioc" element={<IocPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="claude" element={<ClaudePage />} />
              <Route path="ai" element={<AiToolsPage />} />
              <Route path="map" element={<SystemMapPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="pilot" element={<PilotPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
}
