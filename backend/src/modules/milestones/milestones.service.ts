import { store } from "../../data/store.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";

export class MilestonesService {
  list(user: PublicUser, projectId?: string) {
    const items = filterByProject(user, store.milestones, store.projects);
    return projectId ? items.filter((item) => item.projectId === projectId) : items;
  }
}

export const milestonesService = new MilestonesService();
