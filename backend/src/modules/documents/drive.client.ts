import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import type { DriveFile, DriveKind, DriveRole } from "../../types/domain.js";
import type { LiveResult } from "../integrations/clients/readOnlyClient.js";

const API = "https://www.googleapis.com/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";
const DOCUMENT = "application/vnd.google-apps.document";
const SPREADSHEET = "application/vnd.google-apps.spreadsheet";

const FILE_FIELDS =
  "id,name,mimeType,webViewLink,ownedByMe,parents,owners(displayName,emailAddress),capabilities(canEdit,canComment)";

export interface DriveCreateInput {
  title: string;
  kind: "folder" | "document" | "spreadsheet";
  parentId?: string;
}

let cache: { at: number; result: LiveResult<DriveFile[]> } | null = null;

export function invalidateDriveCache() {
  cache = null;
}

export function liveFileId(fileId: string) {
  return `drive:${encodeURIComponent(fileId)}`;
}

export function parseLiveId(id: string): string | null {
  if (!id.startsWith("drive:")) return null;
  const fileId = decodeURIComponent(id.slice("drive:".length));
  return fileId || null;
}

export const driveClient = {
  async get(): Promise<LiveResult<DriveFile[]>> {
    if (cache && Date.now() - cache.at < 60_000) return cache.result;
    const checkedAt = new Date().toISOString();
    if (!env.googleAccessToken) {
      const result: LiveResult<DriveFile[]> = {
        ok: false,
        configured: false,
        checkedAt,
        message: "Google access token is not set. The library stays on labelled sample files.",
        data: null,
      };
      cache = { at: Date.now(), result };
      return result;
    }
    try {
      const data = await listFiles();
      const result: LiveResult<DriveFile[]> = {
        ok: true,
        configured: true,
        checkedAt,
        message: "Connected. Folders, empty Docs and Sheets, and sharing can be sent to Google Drive. File contents stay in Drive.",
        data,
      };
      cache = { at: Date.now(), result };
      return result;
    } catch (error) {
      const result: LiveResult<DriveFile[]> = {
        ok: false,
        configured: true,
        checkedAt,
        message: error instanceof Error ? error.message : "Google Drive could not be read.",
        data: null,
      };
      cache = { at: Date.now(), result };
      return result;
    }
  },

  createFile,
  getFile,
  upsertShare,
  removeShare,
};

async function google(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = env.googleAccessToken;
  if (!token) throw new AppError(503, "Google access token is not set.");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? textOf((payload as { error?: { message?: unknown } }).error?.message)
        : "";
    throw new AppError(502, message ? `Google Drive: ${message}` : `Google Drive returned ${response.status}.`);
  }
  return payload;
}

async function listFiles(): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    pageSize: "25",
    orderBy: "folder,modifiedTime desc",
    q: "trashed = false",
    fields: `files(${FILE_FIELDS})`,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const payload = await google(`/files?${params.toString()}`);
  const rows = arrayOf(record(payload).files);
  const names = new Map<string, string>();
  for (const row of rows) {
    const item = record(row);
    const id = textOf(item.id);
    if (id) names.set(id, textOf(item.name) || "Untitled");
  }
  const files = rows.map((row) => mapFile(row, names));
  const owned = files.filter((file) => file.accessRole === "owner").slice(0, 12);
  await Promise.all(
    owned.map(async (file) => {
      const googleId = parseLiveId(file.id);
      file.shares = googleId ? await safeShares(googleId) : [];
    }),
  );
  return files;
}

async function getFile(fileId: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    supportsAllDrives: "true",
    fields: FILE_FIELDS,
  });
  const payload = await google(`/files/${encodeURIComponent(fileId)}?${params.toString()}`);
  const file = mapFile(payload, new Map());
  if (file.accessRole === "owner" || file.accessRole === "writer") {
    file.shares = await safeShares(fileId);
  }
  return file;
}

async function createFile(input: DriveCreateInput): Promise<DriveFile> {
  const body: Record<string, unknown> = {
    name: input.title,
    mimeType: mimeFor(input.kind),
  };
  if (input.parentId) body.parents = [input.parentId];
  const params = new URLSearchParams({
    supportsAllDrives: "true",
    fields: FILE_FIELDS,
  });
  const payload = await google(`/files?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  invalidateDriveCache();
  const file = mapFile(payload, new Map());
  file.shares = await safeShares(parseLiveId(file.id) ?? "");
  return file;
}

async function upsertShare(fileId: string, email: string, role: Exclude<DriveRole, "owner">) {
  const current = await listPermissionRecords(fileId);
  const existing = current.find((row) => row.email === email);
  if (existing && asRole(existing.role) === "owner") {
    throw new AppError(403, "Owner stays with the file.");
  }
  if (existing) {
    await google(
      `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    );
  } else {
    await google(`/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=true`, {
      method: "POST",
      body: JSON.stringify({ type: "user", role, emailAddress: email }),
    });
  }
  invalidateDriveCache();
}

async function removeShare(fileId: string, email: string) {
  const current = await listPermissionRecords(fileId);
  const existing = current.find((row) => row.email === email);
  if (!existing) throw new AppError(404, "That person is not on this file.");
  if (asRole(existing.role) === "owner") throw new AppError(403, "Owner stays with the file.");
  await google(
    `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(existing.id)}?supportsAllDrives=true`,
    { method: "DELETE" },
  );
  invalidateDriveCache();
}

async function safeShares(fileId: string) {
  if (!fileId) return [];
  try {
    return await listShares(fileId);
  } catch {
    return [];
  }
}

async function listShares(fileId: string) {
  const records = await listPermissionRecords(fileId);
  return records.flatMap((row) => {
    const role = asRole(row.role);
    if (!row.email || !role) return [];
    return [{ email: row.email, role }];
  });
}

async function listPermissionRecords(fileId: string) {
  const payload = await google(
    `/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&fields=permissions(id,emailAddress,role,type)`,
  );
  return arrayOf(record(payload).permissions).flatMap((item) => {
    const row = record(item);
    const id = textOf(row.id);
    const email = textOf(row.emailAddress).toLowerCase();
    const role = textOf(row.role);
    if (!id || row.type !== "user" || !email) return [];
    return [{ id, email, role }];
  });
}

function mapFile(raw: unknown, names: Map<string, string>): DriveFile {
  const row = record(raw);
  const id = textOf(row.id);
  const mime = textOf(row.mimeType);
  const parents = arrayOf(row.parents).map((parent) => textOf(parent)).filter(Boolean);
  const parentId = parents[0] ?? "";
  const owner = record(arrayOf(row.owners)[0]);
  const caps = record(row.capabilities);
  const accessRole: DriveRole =
    row.ownedByMe === true ? "owner" : caps.canEdit === true ? "writer" : caps.canComment === true ? "commenter" : "reader";
  return {
    id: liveFileId(id),
    title: textOf(row.name) || "Untitled",
    kind: kindOf(mime),
    folderId: parentId ? liveFileId(parentId) : null,
    folderName: parentId ? names.get(parentId) || "Drive" : "My Drive",
    owner: textOf(owner.displayName) || "Google Drive",
    ownerEmail: textOf(owner.emailAddress).toLowerCase(),
    href: linkFor(id, mime, textOf(row.webViewLink)),
    projectId: null,
    projectName: "Google Drive",
    accessRole,
    shares: [],
    source: {
      origin: "live",
      system: "Google Drive",
      detail: "Name and link only. File contents stay in Drive.",
    },
    reviewFlags: [],
  };
}

function kindOf(mime: string): DriveKind {
  if (mime === FOLDER) return "folder";
  if (mime === DOCUMENT) return "document";
  if (mime === SPREADSHEET) return "spreadsheet";
  return "file";
}

function mimeFor(kind: DriveCreateInput["kind"]) {
  if (kind === "folder") return FOLDER;
  if (kind === "document") return DOCUMENT;
  return SPREADSHEET;
}

function linkFor(id: string, mime: string, webViewLink: string) {
  if (webViewLink) return webViewLink;
  if (!id) return null;
  if (mime === DOCUMENT) return `https://docs.google.com/document/d/${id}/edit`;
  if (mime === SPREADSHEET) return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  if (mime === FOLDER) return `https://drive.google.com/drive/folders/${id}`;
  return `https://drive.google.com/file/d/${id}/view`;
}

function asRole(value: string): DriveRole | null {
  if (value === "owner" || value === "organizer") return "owner";
  if (value === "writer" || value === "fileOrganizer") return "writer";
  if (value === "commenter") return "commenter";
  if (value === "reader") return "reader";
  return null;
}

function textOf(value: unknown) {
  return typeof value === "string" ? value : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
