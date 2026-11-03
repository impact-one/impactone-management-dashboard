import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { AiToolsPage } from "../pages/AiToolsPage";
import { AssistantPage } from "../pages/AssistantPage";
import { ClaudePage } from "../pages/ClaudePage";
import { CalendarPage } from "../pages/CalendarPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { FollowUpsPage } from "../pages/FollowUpsPage";
import { LoginPage } from "../pages/LoginPage";
import { MeetingsPage } from "../pages/MeetingsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OverviewPage } from "../pages/OverviewPage";
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
              <Route path="meetings" element={<Navigate to="/ai/otter" replace />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="follow-ups" element={<FollowUpsPage />} />
              <Route path="slack" element={<SlackPage />} />
              <Route path="assistant" element={<Navigate to="/ai/chatgpt" replace />} />
              <Route path="claude" element={<Navigate to="/ai/claude" replace />} />
              <Route path="ai" element={<AiToolsPage />} />
              <Route path="ai/otter" element={<MeetingsPage />} />
              <Route path="ai/chatgpt" element={<AssistantPage />} />
              <Route path="ai/claude" element={<ClaudePage />} />
              <Route path="map" element={<SystemMapPage />} />
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
