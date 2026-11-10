import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { findConfidential } from "./assistant.guard.js";
import { assistantService } from "./assistant.service.js";

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

describe("chatgpt assistant", () => {
  it("blocks tokens and passwords before they can be sent", () => {
    assert.match(findConfidential("use sk-testkey1234567890 please") ?? "", /API key/i);
    assert.match(findConfidential("SLACK_BOT_TOKEN=xoxb-secret") ?? "", /secret|Slack/i);
    assert.equal(findConfidential("Summarise the meeting notes from Tuesday."), null);
  });

  it("shows the desk to a viewer without a run button", async () => {
    const result = await assistantService.desk(user("viewer"));
    assert.equal(result.desk.canRun, false);
    assert.equal(result.desk.provider, "ChatGPT");
    assert.equal(result.desk.workflows.length, 0);
    assert.match(result.note, /executive and manager/i);
  });

  it("refuses a consultant who tries to run a workflow", async () => {
    await assert.rejects(
      () =>
        assistantService.run(user("consultant"), {
          brief: "Summarise the workshop notes from Tuesday.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 403,
    );
  });

  it("rejects a note that contains a secret", async () => {
    await assert.rejects(
      () =>
        assistantService.run(user("manager"), {
          brief: "Draft a note and include sk-testkey1234567890 in it.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 400,
    );
  });

  it("rejects a run that was not acknowledged", async () => {
    await assert.rejects(
      () =>
        assistantService.run(user("manager"), {
          brief: "Summarise the workshop notes from Tuesday.",
          acknowledged: false,
        }),
      (error) => statusOf(error) === 400,
    );
  });

  it("stays off until the Make webhook is set", async () => {
    const desk = await assistantService.desk(user("manager"));
    if (env.makeWebhookUrl && env.makeWebhookApiKey) {
      assert.equal(desk.desk.connected, true);
      return;
    }
    assert.equal(desk.desk.connected, false);
    await assert.rejects(
      () =>
        assistantService.run(user("manager"), {
          brief: "Summarise the workshop notes from Tuesday.",
          acknowledged: true,
        }),
      (error) => statusOf(error) === 503,
    );
  });

  it("sends the question to the Make webhook and returns its reply", async () => {
    if (!env.makeWebhookUrl || !env.makeWebhookApiKey) return;
    const original = globalThis.fetch;
    let seenUrl = "";
    let seenHeader = "";
    let seenBody = "";
    globalThis.fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      seenUrl = String(input);
      seenHeader = headers.get("x-make-apikey") ?? "";
      seenBody = String(init?.body ?? "");
      return new Response("Your next meeting is Test on Monday.", { status: 200 });
    };
    try {
      const result = await assistantService.run(user("manager"), {
        brief: "When is my next meeting?",
        acknowledged: true,
      });
      assert.equal(seenUrl, env.makeWebhookUrl);
      assert.equal(seenHeader, env.makeWebhookApiKey);
      assert.equal(seenBody, JSON.stringify({ question: "When is my next meeting?" }));
      assert.equal(result.intent, "chat");
      assert.equal(result.intentLabel, "Chat");
      assert.equal(result.model, null);
      assert.equal(result.output, "Your next meeting is Test on Monday.");
    } finally {
      globalThis.fetch = original;
    }
  });
});
