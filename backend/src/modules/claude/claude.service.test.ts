import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../lib/AppError.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { findConfidential } from "../assistant/assistant.guard.js";
import { claudeService } from "./claude.service.js";

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

function statusOf(error: unknown) {
  assert.ok(error instanceof AppError);
  return error.status;
}

describe("claude document assistant", () => {
  it("blocks an Anthropic key before it can be sent", () => {
    assert.match(findConfidential("ANTHROPIC_API_KEY=sk-ant-secret") ?? "", /secret|API key/i);
    assert.equal(findConfidential("Review the workshop notes and list open questions."), null);
  });

  it("shows the desk to a viewer without a run button", async () => {
    const result = await claudeService.desk(user("viewer"));
    assert.equal(result.desk.canRun, false);
    assert.equal(result.desk.provider, "Claude");
    assert.equal(result.desk.workflows.length, 4);
    assert.match(result.note, /executive and manager/i);
  });

  it("refuses a consultant who tries to run a workflow", async () => {
    await assert.rejects(
      () =>
        claudeService.run(user("consultant"), {
          workflow: "review",
          brief: "Review the workshop notes and list the open questions.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 403,
    );
  });

  it("rejects a source that contains a secret", async () => {
    await assert.rejects(
      () =>
        claudeService.run(user("manager"), {
          workflow: "write",
          brief: "Write this up and include sk-testkey1234567890 in the draft.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 400,
    );
  });

  it("rejects a run that was not acknowledged", async () => {
    await assert.rejects(
      () =>
        claudeService.run(user("manager"), {
          workflow: "synthesize",
          brief: "Synthesize the workshop notes into one short account.",
          acknowledged: false,
        }),
      (error) => statusOf(error) === 400,
    );
  });

  it("keeps the form available for a manager when the key is not live", async () => {
    const desk = await claudeService.desk(user("manager"));
    assert.equal(desk.desk.canRun, true);
  });

  it("stays off until an Anthropic API key is set", async () => {
    const desk = await claudeService.desk(user("manager"));
    if (desk.desk.connected) return;
    await assert.rejects(
      () =>
        claudeService.run(user("manager"), {
          workflow: "review",
          brief: "Review the workshop notes and list the open questions.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 503,
    );
  });
});
