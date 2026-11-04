import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { assignTaskProject } from "../../lib/assignProject.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser, Task } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";
import { fetchClickUpFile, readClickUpComments, readClickUpTask, clickUpClient } from "../integrations/clients/clickup.client.js";
import { isAllowedFileHop, presentFile, safeFilename } from "../integrations/clients/clickup.map.js";

export class TasksService {
  async list(user: PublicUser, projectId?: string) {
    let items = filterByProject(user, store.tasks, store.projects);
    let statuses: string[] = [];
    let note = "ClickUp is not connected. Showing reference task data.";

    if (isStaff(user)) {
      const live = await clickUpClient.get();
      if (live.ok && live.data) {
        items = live.data.tasks.map((task) => assignTaskProject(task, store.projects));
        statuses = live.data.statusNames;
        note = live.data.tasks.length
          ? "Statuses are the names stored in ClickUp."
          : "ClickUp is connected. Status names below are the names on the ClickUp list. That list has no tasks yet.";
      } else if (live.configured && !live.ok) {
        note = `${live.message} Showing reference tasks instead.`;
      }
    } else {
      note = "Live ClickUp tasks are limited to executive and manager roles.";
    }

    if (projectId) items = items.filter((task) => task.projectId === projectId);
    return { items, note, statuses };
  }

  async get(user: PublicUser, id: string): Promise<Task | null> {
    const listed = await this.list(user);
    const known = listed.items.find((task) => task.id === id) ?? null;
    if (!id.startsWith("clickup-") || !isStaff(user)) return known;

    try {
      const live = await readClickUpTask(id);
      if (!live) return known;
      let comments = known?.comments ?? [];
      try {
        comments = await readClickUpComments(id);
      } catch {
        comments = live.comments;
      }
      return assignTaskProject(
        {
          ...live,
          projectId: known?.projectId ?? live.projectId,
          projectName: known?.projectName || live.projectName,
          comments,
        },
        store.projects,
      );
    } catch {
      return known;
    }
  }

  async file(user: PublicUser, taskId: string, fileId: string, thumb: boolean) {
    const task = await this.get(user, taskId);
    if (!task) throw new AppError(404, "Task not found.");
    const file = task.attachments.find((item) => item.id === fileId);
    if (!file) throw new AppError(404, "File not found.");
    const target = thumb ? file.thumbnailUrl ?? file.url : file.url;
    if (!target || !isAllowedFileHop(target, true)) throw new AppError(404, "File not found.");
    const downloaded = await fetchClickUpFile(target);
    const presentation = presentFile(file, downloaded.contentType);
    return {
      body: downloaded.body,
      filename: safeFilename(file.title),
      ...presentation,
    };
  }
}

export const tasksService = new TasksService();
