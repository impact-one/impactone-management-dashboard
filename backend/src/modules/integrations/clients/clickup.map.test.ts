import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tasks } from "../../../data/seed.js";
import { isAllowedFileHop, mapClickUpComments, mapClickUpTask, presentFile } from "./clickup.map.js";

describe("ClickUp task mapping", () => {
  it("keeps description, priority, people, dates, and files from a task payload", () => {
    const task = mapClickUpTask(
      {
        id: "abc",
        name: "Write brief",
        text_content: "Line one\nLine two",
        markdown_description: "![shot](https://t1.clickup-attachments.com/embed.png)",
        status: { status: "in progress", type: "custom" },
        priority: { id: "2", priority: "high" },
        due_date: "1761955200000",
        date_updated: "1761868800000",
        date_created: "1761000000000",
        assignees: [{ username: "Saray" }, { username: "Kulde" }],
        url: "https://app.clickup.com/t/abc",
        list: { name: "Delivery" },
        parent: "parent1",
        tags: [{ name: "IOC" }, { name: "IOC" }],
        attachments: [
          {
            id: "img1",
            title: "photo.png",
            extension: "png",
            url: "https://t1.p.clickup-attachments.com/photo.png",
            thumbnail_small: "https://t1.p.clickup-attachments.com/small.png",
          },
          {
            id: "doc1",
            title: "notes.pdf",
            extension: "pdf",
            url: "https://t1.p.clickup-attachments.com/notes.pdf",
          },
          { id: "bad", title: "evil.png", extension: "png", url: "javascript:alert(1)" },
        ],
        checklists: [{ id: "cl", items: [{ id: "i1", name: "Draft", resolved: true }] }],
      },
      "Space · Delivery",
      0,
    );

    assert.equal(task.id, "clickup-abc");
    assert.equal(task.title, "Write brief");
    assert.equal(task.description, "Line one\nLine two");
    assert.equal(task.priority, "high");
    assert.equal(task.status, "in progress");
    assert.equal(task.closed, false);
    assert.equal(task.owner, "Saray, Kulde");
    assert.equal(task.listName, "Delivery");
    assert.equal(task.projectName, "Space · Delivery");
    assert.equal(task.parentId, "clickup-parent1");
    assert.deepEqual(task.tags, ["IOC"]);
    assert.equal(task.dueDate, new Date(1761955200000).toISOString().slice(0, 10));
    assert.equal(task.updatedAt, new Date(1761868800000).toISOString());
    assert.equal(task.checklist.length, 1);
    assert.equal(task.checklist[0]?.resolved, true);
    assert.equal(task.attachments.filter((file) => file.kind === "image").length, 3);
    assert.equal(task.attachments.find((file) => file.id === "doc1")?.kind, "file");
    assert.equal(task.attachments.find((file) => file.id === "bad")?.url, null);
    assert.equal(JSON.stringify(task.attachments).includes("javascript:"), false);
    assert.equal(task.attachments.some((file) => file.url?.endsWith("/embed.png")), true);
  });

  it("reads comment text and drops empty notes", () => {
    const comments = mapClickUpComments({
      comments: [
        {
          id: "1",
          comment_text: "Hello there",
          user: { username: "Saray" },
          date: "1761868800000",
        },
        { id: "2", comment: [{ text: "From " }, { text: "the rich text" }], user: { email: "kulde@impactone.example" } },
        { id: "3", comment_text: "   " },
      ],
    });
    assert.equal(comments.length, 2);
    assert.equal(comments[0]?.author, "Saray");
    assert.equal(comments[0]?.text, "Hello there");
    assert.equal(comments[1]?.text, "From the rich text");
    assert.equal(comments[1]?.author, "kulde@impactone.example");
  });

  it("only proxies ClickUp attachment hosts", () => {
    assert.equal(isAllowedFileHop("https://t333.p.clickup-attachments.com/photo.png", true), true);
    assert.equal(isAllowedFileHop("https://attachments.clickup.com/photo.png", true), true);
    assert.equal(isAllowedFileHop("https://api.clickup.com/api/v2/task", true), false);
    assert.equal(isAllowedFileHop("http://t333.clickup-attachments.com/photo.png", true), false);
    assert.equal(isAllowedFileHop("https://169.254.169.254/latest", true), false);
    assert.equal(isAllowedFileHop("https://files.example.com/a.png", true), false);
    assert.equal(isAllowedFileHop("https://bucket.s3.amazonaws.com/photo.png", false), true);
    assert.equal(isAllowedFileHop("https://bucket.s3.amazonaws.com/photo.png", true), false);
  });

  it("does not serve HTML or SVG as an inline preview", () => {
    const image = presentFile(
      { id: "1", title: "photo.png", extension: "png", kind: "image", url: null, thumbnailUrl: null },
      "image/png",
    );
    const svg = presentFile(
      { id: "2", title: "icon.svg", extension: "svg", kind: "image", url: null, thumbnailUrl: null },
      "image/svg+xml",
    );
    const html = presentFile(
      { id: "3", title: "notes.pdf", extension: "pdf", kind: "file", url: null, thumbnailUrl: null },
      "text/html",
    );
    assert.equal(image.inline, true);
    assert.equal(image.contentType, "image/png");
    assert.equal(svg.inline, false);
    assert.equal(svg.contentType, "application/octet-stream");
    assert.equal(html.contentType, "application/octet-stream");
    assert.equal(html.inline, false);
  });

  it("sample tasks include a description, priority, image, and document", () => {
    const task = tasks.find((item) => item.id === "task-confirm-ioc");
    assert.ok(task);
    assert.match(task.description, /IOC sections/);
    assert.equal(task.priority, "high");
    assert.equal(task.attachments.some((file) => file.kind === "image"), true);
    assert.equal(task.attachments.some((file) => file.kind === "file"), true);
    assert.equal(task.comments.length, 1);
    assert.equal(tasks.every((item) => Array.isArray(item.attachments)), true);
  });
});
