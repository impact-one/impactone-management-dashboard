import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { initStore } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { permissionsFor } from "../../lib/permissions.js";
import type { PublicUser, Role } from "../../types/domain.js";
import { documentsService } from "./documents.service.js";
import { downloadFilename, exportForMime } from "./drive.client.js";

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

describe("drive library", () => {
  before(async () => {
    await initStore();
  });

  it("keeps live sharing lists with staff", async () => {
    const desk = await documentsService.desk(user("consultant"));
    assert.equal(desk.desk.canManage, false);
    assert.ok(desk.desk.files.some((file) => file.id === "folder-ioc"));
    assert.ok(desk.desk.files.every((file) => file.projectId === "ksp-hills"));
    assert.ok(desk.desk.files.every((file) => file.shares.length === 0));
  });

  it("refuses a viewer who tries to add a file", async () => {
    await assert.rejects(
      () => documentsService.create(user("viewer"), { title: "Notes", kind: "document", folderId: "", projectId: "" }),
      (error) => statusOf(error) === 403,
    );
  });

  it("adds an empty document inside a folder the desk can write", async () => {
    const file = await documentsService.create(user("manager"), {
      title: "Pilot notes",
      kind: "document",
      folderId: "folder-impact",
      projectId: "io-ops",
    });
    assert.equal(file.kind, "document");
    assert.equal(file.folderName, "Impact files");
    assert.equal(file.href, null);
    assert.equal(file.accessRole, "owner");
    assert.equal(file.projectName, "Impact One operations");

    const shared = await documentsService.share(user("manager"), file.id, {
      email: "Tetia@impactone.example",
      role: "commenter",
    });
    assert.equal(shared.shares.find((share) => share.email === "tetia@impactone.example")?.role, "commenter");

    const listed = await documentsService.list(user("manager"));
    assert.ok(listed.items.some((item) => item.title === "Pilot task brief"));
    assert.ok(listed.items.some((item) => item.title === "Pilot notes"));
  });

  it("leaves owner on the file", async () => {
    await assert.rejects(
      () =>
        documentsService.share(user("manager"), "folder-impact", {
          email: "ops@impactone.example",
          role: "owner",
        }),
      (error) => statusOf(error) === 400,
    );
    await assert.rejects(
      () => documentsService.unshare(user("manager"), "folder-impact", { email: "mikolaj@impactone.example" }),
      (error) => statusOf(error) === 403,
    );
  });

  it("refuses sharing on a file this desk can only read", async () => {
    await assert.rejects(
      () => documentsService.share(user("manager"), "file-scope", { email: "ops@impactone.example", role: "reader" }),
      (error) => statusOf(error) === 403,
    );
  });

  it("lets a writer add a reader on the IOC folder", async () => {
    const folder = await documentsService.share(user("manager"), "folder-ioc", {
      email: "ops@impactone.example",
      role: "reader",
    });
    assert.equal(folder.shares.find((share) => share.email === "ops@impactone.example")?.role, "reader");
    const removed = await documentsService.unshare(user("manager"), "folder-ioc", { email: "ops@impactone.example" });
    assert.equal(removed.shares.some((share) => share.email === "ops@impactone.example"), false);
  });

  it("downloads a library document as a text file", async () => {
    const file = await documentsService.download(user("manager"), "doc-brief");
    assert.equal(file.contentType, "text/plain; charset=utf-8");
    assert.equal(file.filename, "Pilot task brief.txt");
    assert.match(file.body.toString("utf8"), /Pilot task brief/);
    assert.match(file.body.toString("utf8"), /Mikolaj/);
  });

  it("refuses a folder download and a document outside the viewer", async () => {
    await assert.rejects(
      () => documentsService.download(user("manager"), "folder-impact"),
      (error) => statusOf(error) === 400,
    );
    await assert.rejects(
      () => documentsService.download(user("consultant"), "doc-brief"),
      (error) => statusOf(error) === 404,
    );
    const visible = await documentsService.download(user("consultant"), "file-scope");
    assert.equal(visible.filename, "Consultant scope.txt");
  });

  it("names a Drive export for local viewing", () => {
    assert.equal(exportForMime("application/vnd.google-apps.document")?.ext, ".pdf");
    assert.equal(exportForMime("application/vnd.google-apps.spreadsheet")?.ext, ".xlsx");
    assert.equal(downloadFilename("Team access notes", ".pdf"), "Team access notes.pdf");
    assert.equal(downloadFilename("Budget.xlsx", ".xlsx"), "Budget.xlsx");
  });

  it("asks for a real folder", async () => {
    await assert.rejects(
      () =>
        documentsService.create(user("manager"), {
          title: "Loose notes",
          kind: "document",
          folderId: "file-scope",
          projectId: "",
        }),
      (error) => statusOf(error) === 400,
    );
  });
});
