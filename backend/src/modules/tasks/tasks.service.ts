import { store } from "../../data/store.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";
import { clickUpClient } from "../integrations/clients/clickup.client.js";

export class TasksService {
  async list(user: PublicUser, projectId?: string) {
    let items = filterByProject(user, store.tasks, store.projects);
    let statuses: string[] = [];
    let note = "ClickUp is not connected. Showing reference task data.";

    if (isStaff(user)) {
      const live = await clickUpClient.get();
      if (live.ok && live.data) {
        items = live.data.tasks;
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
}

export const tasksService = new TasksService();
