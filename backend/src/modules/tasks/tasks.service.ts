import { store } from "../../data/store.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";
import { clickUpClient } from "../integrations/clients/clickup.client.js";

export class TasksService {
  async list(user: PublicUser, projectId?: string) {
    let items = filterByProject(user, store.tasks, store.projects);
    let note = "ClickUp is not connected. Showing reference task data.";

    if (isStaff(user)) {
      const live = await clickUpClient.get();
      if (live.ok && live.data && live.data.length > 0) {
        items = [...live.data, ...items.filter((task) => task.source.system !== "ClickUp")];
        note = "Live ClickUp tasks for executive and manager roles.";
      } else if (live.ok && live.configured) {
        note = "ClickUp is connected, but no team tasks were returned. Showing reference rows.";
      } else if (live.configured && !live.ok) {
        note = `${live.message} Showing reference tasks instead.`;
      }
    } else {
      note = "Live ClickUp tasks are limited to executive and manager roles.";
    }

    if (projectId) items = items.filter((task) => task.projectId === projectId);
    return { items, note };
  }
}

export const tasksService = new TasksService();
