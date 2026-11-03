import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { otterService } from "./otter.service.js";

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

describe("otter desk", () => {
  it("hides meeting notes from consultants", async () => {
    const result = await otterService.desk(user("consultant"));
    assert.equal(result.desk.meetings.length, 0);
    assert.equal(result.desk.canRead, false);
    assert.match(result.note, /executive and manager/i);
  });

  it("asks staff to confirm consent and sharing", async () => {
    const result = await otterService.desk(user("manager"));
    assert.match(result.desk.implementationNote, /consent/i);
    assert.match(result.desk.implementationNote, /sharing/i);
    assert.ok(result.desk.consentChecks.some((check) => /transcribed/i.test(check.label)));
    assert.ok(result.desk.consentChecks.some((check) => /audience/i.test(check.label)));
    if (!result.desk.connected) {
      assert.ok(result.desk.meetings.every((meeting) => meeting.source.origin === "sample"));
    }
  });
});
