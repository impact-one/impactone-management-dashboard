import { store } from "../../data/store.js";
import type { Consultant, PublicUser } from "../../types/domain.js";
import { canSeeProject } from "../../lib/visibility.js";

export function presentConsultants(user: PublicUser, rows: Consultant[]): Consultant[] {
  const visible = rows.filter((row) => {
    const project = store.projects.find((item) => item.id === row.projectId);
    return project ? canSeeProject(user, project) : false;
  });
  if (user.permissions.viewConsultantFees) return visible;
  return visible.map((row) => ({ ...row, feeAmount: null }));
}

export class ConsultantsService {
  list(user: PublicUser, projectId?: string) {
    const rows = projectId ? store.consultants.filter((item) => item.projectId === projectId) : store.consultants;
    return presentConsultants(user, rows);
  }
}

export const consultantsService = new ConsultantsService();
