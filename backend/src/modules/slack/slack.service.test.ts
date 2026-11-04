import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../lib/AppError.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { slackService } from "./slack.service.js";

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

describe("slack desk", () => {
  it("hides live channel traffic from consultants", async () => {
    const listed = await slackService.list(user("consultant"));
    assert.equal(listed.items.length, 0);
    assert.match(listed.note, /executive and manager/i);
  });

  it("refuses a viewer who tries to post", async () => {
    await assert.rejects(
      () => slackService.post(user("viewer"), { text: "Hello" }),
      (error) => statusOf(error) === 403,
    );
  });

  it("refuses a consultant who tries to open a file preview", async () => {
    await assert.rejects(
      () => slackService.preview(user("consultant"), "F0123ABCD"),
      (error) => statusOf(error) === 403,
    );
  });

  it("rejects an empty update", async () => {
    await assert.rejects(
      () => slackService.post(user("manager"), { text: "   " }),
      (error) => statusOf(error) === 400 || statusOf(error) === 503,
    );
  });
});
