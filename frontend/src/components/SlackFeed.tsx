import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRightIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
  PlayIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWhen } from "../lib/format";
import { readSessionToken } from "../lib/session";
import { displayAuthor, messageBody, plainSlackText, slackParts, type SlackTextPart } from "../lib/slackText";
import type { SlackFile, SlackMessage } from "../types";
import { SourceBadge } from "./SourceBadge";

const previewCache = new Map<string, string>();
const previewInflight = new Map<string, Promise<string>>();

type FileFilter = "all" | "files" | "images";

const FILTERS: { id: FileFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "files", label: "Files" },
  { id: "images", label: "Images" },
];

export function SlackFeed({ messages }: { messages: SlackMessage[] }) {
  const [query, setQuery] = useState("");
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const parsed = useMemo(() => parseSlackQuery(query), [query]);
  const filtering = Boolean(parsed) || fileFilter !== "all";
  const visible = useMemo(
    () => messages.filter((message) => matchesFilter(message, fileFilter) && matchesQuery(message, parsed)),
    [messages, fileFilter, parsed],
  );
  const highlight = parsed?.text.join(" ") ?? "";
  const summary = filtering
    ? `Showing ${visible.length} of ${messages.length}`
    : `${messages.length} recent ${messages.length === 1 ? "message" : "messages"}`;
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    if (!filtering) {
      setAnnounced("");
      return;
    }
    const timer = window.setTimeout(() => setAnnounced(summary), 250);
    return () => window.clearTimeout(timer);
  }, [filtering, summary]);

  return (
    <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Slack messages</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>
            <p className="sr-only" aria-live="polite">
              {announced}
            </p>
          </div>
          <form
            role="search"
            className="grid w-full gap-1 sm:max-w-sm"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="slack-message-search" className="text-xs font-medium text-foreground">
                Search
              </label>
              <span id="slack-search-hint" className="text-[11px] text-muted-foreground">
                from:name, has:file, has:image
              </span>
            </div>
            <div className="relative">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="slack-message-search"
                name="q"
                type="search"
                value={query}
                placeholder="Search messages"
                aria-describedby="slack-search-hint"
                aria-controls="slack-message-list"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                autoComplete="off"
                className="h-10 bg-background pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden [@media(pointer:coarse)]:h-12"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
              />
              {query ? (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          </form>
        </div>
        <fieldset>
          <legend className="sr-only">Show</legend>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const count =
                filter.id === "files"
                  ? messages.filter((message) => (message.files ?? []).length > 0).length
                  : filter.id === "images"
                    ? messages.filter((message) => (message.files ?? []).some((file) => file.kind === "image")).length
                    : messages.length;
              const checked = fileFilter === filter.id;
              return (
                <label
                  key={filter.id}
                  className={cn(
                    "inline-flex min-h-8 cursor-pointer items-center rounded-full border px-3 text-xs font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring [@media(pointer:coarse)]:min-h-11",
                    checked
                      ? "border-primary/30 bg-accent text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="slack-message-filter"
                    className="sr-only"
                    value={filter.id}
                    checked={checked}
                    onChange={() => setFileFilter(filter.id)}
                  />
                  {filter.label}
                  <span className="ml-1.5 tabular-nums text-[11px] opacity-80">{count}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyCopy(messages.length, filtering, fileFilter, Boolean(parsed))}</p>
      ) : (
        <ul id="slack-message-list" aria-label="Slack messages" className="divide-y divide-border/60">
          {visible.map((message) => (
            <MessageRow key={message.id} message={message} query={highlight} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageRow({ message, query }: { message: SlackMessage; query: string }) {
  const files = message.files ?? [];
  const author = displayAuthor(message.author);
  const body = messageBody(message.text, files);
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <Avatar className="mt-0.5">
        <AvatarFallback className="bg-accent text-[11px] font-semibold text-primary">{initials(author)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">
            <Highlight text={author} query={query} />
          </span>
          <time className="text-xs text-muted-foreground" dateTime={message.postedAt}>
            {formatWhen(message.postedAt)}
          </time>
          <SourceBadge origin={message.source.origin} />
        </div>
        {body ? (
          <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap text-foreground">
            <SlackBody text={message.text} query={query} />
          </p>
        ) : null}
        {files.length > 0 ? <Attachments files={files} query={query} /> : null}
      </div>
    </li>
  );
}

function Attachments({ files, query }: { files: SlackFile[]; query: string }) {
  const images = files.filter((file) => file.kind === "image" && file.preview);
  const rest = files.filter((file) => !(file.kind === "image" && file.preview));
  return (
    <div className="mt-2 grid gap-2">
      {images.length > 0 ? (
        <ul role="list" className={cn("grid gap-2", images.length > 1 && "max-w-xl sm:grid-cols-2")}>
          {images.map((file) => (
            <li key={file.id}>
              <SlackImage file={file} query={query} />
            </li>
          ))}
        </ul>
      ) : null}
      {rest.length > 0 ? (
        <ul role="list" className="grid gap-2">
          {rest.map((file) => (
            <li key={file.id}>{file.preview ? <DocumentCard file={file} query={query} /> : <FileCard file={file} query={query} />}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SlackBody({ text, query }: { text: string; query: string }) {
  return (
    <>
      {slackParts(text).map((part, index) => (
        <Part key={index} part={part} query={query} />
      ))}
    </>
  );
}

function Part({ part, query }: { part: SlackTextPart; query: string }) {
  if (part.type === "link" && part.href) {
    return (
      <a
        href={part.href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        <Highlight text={part.text} query={query} />
      </a>
    );
  }
  if (part.type === "code") {
    return (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        <Highlight text={part.text} query={query} />
      </code>
    );
  }
  if (part.type === "strong") {
    return (
      <strong className="font-semibold">
        <Highlight text={part.text} query={query} />
      </strong>
    );
  }
  return <Highlight text={part.text} query={query} />;
}

function SlackImage({ file, query }: { file: SlackFile; query: string }) {
  const { ref, visible } = useOnScreen(true);
  const preview = usePreview(file.id, visible);
  if (!file.preview || preview.failed) return <FileCard file={file} query={query} />;

  const frame = preview.src ? (
    <img
      src={preview.src}
      alt=""
      decoding="async"
      loading="lazy"
      className="max-h-80 w-full bg-muted/30 object-contain"
    />
  ) : (
    <div className="h-40 w-full animate-pulse bg-muted motion-reduce:animate-none" aria-hidden="true" />
  );

  const caption = (
    <figcaption className="truncate px-1 pt-1.5 text-xs text-muted-foreground">
      <Highlight text={file.title || file.name} query={query} />
      <span>
        {" · "}
        {file.prettyType}
        {file.size > 0 ? ` · ${formatBytes(file.size)}` : ""}
        {file.permalink ? " · Open in Slack" : ""}
      </span>
    </figcaption>
  );

  const figure = (
    <figure>
      <div className="overflow-hidden rounded-xl border border-border/80">{frame}</div>
      {caption}
    </figure>
  );

  return (
    <div ref={ref} className="max-w-sm">
      {file.permalink ? (
        <a href={file.permalink} target="_blank" rel="noreferrer" className="block max-w-full">
          {figure}
        </a>
      ) : (
        figure
      )}
    </div>
  );
}

function DocumentCard({ file, query }: { file: SlackFile; query: string }) {
  const { ref, visible } = useOnScreen(Boolean(file.preview));
  const preview = usePreview(file.id, visible);
  if (preview.failed) return <FileCard file={file} query={query} />;

  const media = isPlayable(file);
  const body = (
    <>
      <div className="relative bg-muted/40">
        {preview.src ? (
          <img src={preview.src} alt="" decoding="async" loading="lazy" className="h-44 w-full object-cover object-top" />
        ) : (
          <div className="grid h-36 place-items-center text-muted-foreground">
            <FileGlyph file={file} className="size-8" />
          </div>
        )}
        {media ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-background/90 text-foreground shadow-sm">
              <PlayIcon className="size-5" aria-hidden="true" />
            </span>
          </span>
        ) : null}
      </div>
      <span className="flex items-center gap-3 border-t border-border/70 px-3 py-2.5">
        <FileMeta file={file} query={query} />
      </span>
    </>
  );

  return (
    <div ref={ref} className="max-w-sm">
      <FileShell file={file} className="block overflow-hidden rounded-xl border border-border/80 bg-background hover:bg-muted/30">
        {body}
      </FileShell>
    </div>
  );
}

function FileCard({ file, query }: { file: SlackFile; query: string }) {
  return (
    <FileShell
      file={file}
      className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-left hover:bg-muted/40"
    >
      <FileMeta file={file} query={query} />
    </FileShell>
  );
}

function FileShell({ file, className, children }: { file: SlackFile; className: string; children: ReactNode }) {
  if (file.permalink) {
    return (
      <a href={file.permalink} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

function FileMeta({ file, query }: { file: SlackFile; query: string }) {
  return (
    <>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", fileTone(file))}>
        <FileGlyph file={file} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          <Highlight text={file.title || file.name} query={query} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {file.prettyType}
          {file.size > 0 ? ` · ${formatBytes(file.size)}` : ""}
          {file.permalink ? " · Open in Slack" : ""}
        </span>
      </span>
      {file.permalink ? <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
    </>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <mark key={`${index}-${match[0]}`} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {match[0]}
      </mark>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function useOnScreen(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || visible) return;
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.bottom >= -240 && rect.top <= window.innerHeight + 240) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, visible]);

  return { ref, visible };
}

function usePreview(fileId: string | null, enabled: boolean) {
  const [src, setSrc] = useState<string | null>(fileId ? (previewCache.get(fileId) ?? null) : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!fileId || !enabled) return;
    const cached = previewCache.get(fileId);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    loadPreview(fileId).then(
      (url) => {
        if (!cancelled) setSrc(url);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, fileId]);

  return { src, failed };
}

function loadPreview(fileId: string): Promise<string> {
  const cached = previewCache.get(fileId);
  if (cached) return Promise.resolve(cached);
  const pending = previewInflight.get(fileId);
  if (pending) return pending;
  const request = (async () => {
    const headers = new Headers();
    const token = readSessionToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`/api/slack/files/${encodeURIComponent(fileId)}/preview`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error("preview");
    const blob = await response.blob();
    if (blob.type && !blob.type.startsWith("image/")) throw new Error("preview");
    const url = URL.createObjectURL(blob);
    previewCache.set(fileId, url);
    return url;
  })().finally(() => {
    previewInflight.delete(fileId);
  });
  previewInflight.set(fileId, request);
  return request;
}

interface ParsedQuery {
  from?: string;
  has?: "file" | "image" | "link";
  text: string[];
}

function parseSlackQuery(raw: string): ParsedQuery | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let from: string | undefined;
  let has: ParsedQuery["has"];
  const text: string[] = [];
  for (const match of trimmed.matchAll(/"([^"]+)"|(\S+)/g)) {
    const token = (match[1] ?? match[2] ?? "").trim();
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith("from:")) {
      const value = lower.slice(5).replace(/^@/, "");
      if (value) from = value;
      continue;
    }
    if (lower.startsWith("has:")) {
      const value = lower.slice(4);
      if (value === "file" || value === "files" || value === "document" || value === "attachment") has = "file";
      else if (value === "image" || value === "images" || value === "img" || value === "photo") has = "image";
      else if (value === "link" || value === "url") has = "link";
      continue;
    }
    text.push(lower);
  }
  return { from, has, text };
}

function matchesQuery(message: SlackMessage, parsed: ParsedQuery | null): boolean {
  if (!parsed) return true;
  const author = displayAuthor(message.author).toLowerCase();
  if (parsed.from && !author.includes(parsed.from)) return false;
  const files = message.files ?? [];
  if (parsed.has === "file" && files.length === 0) return false;
  if (parsed.has === "image" && !files.some((file) => file.kind === "image")) return false;
  if (parsed.has === "link" && !slackParts(message.text).some((part) => part.type === "link") && !/https?:\/\//i.test(message.text)) {
    return false;
  }
  if (parsed.text.length === 0) return true;
  const haystack = searchable(message);
  return parsed.text.every((term) => haystack.includes(term));
}

function matchesFilter(message: SlackMessage, filter: FileFilter): boolean {
  const files = message.files ?? [];
  if (filter === "files") return files.length > 0;
  if (filter === "images") return files.some((file) => file.kind === "image");
  return true;
}

function emptyCopy(total: number, filtering: boolean, filter: FileFilter, hasQuery: boolean): string {
  if (!filtering || total === 0) return "No messages in this channel yet.";
  if (filter === "images") return hasQuery ? "No images match that search." : "No images in recent messages.";
  if (filter === "files") return hasQuery ? "No files match that search." : "No files in recent messages.";
  return "No messages match that search.";
}

function searchable(message: SlackMessage): string {
  return [
    displayAuthor(message.author),
    message.text,
    plainSlackText(message.text),
    ...(message.files ?? []).flatMap((file) => [file.name, file.title, file.prettyType, file.filetype]),
  ]
    .join("\n")
    .toLowerCase();
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  const megabytes = size / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function fileKind(file: SlackFile): string {
  return `${file.filetype} ${file.mimetype} ${file.prettyType}`.toLowerCase();
}

function isPlayable(file: SlackFile): boolean {
  const kind = fileKind(file);
  return kind.includes("video") || kind.includes("audio") || kind.includes("mp4") || kind.includes("mov") || kind.includes("mp3");
}

function FileGlyph({ file, className }: { file: SlackFile; className?: string }) {
  const Icon = fileIcon(file);
  return <Icon className={className} aria-hidden="true" />;
}

function fileTone(file: SlackFile): string {
  const kind = fileKind(file);
  if (file.kind === "image" || kind.includes("image")) return "bg-primary/10 text-primary";
  if (kind.includes("pdf")) return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (kind.includes("sheet") || kind.includes("csv") || kind.includes("excel") || kind.includes("xls")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (kind.includes("zip") || kind.includes("archive") || kind.includes("gzip")) return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (isPlayable(file)) return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  if (kind.includes("text") || kind.includes("doc")) return "bg-sky-500/10 text-sky-800 dark:text-sky-300";
  return "bg-muted text-primary";
}

function fileIcon(file: SlackFile) {
  const kind = fileKind(file);
  if (file.kind === "image" || kind.includes("image")) return ImageIcon;
  if (kind.includes("sheet") || kind.includes("csv") || kind.includes("excel") || kind.includes("xls")) return FileSpreadsheetIcon;
  if (kind.includes("zip") || kind.includes("archive") || kind.includes("gzip")) return FileArchiveIcon;
  if (kind.includes("audio") || kind.includes("mp3") || kind.includes("m4a")) return FileAudioIcon;
  if (kind.includes("video") || kind.includes("mp4") || kind.includes("mov")) return FileVideoIcon;
  if (kind.includes("pdf") || kind.includes("text") || kind.includes("doc")) return FileTextIcon;
  return FileIcon;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
