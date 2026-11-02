import { store } from "../../data/store.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";

export class FollowUpsService {
  list(user: PublicUser, projectId?: string) {
    const items = filterByProject(user, store.followUps, store.projects);
    return projectId ? items.filter((item) => item.projectId === projectId) : items;
  }
}

export const followUpsService = new FollowUpsService();
