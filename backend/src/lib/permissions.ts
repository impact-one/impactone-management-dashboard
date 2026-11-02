import type { Permissions, PublicUser, Role } from "../types/domain.js";

export function permissionsFor(role: Role): Permissions {
  const staff = role === "executive" || role === "manager";
  return {
    viewBudget: staff,
    viewBudgetAmounts: staff,
    viewConsultantFees: staff,
    viewAudit: staff,
  };
}

export function isStaff(user: PublicUser): boolean {
  return user.role === "executive" || user.role === "manager";
}
