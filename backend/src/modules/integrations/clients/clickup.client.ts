import { env } from "../../../config/env.js";
import type { Task } from "../../../types/domain.js";
import { readJson, ReadOnlyClient } from "./readOnlyClient.js";

const TASK_CAP = 100;

export interface ClickUpRead {
  tasks: Task[];
  statusNames: string[];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function named(value: unknown): string {
  if (!value || typeof value !== "object" || !("name" in value)) return "";
  return text((value as { name?: unknown }).name);
}

function records(value: unknown, key: string): Record<string, unknown>[] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const list = record[key];
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function toTask(task: Record<string, unknown>, place: string, index: number): Task {
  const statusRecord =
    task.status && typeof task.status === "object" ? (task.status as { status?: unknown; type?: unknown }) : {};
  const statusName = typeof task.status === "string" ? text(task.status) : text(statusRecord.status);
  const statusType = text(statusRecord.type).toLowerCase();
  const dueRaw = text(task.due_date);
  const dueDate = /^\d+$/.test(dueRaw) ? new Date(Number(dueRaw)).toISOString().slice(0, 10) : null;
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const first = assignees[0] && typeof assignees[0] === "object" ? (assignees[0] as { username?: unknown }).username : "";
  const href = text(task.url);
  return {
    id: `clickup-${text(task.id, String(index))}`,
    projectId: null,
    projectName: place || "ClickUp",
    title: text(task.name, "Untitled ClickUp task"),
    owner: text(first, "Unassigned"),
    responsibility: "Read from ClickUp. This dashboard did not change the task.",
    status: statusName || statusType || "—",
    closed: statusType === "closed" || statusType === "done",
    dueDate,
    source: {
      origin: "live",
      system: "ClickUp",
      detail: "Read-only. Status is the name stored on the ClickUp task.",
    },
    href: href || null,
  };
}

async function statusNamesFor(list: Record<string, unknown>, headers: Record<string, string>): Promise<string[]> {
  const current = records(list, "statuses")
    .map((status) => text(status.status))
    .filter(Boolean);
  if (current.length > 0) return current;
  const listId = text(list.id);
  if (!listId) return [];
  const detail = await readJson(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}`, headers);
  return records(detail, "statuses")
    .map((status) => text(status.status))
    .filter(Boolean);
}

async function tasksFor(listId: string, headers: Record<string, string>, place: string, collected: Task[]) {
  let page = 0;
  for (;;) {
    const payload = await readJson(
      `https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task?archived=false&include_closed=true&subtasks=true&page=${page}`,
      headers,
    );
    const pageTasks = records(payload, "tasks");
    for (const task of pageTasks) {
      if (collected.length >= TASK_CAP) return;
      collected.push(toTask(task, place, collected.length));
    }
    const last = Boolean(payload && typeof payload === "object" && (payload as { last_page?: unknown }).last_page);
    if (last || pageTasks.length === 0 || collected.length >= TASK_CAP) return;
    page += 1;
  }
}

export const clickUpClient = new ReadOnlyClient<ClickUpRead>({
  isConfigured: () => Boolean(env.clickupToken && env.clickupTeamId),
  missingMessage: "ClickUp token or team id is not set. The task list stays on labelled sample data.",
  load: async () => {
    const headers = { Authorization: env.clickupToken ?? "" };
    const teamId = encodeURIComponent(env.clickupTeamId ?? "");
    const spacesPayload = await readJson(`https://api.clickup.com/api/v2/team/${teamId}/space?archived=false`, headers);
    const tasks: Task[] = [];
    const statusNames: string[] = [];
    const seen = new Set<string>();

    for (const space of records(spacesPayload, "spaces")) {
      const spaceId = text(space.id);
      if (!spaceId) continue;
      const spaceName = named(space);
      const [folderPayload, directPayload] = await Promise.all([
        readJson(`https://api.clickup.com/api/v2/space/${encodeURIComponent(spaceId)}/folder?archived=false`, headers),
        readJson(`https://api.clickup.com/api/v2/space/${encodeURIComponent(spaceId)}/list?archived=false`, headers),
      ]);
      const lists = [
        ...records(folderPayload, "folders").flatMap((folder) =>
          records(folder, "lists").map((list) => ({ list, folderName: named(folder) })),
        ),
        ...records(directPayload, "lists").map((list) => ({ list, folderName: "" })),
      ];

      for (const entry of lists) {
        for (const name of await statusNamesFor(entry.list, headers)) {
          if (seen.has(name)) continue;
          seen.add(name);
          statusNames.push(name);
        }
        const listId = text(entry.list.id);
        if (!listId || tasks.length >= TASK_CAP) continue;
        const place = [spaceName, entry.folderName, named(entry.list)].filter(Boolean).join(" · ");
        await tasksFor(listId, headers, place, tasks);
      }
    }

    return { tasks, statusNames };
  },
});
