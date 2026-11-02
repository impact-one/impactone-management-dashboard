import { store } from "../../data/store.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";
import { clickUpClient } from "../integrations/clients/clickup.client.js";

export class TasksService {
  async list(user: PublicUser, projectId?: string) {
    let items = filterByProject(user, store.tasks, store.projects);
    let note = "ClickUp is not connected. Rows keep their own Sample, Documented, or Needs review label.";

    if (isStaff(user)) {
      const live = await clickUpClient.get();
      if (live.ok && live.data && live.data.length > 0) {
        items = [...live.data, ...items.filter((task) => task.source.system !== "ClickUp")];
        note = "Live ClickUp tasks are shown to executive and manager roles. Sample ClickUp rows are hidden while that read succeeds.";
      } else if (live.configured && !live.ok) {
        note = `${live.message} Labelled tasks are shown instead.`;
      }
    } else {
      note = "The live ClickUp list is limited to executive and manager roles because the API returns team-wide tasks.";
    }

    if (projectId) items = items.filter((task) => task.projectId === projectId);
    return { items, note };
  }
}

export const tasksService = new TasksService();
