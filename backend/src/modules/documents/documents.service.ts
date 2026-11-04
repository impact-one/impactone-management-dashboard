import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import { isStaff } from "../../lib/permissions.js";
import { canSeeProject, filterByProject } from "../../lib/visibility.js";
import type { DocumentItem, DriveDesk, DriveFile, PublicUser } from "../../types/domain.js";
import { downloadFilename, driveClient, parseLiveId } from "./drive.client.js";
import { createFileSchema, parseBody, removeShareSchema, shareFileSchema } from "./documents.schema.js";

const LIBRARY = {
  bestFit: "Document library",
  implementationNote: "Sharing is writer, commenter, or reader. File contents stay in Drive.",
  operatingModel: "Google Drive holds files; this desk tracks names, links, and access.",
  steps: [
    { name: "Library", detail: "This desk stores the name and link. File contents stay in Drive." },
    { name: "Folders", detail: "Impact and IOC folders organise the library." },
    { name: "Create", detail: "Managers can add a folder, empty Doc, or empty Sheet." },
    { name: "Sharing", detail: "Writer, commenter, or reader. Owner stays with the file." },
  ],
};

export class DocumentsService {
  async list(user: PublicUser, projectId?: string) {
    const known = filterByProject(user, store.documents, store.projects);
    const library = await this.library(user);
    let items = [...known, ...library.files.map(toDocument)];
    if (projectId) items = items.filter((item) => item.projectId === projectId);
    return { items, note: library.note };
  }

  async desk(user: PublicUser): Promise<{ desk: DriveDesk; note: string }> {
    const library = await this.library(user);
    const desk: DriveDesk = {
      connected: library.connected,
      canManage: isStaff(user),
      ...LIBRARY,
      files: library.files,
      known: filterByProject(user, store.documents, store.projects),
      projects: store.projects.filter((project) => canSeeProject(user, project)).map((project) => ({
        id: project.id,
        name: project.name,
      })),
    };
    return { desk, note: library.note };
  }

  async create(user: PublicUser, body: unknown): Promise<DriveFile> {
    this.assertManage(user);
    const input = parseBody(createFileSchema, body);
    const project = input.projectId ? store.projects.find((item) => item.id === input.projectId) : undefined;
    if (input.projectId && !project) throw new AppError(400, "Choose a project from the list.");

    if (await this.useLive()) {
      const parentId = input.folderId ? parseLiveId(input.folderId) : "";
      if (input.folderId && !parentId) throw new AppError(400, "Choose a folder from the connected Drive.");
      return driveClient.createFile({
        title: input.title,
        kind: input.kind,
        parentId: parentId || undefined,
      });
    }

    let folderName = "My Drive";
    let folderId: string | null = null;
    if (input.folderId) {
      const folder = store.driveFiles.find((item) => item.id === input.folderId);
      if (!folder || folder.kind !== "folder") throw new AppError(400, "Choose a folder.");
      if (!canWrite(folder)) throw new AppError(403, "That folder is not open for new files.");
      folderName = folder.title;
      folderId = folder.id;
    }

    const file: DriveFile = {
      id: `${input.kind}-${randomUUID()}`,
      title: input.title,
      kind: input.kind,
      folderId,
      folderName,
      owner: user.name,
      ownerEmail: user.email,
      href: null,
      projectId: project?.id ?? null,
      projectName: project?.name ?? "Impact library",
      accessRole: "owner",
      shares: [{ email: user.email.toLowerCase(), role: "owner" }],
      source: {
        origin: "sample",
        system: "Google Drive",
        detail: "Labelled library. A Google token creates this in Drive. File contents stay in Drive.",
      },
      reviewFlags: [],
    };
    store.driveFiles.unshift(file);
    return file;
  }

  async download(user: PublicUser, id: string) {
    const liveId = parseLiveId(id);
    if (liveId) {
      if (!isStaff(user)) throw new AppError(403, "Live Drive files are limited to executive and manager roles.");
      if (!(await this.useLive())) throw new AppError(404, "That file is not in the connected Drive.");
      return driveClient.downloadFile(liveId);
    }

    const drive = filterByProject(user, store.driveFiles, store.projects).find((file) => file.id === id);
    if (drive) {
      if (drive.kind === "folder") throw new AppError(400, "Folders cannot be downloaded.");
      return textDownload(drive.title, [
        drive.title,
        `Owner: ${drive.owner}`,
        `Project: ${drive.projectName}`,
        `Location: ${drive.folderName}`,
        drive.source.detail,
      ]);
    }

    const known = filterByProject(user, store.documents, store.projects).find((item) => item.id === id);
    if (!known) throw new AppError(404, "That file is not in the library.");
    return textDownload(known.title, [
      known.title,
      `Owner: ${known.owner}`,
      `Project: ${known.projectName}`,
      known.source.detail,
      ...known.reviewFlags,
    ]);
  }

  async share(user: PublicUser, id: string, body: unknown): Promise<DriveFile> {
    this.assertManage(user);
    const input = parseBody(shareFileSchema, body);
    if (await this.useLive()) {
      const googleId = this.requireLiveId(id);
      this.assertCanChange(await driveClient.getFile(googleId));
      await driveClient.upsertShare(googleId, input.email, input.role);
      return driveClient.getFile(googleId);
    }
    const file = this.requireLocal(id);
    this.assertCanChange(file);
    const existing = file.shares.find((share) => share.email === input.email);
    if (existing?.role === "owner") throw new AppError(403, "Owner stays with the file.");
    if (existing) existing.role = input.role;
    else file.shares.push({ email: input.email, role: input.role });
    return file;
  }

  async unshare(user: PublicUser, id: string, body: unknown): Promise<DriveFile> {
    this.assertManage(user);
    const input = parseBody(removeShareSchema, body);
    if (await this.useLive()) {
      const googleId = this.requireLiveId(id);
      this.assertCanChange(await driveClient.getFile(googleId));
      await driveClient.removeShare(googleId, input.email);
      return driveClient.getFile(googleId);
    }
    const file = this.requireLocal(id);
    this.assertCanChange(file);
    const existing = file.shares.find((share) => share.email === input.email);
    if (!existing) throw new AppError(404, "That person is not on this file.");
    if (existing.role === "owner") throw new AppError(403, "Owner stays with the file.");
    file.shares = file.shares.filter((share) => share.email !== input.email);
    return file;
  }

  private async useLive() {
    if (!env.googleAccessToken) return false;
    const live = await driveClient.get();
    return Boolean(live.ok && live.data);
  }

  private async library(user: PublicUser): Promise<{ files: DriveFile[]; note: string; connected: boolean }> {
    const local = filterByProject(user, store.driveFiles, store.projects).map((file) => this.present(user, file));
    if (!isStaff(user)) {
      return {
        files: local,
        note: "Live Drive is limited to executive and manager roles.",
        connected: false,
      };
    }
    if (!env.googleAccessToken) {
      return {
        files: local,
        note: "Google Drive is not connected. Showing the reference document library.",
        connected: false,
      };
    }
    const live = await driveClient.get();
    if (live.ok && live.data) {
      return {
        files: live.data.map((file) => this.present(user, file)),
        note: "Live Google Drive for executive and manager roles. Names and links only.",
        connected: true,
      };
    }
    return {
      files: local,
      note: live.configured ? `${live.message} Showing the reference library instead.` : live.message,
      connected: false,
    };
  }

  private present(user: PublicUser, file: DriveFile): DriveFile {
    if (isStaff(user)) return file;
    return { ...file, shares: [] };
  }

  private assertManage(user: PublicUser) {
    if (!isStaff(user)) {
      throw new AppError(403, "Creating files and changing sharing stay with executive and manager roles.");
    }
  }

  private assertCanChange(file: DriveFile) {
    if (file.accessRole !== "owner" && file.accessRole !== "writer") {
      throw new AppError(403, "Only an owner or a writer can change sharing on this file.");
    }
  }

  private requireLocal(id: string) {
    const file = store.driveFiles.find((item) => item.id === id);
    if (!file) throw new AppError(404, "That file is not in the library.");
    return file;
  }

  private requireLiveId(id: string) {
    const googleId = parseLiveId(id);
    if (!googleId) throw new AppError(404, "That file is not in the connected Drive.");
    return googleId;
  }
}

function textDownload(title: string, lines: string[]) {
  const body = lines.map((line) => line.trim()).filter(Boolean).join("\n\n");
  return {
    body: Buffer.from(`${body}\n`, "utf8"),
    filename: downloadFilename(title, ".txt"),
    contentType: "text/plain; charset=utf-8",
  };
}

function canWrite(file: DriveFile) {
  return file.accessRole === "owner" || file.accessRole === "writer";
}

function toDocument(file: DriveFile): DocumentItem {
  return {
    id: file.id,
    projectId: file.projectId,
    projectName: file.projectName,
    title: file.title,
    owner: file.owner,
    source: file.source,
    href: file.href,
    reviewFlags: file.reviewFlags,
  };
}

export const documentsService = new DocumentsService();
