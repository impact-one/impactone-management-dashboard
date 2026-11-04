import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CircleCheckIcon,
  FileTextIcon,
  ListTodoIcon,
  LoaderCircleIcon,
  SearchIcon,
  TriangleAlertIcon,
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
import type { DashboardData, Envelope, Task, TaskAttachment, TaskPriority } from "../types";

type CardId = "all" | "progress" | "overdue" | "done";
type DueFilter = "all" | "overdue" | "soon" | "later" | "none";

const selectClass =
  "border-input bg-card h-9 max-w-full rounded-md border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function statusDot(name: string) {
  const key = name.toLowerCase();
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

function priorityLabel(value: TaskPriority | null) {
  if (!value) return "None";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Priority({ value }: { value: TaskPriority | null }) {
  return <span className="text-xs text-foreground">{value ? priorityLabel(value) : "—"}</span>;
}

function stamp(value: string | null) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  return formatWhen(value);
}

function attachmentSummary(task: Task) {
  const images = task.attachments.filter((file) => file.kind === "image").length;
  const files = task.attachments.filter((file) => file.kind === "file").length;
  const parts: string[] = [];
  if (images) parts.push(`${images} ${images === 1 ? "image" : "images"}`);
  if (files) parts.push(`${files} ${files === 1 ? "file" : "files"}`);
  return parts.join(" · ");
}

function fileSource(task: Task, file: TaskAttachment, thumb: boolean): string | null {
  if (file.url?.startsWith("data:image/")) return file.url;
  if (task.id.startsWith("clickup-") && (thumb ? file.thumbnailUrl ?? file.url : file.url)) {
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
}: {
  task: Task;
  pending: boolean;
  subtasks: Task[];
}) {
  const images = task.attachments.filter((file) => file.kind === "image");
  const files = task.attachments.filter((file) => file.kind === "file");
  const doneChecks = task.checklist.filter((item) => item.resolved).length;

  return (
    <div className="surface rounded-2xl bg-card p-4 sm:p-5">
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Task details</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{task.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Status value={task.status} />
        <SourceBadge origin={task.source.origin} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Project">
          {task.projectId ? (
            <Link to={`/projects/${task.projectId}`} className="hover:text-primary hover:underline">
              {task.projectName}
            </Link>
          ) : (
            task.projectName
          )}
        </Field>
        <Field label="Priority">
          <Priority value={task.priority} />
        </Field>
        <Field label="Assignee">{task.owner}</Field>
        <Field label="Due date">{task.dueDate ? formatDate(task.dueDate) : "—"}</Field>
        {task.listName && task.listName !== task.projectName ? <Field label="List">{task.listName}</Field> : null}
        <Field label="Updated">{stamp(task.updatedAt)}</Field>
        {task.createdAt ? <Field label="Created">{stamp(task.createdAt)}</Field> : null}
      </dl>

      {task.tags.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Tags</span> · {task.tags.join(", ")}
        </p>
      ) : null}

      <section className="mt-5">
        <SectionLabel>Description</SectionLabel>
        {task.description ? (
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">{task.description}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No description.</p>
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

      {task.checklist.length > 0 ? (
        <section className="mt-5">
          <SectionLabel>Checklist</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {doneChecks}/{task.checklist.length}
          </p>
          <ul className="mt-2 space-y-1.5">
            {task.checklist.map((item) => (
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
          </ul>
        </section>
      ) : null}

      {subtasks.length > 0 ? (
        <section className="mt-5">
          <SectionLabel>Subtasks</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {subtasks.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.title}</span>
                <Status value={item.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-5">
        <SectionLabel>Comments</SectionLabel>
        {pending && task.comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading comments…</p>
        ) : task.comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No comments.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {task.comments.map((comment) => (
              <li key={comment.id}>
                <p className="text-sm text-foreground">{comment.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {comment.author}
                  {comment.postedAt ? ` · ${stamp(comment.postedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
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
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{task.source.detail}</p>
    </div>
  );
}

export function TasksPage() {
  const { data, error, loading, reload } = useApi<Envelope<Task[]>>("/tasks");
  const desk = useApi<Envelope<DashboardData>>(data && !data.meta.statuses?.length ? "/dashboard" : null);
  const [query, setQuery] = useState("");
  const [card, setCard] = useState<CardId>("all");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [priority, setPriority] = useState("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tasks = data?.data ?? [];
  useTitle("Tasks");
  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.projectName))).sort(), [tasks]);
  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.owner))).sort(), [tasks]);
  const statuses = useMemo(() => {
    const order = data?.meta.statuses?.length
      ? data.meta.statuses
      : (desk.data?.data.statuses.map((item) => item.name) ?? []);
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
    const haystack = `${task.title} ${task.description} ${task.owner} ${task.projectName} ${task.status} ${task.priority ?? ""} ${task.attachments.map((file) => file.title).join(" ")}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && task.status !== status) return false;
    if (project !== "all" && task.projectName !== project) return false;
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

  const active = visible.find((task) => task.id === selectedId) ?? visible[0] ?? null;
  const detail = useApi<Envelope<Task>>(active ? `/tasks/${encodeURIComponent(active.id)}` : null);
  const detailTask = detail.data?.data?.id === active?.id ? detail.data.data : null;
  const shown = detailTask ?? active;
  const subtasks = shown ? tasks.filter((task) => task.parentId === shown.id) : [];
  const filtersOn =
    project !== "all" || assignee !== "all" || status !== "all" || priority !== "all" || due !== "all" || card !== "all";

  useEffect(() => {
    if (!selectedId) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    document.getElementById("task-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const groups = useMemo(() => {
    const byName = new Map<string, Task[]>();
    for (const task of visible) {
      const name = task.projectName || "Unassigned";
      const list = byName.get(name) ?? [];
      list.push(task);
      byName.set(name, list);
    }
    return Array.from(byName.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [visible]);

  function clearFilters() {
    setProject("all");
    setAssignee("all");
    setStatus("all");
    setPriority("all");
    setDue("all");
    setCard("all");
  }

  return (
    <>
      {loading && !data ? <TablePageSkeleton label="Loading tasks" columns={6} filters={2} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <div className="relative w-full max-w-xs">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="task-search"
                value={query}
                placeholder="Search tasks"
                aria-label="Search tasks"
                className="h-9 bg-card pl-9"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {cards.map((item) => {
              const selected = card === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCard(item.id === "all" || selected ? "all" : item.id)}
                  className={cn(
                    "surface flex flex-col rounded-2xl bg-card px-3.5 py-3.5 text-left",
                    selected && "ring-2 ring-primary",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-primary ring-1 ring-primary/10 [&_svg]:size-3.5">
                      {item.icon}
                    </span>
                  </span>
                  <span className="mt-2 text-xl leading-none font-semibold tracking-tight tabular-nums">{item.count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select aria-label="Project" value={project} onChange={(event) => setProject(event.target.value)} className={selectClass}>
              <option value="all">All projects</option>
              {projects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
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
              <option value="all">Any due date</option>
              <option value="overdue">Overdue</option>
              <option value="soon">This week</option>
              <option value="later">Later</option>
              <option value="none">No date</option>
            </select>
            {filtersOn ? (
              <button type="button" onClick={clearFilters} className="h-9 px-2 text-sm font-medium text-primary">
                Clear filters
              </button>
            ) : null}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground tabular-nums">{visible.length}</span> of{" "}
            <span className="font-semibold text-foreground tabular-nums">{tasks.length}</span> tasks
          </p>

          {groups.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No tasks match" description="Try a different search or filter." />
            </div>
          ) : (
            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
              <div className="min-w-0 space-y-4">
                {groups.map(([name, rows]) => {
                  const projectId = rows.find((row) => row.projectId)?.projectId;
                  return (
                    <section key={name} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
                      <h2 className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
                        {projectId ? (
                          <Link to={`/projects/${projectId}`} className="truncate text-sm font-semibold hover:text-primary">
                            {name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-semibold">{name}</span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                          {rows.length}
                        </span>
                      </h2>
                      <div className="hidden grid-cols-[minmax(0,1.6fr)_8.5rem_5.5rem_8.5rem_7rem_6.5rem] gap-3 px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid">
                        <span>Task</span>
                        <span>Assignee</span>
                        <span>Priority</span>
                        <span>Status</span>
                        <span>Due date</span>
                        <span>Updated</span>
                      </div>
                      <ul>
                        {rows.map((row) => {
                          const selected = shown?.id === row.id;
                          const files = attachmentSummary(row);
                          return (
                            <li key={row.id} className={cn("border-t border-border/60", selected && "bg-accent/40")}>
                              <button
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setSelectedId(row.id)}
                                className="grid w-full grid-cols-1 items-start gap-1 px-5 py-3 text-left md:grid-cols-[minmax(0,1.6fr)_8.5rem_5.5rem_8.5rem_7rem_6.5rem] md:items-center md:gap-3"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium" title={row.title}>
                                    {row.title}
                                  </span>
                                  {row.description ? (
                                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                                      {row.description}
                                    </span>
                                  ) : null}
                                  {files ? <span className="mt-1 block text-[11px] text-muted-foreground">{files}</span> : null}
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
                                <span className="text-xs text-muted-foreground tabular-nums">{stamp(row.updatedAt)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
              {shown ? (
                <aside id="task-detail" className="order-first lg:sticky lg:top-20 lg:order-none lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                  <TaskBody key={shown.id} task={shown} pending={detail.loading && !detailTask} subtasks={subtasks} />
                </aside>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
