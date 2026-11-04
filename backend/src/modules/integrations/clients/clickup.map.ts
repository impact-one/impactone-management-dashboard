import type { Task, TaskAttachment, TaskCheckItem, TaskComment, TaskPriority } from "../../../types/domain.js";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "heic", "tif", "tiff"]);

const PRIORITY_BY_ID: Record<string, TaskPriority> = {
  "1": "urgent",
  "2": "high",
  "3": "normal",
  "4": "low",
};

function text(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return fallback;
  return trimmed;
}

function named(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || !("name" in value)) return "";
  return text((value as { name?: unknown }).name);
}

function decodeBasic(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function plainTaskText(value: string): string {
  return decodeBasic(
    value
      .replace(/\r\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_~`>]/g, "")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

function isoFromMillis(value: unknown): string | null {
  const raw = text(value);
  if (!/^\d+$/.test(raw)) return null;
  const date = new Date(Number(raw));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnlyFromMillis(value: unknown): string | null {
  const iso = isoFromMillis(value);
  return iso ? iso.slice(0, 10) : null;
}

export function priorityOf(value: unknown): TaskPriority | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { priority?: unknown; id?: unknown };
  const label = text(record.priority).toLowerCase();
  if (label === "urgent" || label === "high" || label === "normal" || label === "low") return label;
  return PRIORITY_BY_ID[text(record.id)] ?? null;
}

function httpsUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isAttachmentHost(host: string): boolean {
  return host === "clickup-attachments.com" || host.endsWith(".clickup-attachments.com") || host === "attachments.clickup.com";
}

/** First hop must be a ClickUp attachment host. Later hops may be the CDN it redirects to. */
export function isAllowedFileHop(value: string, first: boolean): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isIpHost(host)) return false;
  if (first) return isAttachmentHost(host);
  return (
    isAttachmentHost(host) ||
    host.endsWith(".amazonaws.com") ||
    host.endsWith(".cloudfront.net") ||
    host === "storage.googleapis.com" ||
    host.endsWith(".googleusercontent.com")
  );
}

function extensionOf(file: Record<string, unknown>, title: string): string {
  const explicit = text(file.extension).toLowerCase().replace(/^\./, "");
  if (explicit) return explicit;
  const bare = title.split(/[?#]/)[0] ?? title;
  const fromTitle = bare.includes(".") ? (bare.split(".").pop()?.toLowerCase() ?? "") : "";
  return /^[a-z0-9]{1,8}$/.test(fromTitle) ? fromTitle : "";
}

function attachmentsOf(task: Record<string, unknown>): TaskAttachment[] {
  const raw = Array.isArray(task.attachments) ? task.attachments : [];
  const files: TaskAttachment[] = [];
  const seenUrls = new Set<string>();

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const file = item as Record<string, unknown>;
    const title = text(file.title) || text(file.name) || `Attachment ${index + 1}`;
    const extension = extensionOf(file, title);
    const mime = text(file.mimetype || file.mime_type).toLowerCase();
    const kind = mime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension) ? "image" : "file";
    const url = httpsUrl(file.url) ?? httpsUrl(file.url_w_query) ?? httpsUrl(file.url_w_host);
    const thumbnailUrl =
      httpsUrl(file.thumbnail_large) ?? httpsUrl(file.thumbnail_medium) ?? httpsUrl(file.thumbnail_small) ?? (kind === "image" ? url : null);
    if (url) seenUrls.add(url);
    files.push({
      id: text(file.id, `file-${index}`),
      title,
      extension,
      kind,
      url,
      thumbnailUrl,
    });
  }

  const sources = [text(task.markdown_description), text(task.description), text(task.text_content)];
  let embed = 0;
  for (const source of sources) {
    const pattern = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)|<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
    for (const match of source.matchAll(pattern)) {
      const url = httpsUrl(match[1] || match[2]);
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      const title = `Image ${files.length + 1}`;
      files.push({
        id: `embed-${embed}`,
        title,
        extension: extensionOf({}, url),
        kind: "image",
        url,
        thumbnailUrl: url,
      });
      embed += 1;
    }
  }

  return files;
}

function checklistOf(task: Record<string, unknown>): TaskCheckItem[] {
  const lists = Array.isArray(task.checklists) ? task.checklists : [];
  const items: TaskCheckItem[] = [];
  for (const list of lists) {
    if (!list || typeof list !== "object") continue;
    const rows = Array.isArray((list as { items?: unknown }).items) ? (list as { items: unknown[] }).items : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as { id?: unknown; name?: unknown; resolved?: unknown };
      const resolved = item.resolved === true || item.resolved === 1 || item.resolved === "true";
      items.push({
        id: text(item.id, `check-${items.length}`),
        name: text(item.name, "Item"),
        resolved,
      });
    }
  }
  return items;
}

function assigneesOf(task: Record<string, unknown>): string {
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const names = assignees
    .map((assignee) => {
      if (!assignee || typeof assignee !== "object") return "";
      const record = assignee as { username?: unknown; email?: unknown };
      return text(record.username) || text(record.email);
    })
    .filter(Boolean);
  return names.join(", ") || "Unassigned";
}

function descriptionOf(task: Record<string, unknown>): string {
  const plain = text(task.text_content);
  if (plain) return plainTextFromContent(plain);
  const markdown = text(task.markdown_description);
  if (markdown) return plainTaskText(markdown);
  const description = text(task.description);
  return description ? plainTaskText(description) : "";
}

function plainTextFromContent(value: string): string {
  return value.includes("<") ? plainTaskText(value) : decodeBasic(value).trim();
}

function tagsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value.map((item) => named(item)).filter(Boolean);
  return [...new Set(names)];
}

function parentIdOf(value: unknown): string | null {
  const parent = text(value);
  if (!parent || parent === "null") return null;
  return `clickup-${parent}`;
}

export function mapClickUpTask(task: Record<string, unknown>, place: string, index: number): Task {
  const statusRecord =
    task.status && typeof task.status === "object" ? (task.status as { status?: unknown; type?: unknown }) : {};
  const statusName = typeof task.status === "string" ? text(task.status) : text(statusRecord.status);
  const statusType = text(statusRecord.type).toLowerCase();
  const listName = named(task.list);
  const projectName = place || listName || "ClickUp";
  const href = httpsUrl(task.url);
  return {
    id: `clickup-${text(task.id, String(index))}`,
    projectId: null,
    projectName,
    listName: listName || projectName,
    title: text(task.name, "Untitled ClickUp task"),
    description: descriptionOf(task),
    owner: assigneesOf(task),
    responsibility: "Read from ClickUp. This dashboard did not change the task.",
    status: statusName || statusType || "—",
    closed: statusType === "closed" || statusType === "done",
    priority: priorityOf(task.priority),
    dueDate: dateOnlyFromMillis(task.due_date),
    updatedAt: isoFromMillis(task.date_updated),
    createdAt: isoFromMillis(task.date_created),
    parentId: parentIdOf(task.parent),
    tags: tagsOf(task.tags),
    attachments: attachmentsOf(task),
    checklist: checklistOf(task),
    comments: [],
    source: {
      origin: "live",
      system: "ClickUp",
      detail: "Read-only. Description, status, priority, and files are the values stored on the ClickUp task.",
    },
    href,
  };
}

export function mapClickUpComments(payload: unknown): TaskComment[] {
  const record = payload && typeof payload === "object" ? (payload as { comments?: unknown }) : {};
  const rows = Array.isArray(record.comments) ? record.comments : [];
  const comments: TaskComment[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const comment = row as {
      id?: unknown;
      comment?: unknown;
      comment_text?: unknown;
      user?: unknown;
      date?: unknown;
    };
    const textValue = commentText(comment.comment_text, comment.comment);
    if (!textValue) continue;
    const user = comment.user && typeof comment.user === "object" ? (comment.user as { username?: unknown; email?: unknown }) : {};
    comments.push({
      id: text(comment.id, `comment-${comments.length}`),
      author: text(user.username) || text(user.email) || "Someone",
      text: textValue,
      postedAt: isoFromMillis(comment.date),
    });
  }
  return comments;
}

function commentText(plain: unknown, rich: unknown): string {
  const direct = text(plain);
  if (direct) return plainTaskText(direct);
  if (typeof rich === "string") return plainTaskText(rich);
  if (!Array.isArray(rich)) return "";
  const joined = rich
    .map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""))
    .join("")
    .trim();
  return joined ? plainTaskText(joined) : "";
}

const INLINE_TYPES = new Set(["application/pdf"]);

export function presentFile(file: TaskAttachment, upstream: string | null): { contentType: string; inline: boolean } {
  const byExtension: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    avif: "image/avif",
    pdf: "application/pdf",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    svg: "image/svg+xml",
  };
  const upstreamType = upstream?.split(";")[0]?.trim().toLowerCase() ?? "";
  const unsafe = upstreamType === "text/html" || upstreamType === "application/xhtml+xml" || upstreamType === "image/svg+xml";
  const fromExt = byExtension[file.extension.toLowerCase()];
  const contentType = unsafe
    ? "application/octet-stream"
    : fromExt || (upstreamType.startsWith("image/") ? upstreamType : "application/octet-stream");
  const inline = (contentType.startsWith("image/") && contentType !== "image/svg+xml") || INLINE_TYPES.has(contentType);
  return { contentType, inline };
}

export function safeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180).trim();
  return cleaned || "file";
}
