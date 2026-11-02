import { env } from "../../../config/env.js";
import type { Task, TaskStatus } from "../../../types/domain.js";
import { readJson, ReadOnlyClient } from "./readOnlyClient.js";

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mapStatus(value: string): TaskStatus {
  const status = value.toLowerCase();
  if (status.includes("progress")) return "in-progress";
  if (status.includes("block")) return "blocked";
  if (status.includes("complete") || status.includes("closed") || status.includes("done")) return "done";
  return "open";
}

export const clickUpClient = new ReadOnlyClient<Task[]>({
  isConfigured: () => Boolean(env.clickupToken && env.clickupTeamId),
  missingMessage: "ClickUp token or team id is not set. The task list stays on labelled sample data.",
  load: async () => {
    const teamId = encodeURIComponent(env.clickupTeamId ?? "");
    const payload = await readJson(`https://api.clickup.com/api/v2/team/${teamId}/task?page=0&subtasks=false`, {
      Authorization: env.clickupToken ?? "",
    });
    const record = payload && typeof payload === "object" ? (payload as { tasks?: unknown }) : {};
    const tasks = Array.isArray(record.tasks) ? record.tasks : [];
    return tasks.slice(0, 20).map((item, index) => {
      const task = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const statusRecord = task.status && typeof task.status === "object" ? (task.status as { status?: unknown }) : {};
      const dueRaw = text(task.due_date);
      const dueDate = /^\d+$/.test(dueRaw) ? new Date(Number(dueRaw)).toISOString().slice(0, 10) : null;
      const assignees = Array.isArray(task.assignees) ? task.assignees : [];
      const first = assignees[0] && typeof assignees[0] === "object" ? (assignees[0] as { username?: unknown }).username : "";
      const href = text(task.url);
      return {
        id: `clickup-${text(task.id, String(index))}`,
        projectId: null,
        projectName: "ClickUp",
        title: text(task.name, "Untitled ClickUp task"),
        owner: text(first, "Unassigned"),
        responsibility: "Read from ClickUp. This dashboard did not change the task.",
        status: mapStatus(text(statusRecord.status, "open")),
        dueDate,
        source: {
          origin: "live" as const,
          system: "ClickUp",
          detail: "Read-only team task list. Visible to executive and manager roles because the API is team-wide.",
        },
        href: href || null,
      };
    });
  },
});
