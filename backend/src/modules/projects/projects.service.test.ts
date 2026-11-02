import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { initStore } from "../../data/store.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { projectsService } from "./projects.service.js";

function user(role: Role, assignedProjectIds = ["ksp-hills", "io-ops", "social-intake", "ai-overview"]): PublicUser {
  return {
    id: role,
    email: `${role}@impactone.example`,
    name: role,
    role,
    title: role,
    assignedProjectIds,
    permissions: permissionsFor(role),
  };
}

describe("projects service", () => {
  before(async () => {
    await initStore();
  });

  it("returns project-scoped collections and empty team-live lists without tokens", async () => {
    const detail = await projectsService.getById(user("manager"), "ksp-hills");
    assert.equal(detail.project.id, "ksp-hills");
    assert.ok(detail.tasks.every((task) => task.projectId === "ksp-hills"));
    assert.ok(detail.documents.every((doc) => doc.projectId === "ksp-hills"));
    assert.ok(detail.followUps.every((item) => item.projectId === "ksp-hills"));
    assert.ok(detail.milestones.every((item) => item.projectId === "ksp-hills"));
    assert.ok(detail.consultants.every((item) => item.projectId === "ksp-hills"));
    assert.equal(detail.teamLiveTasks.length, 0);
    assert.equal(detail.teamLiveDocuments.length, 0);
    assert.ok(detail.taskNote.length > 0);
    assert.ok(detail.documentNote.length > 0);
  });

  it("hides projects the consultant cannot see", async () => {
    await assert.rejects(
      () => projectsService.getById(user("consultant", ["ksp-hills"]), "io-ops"),
      /Project not found/,
    );
  });
});
