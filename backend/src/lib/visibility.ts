import type { Project, PublicUser } from "../types/domain.js";

export function canSeeProject(user: PublicUser, project: Project): boolean {
  if (!project.visibleTo.includes(user.role)) return false;
  if (user.role === "consultant" && !user.assignedProjectIds.includes(project.id)) return false;
  return true;
}

export function filterByProject<T extends { projectId: string | null }>(
  user: PublicUser,
  rows: T[],
  projects: Project[],
): T[] {
  const allowed = new Set(projects.filter((project) => canSeeProject(user, project)).map((project) => project.id));
  return rows.filter((row) => {
    if (row.projectId === null) return user.role === "executive" || user.role === "manager";
    return allowed.has(row.projectId);
  });
}
