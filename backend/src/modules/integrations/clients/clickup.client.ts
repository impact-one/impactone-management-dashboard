import { env } from "../../../config/env.js";
import { AppError } from "../../../lib/AppError.js";
import type { Task, TaskComment } from "../../../types/domain.js";
import { isAllowedFileHop, mapClickUpComments, mapClickUpTask } from "./clickup.map.js";
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
  return mapClickUpTask(task, place, index);
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
      `https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task?archived=false&include_closed=true&subtasks=true&include_markdown_description=true&page=${page}`,
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

function clickUpHeaders(): Record<string, string> {
  return { Authorization: env.clickupToken ?? "" };
}

function clickUpId(taskId: string): string {
  return taskId.startsWith("clickup-") ? taskId.slice("clickup-".length) : taskId;
}

export async function readClickUpTask(taskId: string): Promise<Task | null> {
  if (!env.clickupToken) return null;
  const payload = await readJson(
    `https://api.clickup.com/api/v2/task/${encodeURIComponent(clickUpId(taskId))}?include_markdown_description=true&include_subtasks=true`,
    clickUpHeaders(),
  );
  if (!payload || typeof payload !== "object") return null;
  const task = payload as Record<string, unknown>;
  const place = [named(task.space), named(task.folder), named(task.list)].filter(Boolean).join(" · ");
  return mapClickUpTask(task, place, 0);
}

export async function readClickUpComments(taskId: string): Promise<TaskComment[]> {
  if (!env.clickupToken) return [];
  const payload = await readJson(
    `https://api.clickup.com/api/v2/task/${encodeURIComponent(clickUpId(taskId))}/comment`,
    clickUpHeaders(),
  );
  return mapClickUpComments(payload);
}

const FILE_CAP = 20 * 1024 * 1024;

export async function fetchClickUpFile(url: string): Promise<{ body: Buffer; contentType: string | null }> {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isAllowedFileHop(current, hop === 0)) throw new AppError(404, "File not found.");
    let response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });
    if (hop === 0 && (response.status === 401 || response.status === 403) && env.clickupToken) {
      await response.body?.cancel();
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { Authorization: env.clickupToken },
      });
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new AppError(502, "Attachment could not be read.");
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new AppError(502, "Attachment could not be read.");
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > FILE_CAP) throw new AppError(413, "File is too large to show here.");
      chunks.push(buf);
    }
    return { body: Buffer.concat(chunks), contentType: response.headers.get("content-type") };
  }
  throw new AppError(502, "Attachment could not be read.");
}
