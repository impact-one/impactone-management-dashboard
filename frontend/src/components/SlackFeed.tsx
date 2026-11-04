import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWhen } from "../lib/format";
import { readSessionToken } from "../lib/session";
import { displayAuthor, messageBody, slackParts, type SlackTextPart } from "../lib/slackText";
import type { SlackFile, SlackMessage } from "../types";
import { SourceBadge } from "./SourceBadge";

const previewCache = new Map<string, string>();
const previewInflight = new Map<string, Promise<string>>();

export function SlackFeed({ messages }: { messages: SlackMessage[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!needle) return messages;
    return messages.filter((message) => searchable(message).includes(needle));
  }, [messages, needle]);

  return (
    <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Slack messages</h3>
          <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
            {needle
              ? `Showing ${visible.length} of ${messages.length}`
              : `${messages.length} recent ${messages.length === 1 ? "message" : "messages"}`}
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="slack-message-search"
            value={query}
            placeholder="Search messages"
            aria-label="Search messages"
            aria-controls="slack-message-list"
            className="h-9 bg-background pr-9 pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {needle ? "No messages match that search." : "No messages in this channel yet."}
        </p>
      ) : (
        <ul id="slack-message-list" aria-label="Slack messages" className="divide-y divide-border/60">
          {visible.map((message) => (
            <MessageRow key={message.id} message={message} query={query.trim()} />
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
        {files.length > 0 ? (
          <ul className="mt-2 grid gap-2">
            {files.map((file) => (
              <li key={file.id}>{file.kind === "image" ? <SlackImage file={file} query={query} /> : <FileCard file={file} query={query} />}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const preview = usePreview(file.preview ? file.id : null, visible);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  if (!file.preview || preview.failed) return <FileCard file={file} query={query} />;

  const image = preview.src ? (
    <img
      src={preview.src}
      alt={file.title || file.name}
      className="max-h-72 max-w-full rounded-xl border border-border/80 bg-muted/20 object-contain sm:max-w-sm"
    />
  ) : (
    <div className="h-40 w-full max-w-sm animate-pulse rounded-xl bg-muted" aria-hidden="true" />
  );

  return (
    <div ref={ref} className="max-w-sm">
      {file.permalink ? (
        <a href={file.permalink} target="_blank" rel="noreferrer" className="inline-block max-w-full" title="Open in Slack">
          {image}
        </a>
      ) : (
        image
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">
        <Highlight text={file.title || file.name} query={query} />
      </p>
    </div>
  );
}

function FileCard({ file, query }: { file: SlackFile; query: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const preview = usePreview(file.preview && file.kind !== "image" ? file.id : null, visible);
  const Icon = fileIcon(file);
  const label = `${file.title || file.name}, ${file.prettyType}, ${formatBytes(file.size)}`;

  useEffect(() => {
    const node = ref.current;
    if (!node || visible || !file.preview) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [file.preview, visible]);

  const body = (
    <>
      {preview.src ? (
        <img src={preview.src} alt="" className="size-12 shrink-0 rounded-lg border border-border/70 object-cover" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          <Highlight text={file.title || file.name} query={query} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {file.prettyType}
          {file.size > 0 ? ` · ${formatBytes(file.size)}` : ""}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full max-w-md items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-left",
    file.permalink && "hover:bg-muted/40",
  );

  return (
    <div ref={ref}>
      {file.permalink ? (
        <a href={file.permalink} target="_blank" rel="noreferrer" className={className} aria-label={`Open ${label} in Slack`}>
          {body}
        </a>
      ) : (
        <div className={className} aria-label={label}>
          {body}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const index = lower.indexOf(q, cursor);
    if (index < 0) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <mark key={key} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    key += 1;
    cursor = index + needle.length;
  }
  return <>{nodes}</>;
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

function searchable(message: SlackMessage): string {
  return [
    displayAuthor(message.author),
    message.text,
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

function fileIcon(file: SlackFile) {
  const kind = `${file.filetype} ${file.mimetype} ${file.prettyType}`.toLowerCase();
  if (file.kind === "image" || kind.includes("image")) return ImageIcon;
  if (kind.includes("sheet") || kind.includes("csv") || kind.includes("excel") || kind.includes("xls")) {
    return FileSpreadsheetIcon;
  }
  if (kind.includes("zip") || kind.includes("archive") || kind.includes("gzip")) return FileArchiveIcon;
  if (kind.includes("audio") || kind.includes("mp3") || kind.includes("m4a")) return FileAudioIcon;
  if (kind.includes("video") || kind.includes("mp4") || kind.includes("mov")) return FileVideoIcon;
  if (kind.includes("pdf") || kind.includes("text") || kind.includes("doc")) return FileTextIcon;
  return FileIcon;
}
