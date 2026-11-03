import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleCheckIcon,
  ClipboardListIcon,
  ListTodoIcon,
  LoaderCircleIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "../components/EmptyState";
import { RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { Input } from "@/components/ui/input";
import { dueState, formatDate } from "../lib/format";
import { useTitle } from "../lib/useTitle";
import { useApi } from "../lib/useApi";
import type { DashboardData, Envelope, Task } from "../types";

function statusIcon(name: string) {
  const key = name.toLowerCase();
  if (key.includes("progress")) return <LoaderCircleIcon />;
  if (key.includes("plan")) return <ClipboardListIcon />;
  if (key.includes("risk") || key.includes("hold") || key === "cancelled") return <TriangleAlertIcon />;
  if (key === "complete" || key === "done" || key === "closed") return <CircleCheckIcon />;
  return <ListTodoIcon />;
}

function Status({ value }: { value: string }) {
  const key = value.toLowerCase();
  const dot = key === "complete" || key === "done" || key === "closed"
    ? "bg-[var(--brand-leaf)]"
    : key.includes("progress")
      ? "bg-[var(--brand-cyan)]"
      : key.includes("risk") || key.includes("hold") || key === "cancelled"
        ? "bg-[var(--origin-review-dot)]"
        : "bg-muted-foreground/40";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {value}
    </span>
  );
}

function DueText({ value }: { value: string | null }) {
  const state = dueState(value);
  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums",
        state === "overdue" ? "font-medium text-[var(--due-overdue-fg)]" : "text-muted-foreground",
      )}
    >
      {value ? formatDate(value) : "—"}
    </span>
  );
}

export function TasksPage() {
  const { data, error, loading, reload } = useApi<Envelope<Task[]>>("/tasks");
  const desk = useApi<Envelope<DashboardData>>(data && !data.meta.statuses?.length ? "/dashboard" : null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const tasks = data?.data ?? [];
  useTitle("Tasks");

  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.projectName))).sort(), [tasks]);
  const statusTabs = useMemo(() => {
    const order = data?.meta.statuses?.length
      ? data.meta.statuses
      : (desk.data?.data.statuses.map((item) => item.name) ?? []);
    const counts = new Map<string, number>();
    for (const name of order) counts.set(name, 0);
    for (const task of tasks) counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    const names = order.length ? order : [...counts.keys()];
    return names.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }, [data?.meta.statuses, desk.data?.data.statuses, tasks]);

  const visible = tasks.filter((task) => {
    const haystack = `${task.title} ${task.owner} ${task.projectName}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && task.status !== status) return false;
    if (project !== "all" && task.projectName !== project) return false;
    if (overdueOnly && dueState(task.dueDate) !== "overdue") return false;
    return true;
  });

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

  return (
    <>
      {loading && !data ? <TablePageSkeleton label="Loading tasks" columns={4} filters={1} /> : null}
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

          {statusTabs.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {statusTabs.slice(0, 4).map((tab) => {
                const selected = status === tab.name;
                return (
                  <button
                    key={tab.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setStatus(selected ? "all" : tab.name)}
                    className={cn(
                      "surface flex flex-col rounded-2xl bg-card px-3.5 py-3.5 text-left",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-muted-foreground">{tab.name}</span>
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-primary ring-1 ring-primary/10 [&_svg]:size-3.5">
                        {statusIcon(tab.name)}
                      </span>
                    </span>
                    <span className="mt-2 text-xl leading-none font-semibold tracking-tight tabular-nums">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              id="task-project"
              aria-label="Project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="border-input bg-card h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="all">All projects</option>
              {projects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={overdueOnly}
              onClick={() => setOverdueOnly((current) => !current)}
              className={cn(
                "h-9 rounded-md border px-3 text-sm",
                overdueOnly
                  ? "border-transparent bg-[var(--brand-soft)] text-[var(--due-overdue-fg)]"
                  : "border-input bg-card text-foreground",
              )}
            >
              Overdue
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No tasks match" description="Try a different search or filter." />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
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
                    <div className="hidden grid-cols-[minmax(0,1.5fr)_11rem_9rem_8rem] gap-4 px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid">
                      <span>Task</span>
                      <span>Owner</span>
                      <span>Status</span>
                      <span>Due</span>
                    </div>
                    <ul>
                      {rows.map((row) => (
                        <li
                          key={row.id}
                          className="grid grid-cols-1 items-center gap-1 border-t border-border/60 px-5 py-3 md:grid-cols-[minmax(0,1.5fr)_11rem_9rem_8rem] md:gap-4"
                        >
                          <p className="truncate text-sm font-medium" title={row.title}>
                            {row.href ? (
                              <a href={row.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                                {row.title}
                              </a>
                            ) : (
                              row.title
                            )}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{row.owner}</p>
                          <Status value={row.status} />
                          <DueText value={row.dueDate} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
