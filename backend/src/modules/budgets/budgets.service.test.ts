import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { initStore } from "../../data/store.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { budgetsService } from "./budgets.service.js";

function user(role: Role): PublicUser {
  return {
    id: role,
    email: `${role}@impactone.example`,
    name: role,
    role,
    title: role,
    assignedProjectIds: ["ksp-hills"],
    permissions: permissionsFor(role),
  };
}

describe("budgets service", () => {
  before(async () => {
    await initStore();
  });

  it("returns the labelled sample budget to a manager", () => {
    const budget = budgetsService.get(user("manager"));
    assert.equal(budget.source.origin, "sample");
    assert.equal(budget.total, 5000000);
  });

  it("refuses a viewer", () => {
    assert.throws(() => budgetsService.get(user("viewer")), /Budget overview/);
  });
});
