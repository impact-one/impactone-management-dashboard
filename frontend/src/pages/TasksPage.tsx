import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CircleCheckIcon,
  FileTextIcon,
  FolderIcon,
  ListTodoIcon,
  LoaderCircleIcon,
  SearchIcon,
  SquareCheckBigIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceBadge } from "../components/SourceBadge";
import { EmptyState } from "../components/EmptyState";
import { RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { Input } from "@/components/ui/input";
import { dueState, formatDate, formatWhen, isCompletedStatus, isInProgressStatus } from "../lib/format";
import { useTitle } from "../lib/useTitle";
import { useApi } from "../lib/useApi";
import type { DashboardData, Envelope, Project, Task, TaskAttachment, TaskPriority } from "../types";

type CardId = "all" | "progress" | "overdue" | "done";
type DueFilter = "all" | "overdue" | "soon" | "later" | "none";

const selectClass =
  "h-8 max-w-full rounded-full border border-border bg-card px-3 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const tableCols =
  "md:grid-cols-[minmax(9rem,1.3fr)_minmax(7rem,1fr)_7.5rem_5.5rem_7.5rem_7rem_6.5rem]";

function statusDot(name: string) {
  const key = String(name ?? "").toLowerCase();
  if (key === "complete" || key === "completed" || key === "done" || key === "closed") return "bg-[var(--brand-leaf)]";
  if (key.includes("progress") || key === "doing" || key === "active") return "bg-[var(--brand-cyan)]";
  if (key.includes("risk") || key.includes("hold") || key.includes("block") || key === "cancelled") return "bg-[var(--origin-review-dot)]";
  return "bg-muted-foreground/40";
}

function Status({ value }: { value: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", statusDot(value))} aria-hidden="true" />
      {value}
    </span>
  );
}

function asPriority(value: unknown): TaskPriority | null {
  if (value === "urgent" || value === "high" || value === "normal" || value === "low") return value;
  if (value && typeof value === "object" && "priority" in value) {
    return asPriority((value as { priority?: unknown }).priority);
  }
  return null;
}

function priorityLabel(value: TaskPriority | null) {
  if (!value) return "None";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Priority({ value }: { value: unknown }) {
  const priority = asPriority(value);
  return <span className="text-xs text-foreground">{priority ? priorityLabel(priority) : "—"}</span>;
}

function stamp(value: string | null) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  return formatWhen(value);
}

function relativeTime(value: string | null) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return stamp(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return stamp(value);
}

function shortName(value: string) {
  const tail = value.split("·").pop()?.trim() || value;
  return tail;
}

function filesOf(task: Task): TaskAttachment[] {
  return Array.isArray(task.attachments) ? task.attachments : [];
}

function asTask(task: Task): Task {
  if (!task || typeof task !== "object") {
    return {
      id: "unknown",
      projectId: null,
      projectName: "Unassigned",
      listName: "",
      title: "Untitled",
      description: "",
      owner: "Unassigned",
      responsibility: "",
      status: "—",
      priority: null,
      dueDate: null,
      updatedAt: null,
      createdAt: null,
      parentId: null,
      tags: [],
      attachments: [],
      checklist: [],
      comments: [],
      source: { origin: "needs-review", system: "Unknown", detail: "" },
      href: null,
    };
  }
  return {
    ...task,
    id: String(task.id || "unknown"),
    title: task.title || "Untitled",
    description: typeof task.description === "string" ? task.description : "",
    owner: task.owner || "Unassigned",
    status: typeof task.status === "string" && task.status ? task.status : "—",
    priority: asPriority(task.priority),
    dueDate: typeof task.dueDate === "string" ? task.dueDate : null,
    updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : null,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : null,
    listName: task.listName || task.projectName || "",
    parentId: task.parentId ?? null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    attachments: filesOf(task),
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
    comments: Array.isArray(task.comments) ? task.comments : [],
    source: task.source ?? { origin: "needs-review", system: "Unknown", detail: "" },
    href: task.href ?? null,
  };
}

function attachmentSummary(task: Task) {
  const images = filesOf(task).filter((file) => file.kind === "image").length;
  const files = filesOf(task).filter((file) => file.kind === "file").length;
  const parts: string[] = [];
  if (images) parts.push(`${images} ${images === 1 ? "image" : "images"}`);
  if (files) parts.push(`${files} ${files === 1 ? "file" : "files"}`);
  return parts.join(" · ");
}

function fileSource(task: Task, file: TaskAttachment, thumb: boolean): string | null {
  if (file.url?.startsWith("data:image/")) return file.url;
  if (typeof task.id === "string" && task.id.startsWith("clickup-") && (thumb ? file.thumbnailUrl ?? file.url : file.url)) {
    return `/api/tasks/${encodeURIComponent(task.id)}/files/${encodeURIComponent(file.id)}${thumb ? "?size=thumb" : ""}`;
  }
  return thumb ? file.thumbnailUrl ?? file.url : file.url;
}

function isOverdue(task: Task) {
  return !isCompletedStatus(task) && dueState(task.dueDate) === "overdue";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{children}</h3>;
}

function AttachmentImage({ task, file }: { task: Task; file: TaskAttachment }) {
  const [failed, setFailed] = useState(false);
  const src = fileSource(task, file, true);
  if (!src || failed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted px-3 text-center text-xs text-muted-foreground ring-1 ring-border/70">
        {file.title}
      </div>
    );
  }
  const full = fileSource(task, file, false) ?? src;
  return (
    <a href={full} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-muted ring-1 ring-border/70">
      <img src={src} alt={file.title} className="aspect-video w-full object-cover" onError={() => setFailed(true)} />
    </a>
  );
}

function FileRow({ task, file }: { task: Task; file: TaskAttachment }) {
  const href = fileSource(task, file, false);
  const body = (
    <>
      <FileTextIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{file.title}</span>
        <span className="text-xs text-muted-foreground">
          {file.extension ? file.extension.toUpperCase() : "File"}
          {href ? "" : " · No file link"}
        </span>
      </span>
    </>
  );
  const className = "flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-2";
  if (!href) return <div className={className}>{body}</div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(className, "hover:bg-accent/40")}>
      {body}
    </a>
  );
}

function TaskBody({
  task,
  pending,
  subtasks,
  onClose,
}: {
  task: Task;
  pending: boolean;
  subtasks: Task[];
  onClose: () => void;
}) {
  const images = filesOf(task).filter((file) => file.kind === "image");
  const files = filesOf(task).filter((file) => file.kind === "file");
  const checks = Array.isArray(task.checklist) ? task.checklist : [];
  const comments = Array.isArray(task.comments) ? task.comments : [];
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const doneChecks = checks.filter((item) => item.resolved).length;
  const doneSubs = subtasks.filter((item) => isCompletedStatus(item)).length;

  return (
    <div className="surface flex h-full min-h-[32rem] flex-col rounded-2xl bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold">Task Details</p>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close task details"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Status value={task.status} />
          {task.source?.origin ? <SourceBadge origin={task.source.origin} /> : null}
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{task.title}</h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">{task.projectName}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Assignee">{task.owner}</Field>
          <Field label="Priority">
            <Priority value={task.priority} />
          </Field>
          <Field label="Due date">{task.dueDate ? formatDate(task.dueDate) : "—"}</Field>
          <Field label="List">{shortName(task.listName || task.projectName)}</Field>
        </dl>

        {tags.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tags</span> · {tags.join(", ")}
          </p>
        ) : null}

        <section className="mt-5 border-t border-border/60 pt-4">
          <SectionLabel>Description</SectionLabel>
          {task.description ? (
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No description added.</p>
          )}
        </section>

        <section className="mt-5">
          <SectionLabel>Images</SectionLabel>
          {pending && images.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading images…</p>
          ) : images.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No images attached.</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {images.map((file) => (
                <AttachmentImage key={file.id} task={task} file={file} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-5">
          <SectionLabel>Documents and files</SectionLabel>
          {pending && files.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading files…</p>
          ) : files.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No documents or files attached.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {files.map((file) => (
                <li key={file.id}>
                  <FileRow task={task} file={file} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Subtasks</SectionLabel>
            <span className="text-xs text-muted-foreground tabular-nums">
              {doneSubs + doneChecks}/{subtasks.length + checks.length}
            </span>
          </div>
          {subtasks.length === 0 && checks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No subtasks.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {checks.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      item.resolved ? "border-primary bg-accent text-primary" : "border-border bg-card",
                    )}
                    aria-hidden="true"
                  >
                    {item.resolved ? <CircleCheckIcon className="size-3" /> : null}
                  </span>
                  <span className={item.resolved ? "text-muted-foreground" : "text-foreground"}>{item.name}</span>
                </li>
              ))}
              {subtasks.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.title}</span>
                  <Status value={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5 border-t border-border/60 pt-4">
          <SectionLabel>Comments</SectionLabel>
          {pending && comments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No comments.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <p className="text-sm text-foreground">{comment.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {comment.author}
                    {comment.postedAt ? ` · ${relativeTime(comment.postedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5 border-t border-border/60 pt-4">
          <SectionLabel>Activity</SectionLabel>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {task.createdAt ? <li>Created {relativeTime(task.createdAt)}</li> : null}
            {task.updatedAt ? <li>Updated {relativeTime(task.updatedAt)}</li> : null}
            {!task.createdAt && !task.updatedAt ? <li>No activity recorded.</li> : null}
          </ul>
        </section>

        {task.href ? (
          <a
            href={task.href}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open in ClickUp
          </a>
        ) : null}
      </div>
    </div>
  );
}

type TaskGroup = { key: string; name: string; projectId: string | null; rows: Task[] };
type BoardView = "project" | "all";

function TaskTable({
  title,
  rows,
  total,
  shownId,
  onOpen,
}: {
  title: string;
  rows: Task[];
  total: number;
  shownId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="overflow-x-auto rounded-2xl bg-card ring-1 ring-border/70">
      <h2 className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {rows.length}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">No tasks on this project.</p>
      ) : (
        <>
          <div
            className={cn(
              "hidden min-w-[46rem] gap-3 px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid",
              tableCols,
            )}
          >
            <span>Task</span>
            <span>Project</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Due date</span>
            <span>Updated</span>
          </div>
          <ul>
            {rows.map((row) => {
              const selected = shownId === row.id;
              const files = attachmentSummary(row);
              return (
                <li key={row.id} className={cn("border-t border-border/60", selected && "bg-accent/40")}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onOpen(row.id)}
                    className={cn(
                      "grid w-full grid-cols-1 items-start gap-1 px-5 py-3 text-left md:min-w-[46rem] md:items-center md:gap-3",
                      tableCols,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium" title={row.title}>
                        {row.title}
                      </span>
                      {files ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{files}</span> : null}
                    </span>
                    <span className="truncate text-sm text-muted-foreground" title={row.projectName}>
                      {shortName(row.projectName)}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{row.owner}</span>
                    <Priority value={row.priority} />
                    <Status value={row.status} />
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        isOverdue(row) ? "font-medium text-[var(--due-overdue-fg)]" : "text-muted-foreground",
                      )}
                    >
                      {row.dueDate ? formatDate(row.dueDate) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{relativeTime(row.updatedAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
            Showing {rows.length} of {total} tasks
          </p>
        </>
      )}
    </section>
  );
}

function ProjectCard({
  group,
  shownId,
  onOpen,
}: {
  group: TaskGroup;
  shownId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <h2 className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            <FolderIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold">{group.name}</span>
        </span>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
          {group.rows.length}
        </span>
      </h2>
      {group.rows.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-border/70 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground">
            <SquareCheckBigIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">No tasks on this project</span>
            <span className="block text-xs text-muted-foreground">Add a task to start tracking work.</span>
          </span>
        </div>
      ) : (
        <ul className="border-t border-border/70">
          {group.rows.map((row) => {
            const selected = shownId === row.id;
            return (
              <li key={row.id} className={cn("border-b border-border/60 last:border-b-0", selected && "bg-accent/40")}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onOpen(row.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium" title={row.title}>
                      {row.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Status value={row.status} />
                      <span className="truncate">{row.owner}</span>
                      <span className={cn("tabular-nums", isOverdue(row) && "font-medium text-[var(--due-overdue-fg)]")}>
                        {row.dueDate ? formatDate(row.dueDate) : "No date"}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TasksPage() {
  const { data, error, loading, reload } = useApi<Envelope<Task[]>>("/tasks");
  const projectQuery = useApi<Envelope<Project[]>>("/projects");
  const desk = useApi<Envelope<DashboardData>>(data && !data.meta.statuses?.length ? "/dashboard" : null);
  const [query, setQuery] = useState("");
  const [card, setCard] = useState<CardId>("all");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [priority, setPriority] = useState("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [board, setBoard] = useState<BoardView>("project");
  const tasks = (Array.isArray(data?.data) ? data.data : []).map(asTask);
  const projectList = Array.isArray(projectQuery.data?.data) ? projectQuery.data.data : [];
  useTitle("Tasks");
  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.owner))).sort(), [tasks]);
  const statuses = useMemo(() => {
    const order = data?.meta.statuses?.length
      ? data.meta.statuses
      : (desk.data?.data.statuses ?? []).map((item) => item.name);
    const names = new Set<string>(order);
    for (const task of tasks) names.add(task.status);
    const extras = [...names].filter((name) => !order.includes(name)).sort();
    return [...order.filter((name) => names.has(name)), ...extras];
  }, [data?.meta.statuses, desk.data?.data.statuses, tasks]);

  const cards = useMemo(
    () => [
      { id: "all" as const, label: "Total Tasks", count: tasks.length, icon: <ListTodoIcon /> },
      { id: "progress" as const, label: "In Progress", count: tasks.filter(isInProgressStatus).length, icon: <LoaderCircleIcon /> },
      { id: "overdue" as const, label: "Overdue", count: tasks.filter(isOverdue).length, icon: <TriangleAlertIcon /> },
      { id: "done" as const, label: "Completed", count: tasks.filter(isCompletedStatus).length, icon: <CircleCheckIcon /> },
    ],
    [tasks],
  );

  const visible = tasks.filter((task) => {
    const haystack = `${task.title} ${task.description ?? ""} ${task.owner} ${task.projectName} ${task.status} ${task.priority ?? ""} ${filesOf(task).map((file) => file.title).join(" ")}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && task.status !== status) return false;
    if (project === "unassigned" && task.projectId) return false;
    if (project !== "all" && project !== "unassigned" && task.projectId !== project) return false;
    if (assignee !== "all" && task.owner !== assignee) return false;
    if (priority === "none" && task.priority) return false;
    if (priority !== "all" && priority !== "none" && task.priority !== priority) return false;
    if (due === "overdue" && !isOverdue(task)) return false;
    if (due !== "all" && due !== "overdue" && dueState(task.dueDate) !== due) return false;
    if (card === "progress" && !isInProgressStatus(task)) return false;
    if (card === "done" && !isCompletedStatus(task)) return false;
    if (card === "overdue" && !isOverdue(task)) return false;
    return true;
  });

  const active = panelOpen ? (visible.find((task) => task.id === selectedId) ?? visible[0] ?? null) : null;
  const detail = useApi<Envelope<Task>>(active ? `/tasks/${encodeURIComponent(active.id)}` : null);
  const detailTask =
    detail.data?.data && !Array.isArray(detail.data.data) && detail.data.data.id === active?.id
      ? asTask(detail.data.data)
      : null;
  const shown = detailTask ?? active;
  const subtasks = shown ? tasks.filter((task) => task.parentId === shown.id) : [];
  const filtersOn =
    project !== "all" || assignee !== "all" || status !== "all" || priority !== "all" || due !== "all" || card !== "all";

  useEffect(() => {
    if (!selectedId || !panelOpen) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    document.getElementById("task-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [panelOpen, selectedId]);

  const groups = useMemo(() => {
    const byId = new Map<string, Task[]>();
    const loose: Task[] = [];
    for (const task of visible) {
      if (!task.projectId) {
        loose.push(task);
        continue;
      }
      const list = byId.get(task.projectId) ?? [];
      list.push(task);
      byId.set(task.projectId, list);
    }

    const narrowing =
      Boolean(query.trim()) || status !== "all" || assignee !== "all" || priority !== "all" || due !== "all" || card !== "all";
    const known = new Set(projectList.map((item) => item.id));
    const sections: TaskGroup[] = projectList.map((item) => ({
      key: item.id,
      name: item.name,
      projectId: item.id,
      rows: byId.get(item.id) ?? [],
    }));
    for (const [id, rows] of byId) {
      if (projectList.length > 0 && known.has(id)) continue;
      sections.push({
        key: id,
        name: rows[0]?.projectName || "Project",
        projectId: id,
        rows,
      });
    }

    const shown = sections.filter((section) => {
      if (project !== "all" && project !== section.projectId) return false;
      if (section.rows.length > 0) return true;
      return !narrowing;
    });
    if (loose.length > 0 && (project === "all" || project === "unassigned")) {
      shown.push({ key: "unassigned", name: "Unassigned", projectId: null, rows: loose });
    }
    return shown;
  }, [assignee, card, due, priority, project, projectList, query, status, visible]);

  function clearFilters() {
    setProject("all");
    setAssignee("all");
    setStatus("all");
    setPriority("all");
    setDue("all");
    setCard("all");
  }

  function openTask(id: string) {
    setSelectedId(id);
    setPanelOpen(true);
  }

  const projectGroups = groups.filter((group) => group.key !== "unassigned");
  const unassigned = groups.find((group) => group.key === "unassigned");
  const overdueCount = cards.find((item) => item.id === "overdue")?.count ?? 0;
  const doneCount = cards.find((item) => item.id === "done")?.count ?? 0;
  const progressCount = cards.find((item) => item.id === "progress")?.count ?? 0;
  const doneShare = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  return (
    <>
      {loading && !data ? <TablePageSkeleton label="Loading tasks" columns={7} filters={2} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data ? (
        <div className={cn("grid items-start gap-4", shown && "lg:grid-cols-[minmax(0,1fr)_19rem]")}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
                <p className="mt-1 text-sm text-muted-foreground">Everything across your projects, in one place.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="task-search"
                  value={query}
                  placeholder="Search tasks"
                  aria-label="Search tasks"
                  className="h-10 rounded-full bg-card pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {cards.map((item) => {
                const selected = card === item.id;
                const alert = item.id === "overdue" && item.count > 0;
                const hint =
                  item.id === "all"
                    ? "Across all projects"
                    : item.id === "progress"
                      ? progressCount === 0
                        ? "Nothing started yet"
                        : "Currently in progress"
                      : item.id === "overdue"
                        ? item.count > 0
                          ? "Needs attention"
                          : "None past due"
                        : `${doneShare}% done`;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCard(item.id === "all" || selected ? "all" : item.id)}
                    className={cn(
                      "flex flex-col rounded-2xl px-3.5 py-3.5 text-left",
                      alert
                        ? "bg-[color-mix(in_oklch,var(--origin-review-dot)_9%,white)] shadow-sm ring-1 ring-[color-mix(in_oklch,var(--origin-review-dot)_32%,transparent)]"
                        : "surface bg-card",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("text-[11px] font-medium text-muted-foreground", alert && "text-[var(--due-overdue-fg)]")}>
                        {item.id === "all" ? "Total tasks" : item.id === "progress" ? "In progress" : item.id === "overdue" ? "Overdue" : "Completed"}
                      </span>
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-lg ring-1 [&_svg]:size-3.5",
                          alert
                            ? "bg-[color-mix(in_oklch,var(--origin-review-dot)_14%,white)] text-[var(--due-overdue-fg)] ring-[color-mix(in_oklch,var(--origin-review-dot)_20%,transparent)]"
                            : "bg-accent text-primary ring-primary/10",
                        )}
                      >
                        {item.icon}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-2 text-2xl leading-none font-semibold tracking-tight tabular-nums",
                        alert && "text-[var(--due-overdue-fg)]",
                      )}
                    >
                      {item.count}
                    </span>
                    <span className={cn("mt-1.5 text-xs text-muted-foreground", alert && "text-[var(--due-overdue-fg)]")}>{hint}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Project" value={project} onChange={(event) => setProject(event.target.value)} className={selectClass}>
              <option value="all">All projects</option>
              {projectList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              {tasks.some((task) => !task.projectId) ? <option value="unassigned">Unassigned</option> : null}
            </select>
              <select aria-label="Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} className={selectClass}>
                <option value="all">All assignees</option>
                {assignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
                <option value="all">All statuses</option>
                {statuses.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} className={selectClass}>
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="none">No priority</option>
              </select>
              <select
                aria-label="Due date"
                value={due}
                onChange={(event) => setDue(event.target.value as DueFilter)}
                className={selectClass}
              >
                <option value="all">Due date</option>
                <option value="overdue">Overdue</option>
                <option value="soon">This week</option>
                <option value="later">Later</option>
                <option value="none">No date</option>
              </select>
              <button
                type="button"
                aria-pressed={card === "overdue"}
                onClick={() => setCard(card === "overdue" ? "all" : "overdue")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-xs",
                  card === "overdue"
                    ? "border-dashed border-[color-mix(in_oklch,var(--origin-review-dot)_45%,var(--border))] text-foreground"
                    : "border-border text-foreground",
                )}
              >
                Overdue
                <span className="grid min-w-4 place-items-center rounded-full bg-[color-mix(in_oklch,var(--origin-review-dot)_16%,white)] px-1 text-[10px] font-semibold text-[var(--due-overdue-fg)] tabular-nums">
                  {overdueCount}
                </span>
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!filtersOn}
                className="h-8 px-1 text-xs font-medium text-primary disabled:text-muted-foreground"
              >
                Clear filters
              </button>
            </div>
              <div className="inline-flex shrink-0 self-end rounded-lg bg-muted p-0.5 sm:self-auto" role="group" aria-label="Task layout">
                <button
                  type="button"
                  aria-pressed={board === "project"}
                  onClick={() => setBoard("project")}
                  className={cn(
                    "h-7 rounded-md px-3 text-xs font-medium",
                    board === "project" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  By project
                </button>
                <button
                  type="button"
                  aria-pressed={board === "all"}
                  onClick={() => setBoard("all")}
                  className={cn(
                    "h-7 rounded-md px-3 text-xs font-medium",
                    board === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  All tasks
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No tasks match" description="Try a different search or filter." />
              </div>
            ) : board === "all" ? (
              visible.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No tasks match" description="Try a different search or filter." />
                </div>
              ) : (
                <div className="mt-5">
                  <TaskTable
                    title="All tasks"
                    rows={visible}
                    total={visible.length}
                    shownId={shown?.id ?? null}
                    onOpen={openTask}
                  />
                </div>
              )
            ) : (
              <div className="mt-5 space-y-4">
                {projectGroups.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {projectGroups.map((group) => (
                      <ProjectCard key={group.key} group={group} shownId={shown?.id ?? null} onOpen={openTask} />
                    ))}
                  </div>
                ) : null}
                {unassigned ? (
                  <TaskTable
                    title={unassigned.name}
                    rows={unassigned.rows}
                    total={visible.length}
                    shownId={shown?.id ?? null}
                    onOpen={openTask}
                  />
                ) : null}
              </div>
            )}
          </div>

          {shown ? (
            <aside id="task-detail" className="lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]">
              <TaskBody
                key={shown.id}
                task={shown}
                pending={detail.loading && !detailTask}
                subtasks={subtasks}
                onClose={() => setPanelOpen(false)}
              />
            </aside>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
