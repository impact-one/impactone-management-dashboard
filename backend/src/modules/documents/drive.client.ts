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
  downloadFile,
  upsertShare,
  removeShare,
};

const PRESENTATION = "application/vnd.google-apps.presentation";
const DRAWING = "application/vnd.google-apps.drawing";
const PDF = "application/pdf";
const SHEET = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function exportForMime(mime: string): { mime: string; ext: string } | null {
  if (mime === DOCUMENT || mime === PRESENTATION || mime === DRAWING) return { mime: PDF, ext: ".pdf" };
  if (mime === SPREADSHEET) return { mime: SHEET, ext: ".xlsx" };
  return null;
}

export function downloadFilename(title: string, extension: string) {
  const cleaned = title.replace(/[^\w.\- ()[\]]+/g, "_").replace(/[\r\n"]/g, "").slice(0, 160).trim() || "document";
  if (!extension) return cleaned;
  if (cleaned.toLowerCase().endsWith(extension.toLowerCase())) return cleaned;
  const stem = cleaned.replace(/\.[^.]+$/, "").trim() || "document";
  return `${stem}${extension}`;
}

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

async function googleRaw(path: string): Promise<{ body: Buffer; contentType: string }> {
  const token = env.googleAccessToken;
  if (!token) throw new AppError(503, "Google access token is not set.");
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  const body = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    let message = "";
    try {
      const payload = JSON.parse(body.toString("utf8")) as { error?: { message?: unknown } };
      message = textOf(payload.error?.message);
    } catch {
      message = "";
    }
    throw new AppError(502, message ? `Google Drive: ${message}` : `Google Drive returned ${response.status}.`);
  }
  const header = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const contentType =
    header === "text/html" || header === "application/xhtml+xml" || header === "image/svg+xml" || !header
      ? "application/octet-stream"
      : header;
  return { body, contentType };
}

async function downloadFile(fileId: string) {
  const params = new URLSearchParams({
    supportsAllDrives: "true",
    fields: "id,name,mimeType",
  });
  const payload = await google(`/files/${encodeURIComponent(fileId)}?${params.toString()}`);
  const row = record(payload);
  const name = textOf(row.name) || "Untitled";
  const mime = textOf(row.mimeType);
  if (mime === FOLDER) throw new AppError(400, "Folders cannot be downloaded.");
  const exported = exportForMime(mime);
  if (exported) {
    const file = await googleRaw(
      `/files/${encodeURIComponent(fileId)}/export?${new URLSearchParams({ mimeType: exported.mime }).toString()}`,
    );
    return {
      body: file.body,
      filename: downloadFilename(name, exported.ext),
      contentType: exported.mime,
    };
  }
  if (mime.startsWith("application/vnd.google-apps.")) {
    throw new AppError(400, "That Drive item cannot be downloaded.");
  }
  const file = await googleRaw(
    `/files/${encodeURIComponent(fileId)}?${new URLSearchParams({ alt: "media", supportsAllDrives: "true" }).toString()}`,
  );
  return {
    body: file.body,
    filename: downloadFilename(name, ""),
    contentType: file.contentType,
  };
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
