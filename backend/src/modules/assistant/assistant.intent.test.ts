import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyIntent } from "./assistant.intent.js";

describe("assistant intent", () => {
  it("reads a meeting question as a desk lookup", () => {
    const result = classifyIntent("When is my next meeting?");
    assert.equal(result?.intent, "overview");
    assert.equal(result?.lookup, "meeting");
  });

  it("reads a new-message question as Slack and ClickUp", () => {
    const result = classifyIntent("whats the new message i receive");
    assert.equal(result?.intent, "overview");
    assert.equal(result?.lookup, "message");
  });

  it("treats a summary as analysis", () => {
    const result = classifyIntent("Summarise the workshop notes from Tuesday.");
    assert.equal(result?.intent, "analyze");
    assert.equal(result?.writing, "summarize");
  });

  it("refuses a request to post", () => {
    const result = classifyIntent("post this to Slack for the team");
    assert.equal(result?.intent, "automate");
    assert.equal(result?.refuseWrite, true);
  });

  it("keeps a draft as writing", () => {
    const result = classifyIntent("Draft a short welcome note for the Monday meeting.");
    assert.equal(result?.intent, "draft");
    assert.equal(result?.writing, "draft");
  });

  it("treats a greeting as conversation", () => {
    assert.equal(classifyIntent("hi how are u")?.intent, "chat");
    assert.equal(classifyIntent("hello how are you")?.intent, "chat");
    assert.equal(classifyIntent("hi how are u")?.lookup, undefined);
  });

  it("reads a latest-task question as that person's task", () => {
    const result = classifyIntent("latest task of mine");
    assert.equal(result?.intent, "overview");
    assert.equal(result?.lookup, "tasks");
    assert.equal(result?.latest, true);
    assert.equal(result?.mine, true);
  });
});
