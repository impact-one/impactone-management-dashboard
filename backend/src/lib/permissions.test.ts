import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsFor } from "./permissions.js";

describe("permissions", () => {
  it("keeps budget amounts and the audit log with managers", () => {
    const permissions = permissionsFor("manager");
    assert.equal(permissions.viewBudgetAmounts, true);
    assert.equal(permissions.viewAudit, true);
  });

  it("hides money and the audit log from consultants and viewers", () => {
    for (const role of ["consultant", "viewer"] as const) {
      const permissions = permissionsFor(role);
      assert.equal(permissions.viewBudget, false);
      assert.equal(permissions.viewBudgetAmounts, false);
      assert.equal(permissions.viewConsultantFees, false);
      assert.equal(permissions.viewAudit, false);
    }
  });
});
