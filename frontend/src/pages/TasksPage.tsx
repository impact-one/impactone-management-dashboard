import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListTodoIcon, CircleAlertIcon, RadioIcon, FolderKanbanIcon } from "lucide-react";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  countBy,
} from "../components/charts";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MetricStrip } from "../components/Surface";
import { dueState, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, Origin, Task } from "../types";

const statuses = ["all", "open", "in-progress", "blocked", "done"] as const;

export function TasksPage() {
  const { data, error, loading, reload } = useApi<Envelope<Task[]>>("/tasks");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const tasks = data?.data ?? [];
  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.projectName))), [tasks]);
  const [project, setProject] = useState("all");

  const visible = tasks.filter((task) => {
    const haystack = `${task.title} ${task.owner} ${task.responsibility}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && task.status !== status) return false;
    if (project !== "all" && task.projectName !== project) return false;
    if (origin !== "all" && task.source.origin !== origin) return false;
    if (overdueOnly && dueState(task.dueDate) !== "overdue") return false;
    return true;
  });

  const statusMix = useMemo(() => countBy(tasks, (task) => plainStatus(task.status)), [tasks]);
  const originMix = useMemo(
    () =>
      countBy(tasks, (task) => {
        if (task.source.origin === "live") return "Live";
        if (task.source.origin === "sample") return "Sample";
        if (task.source.origin === "documented") return "Documented";
        return "Needs review";
      }),
    [tasks],
  );
  const projectMix = useMemo(() => countBy(tasks, (task) => task.projectName).slice(0, 6), [tasks]);
  const openCount = tasks.filter((task) => task.status === "open" || task.status === "in-progress").length;
  const overdueCount = tasks.filter((task) => dueState(task.dueDate) === "overdue").length;
  const liveCount = tasks.filter((task) => task.source.origin === "live").length;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Tasks"
        lede="Track ownership, status, and due dates across Impact One and IOC work."
      />
      {loading && !data ? <TablePageSkeleton label="Loading tasks" columns={7} filters={4} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <div className="mb-6"><Note>{data.meta.note}</Note></div> : null}
      {data ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Total tasks", value: tasks.length, icon: <ListTodoIcon /> },
              { label: "Open / active", value: openCount, icon: <FolderKanbanIcon /> },
              { label: "Overdue", value: overdueCount, icon: <CircleAlertIcon /> },
              { label: "Live rows", value: liveCount, icon: <RadioIcon /> },
              { label: "Projects", value: projects.length, icon: <FolderKanbanIcon /> },
            ]}
          />
          <ChartRow>
            <ChartPanel title="Status mix" description="Across the full task list" className="lg:col-span-5">
              <SoftBarChart data={statusMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="Source mix" description="Live vs reference data" className="lg:col-span-3">
              <SoftDonutChart data={originMix} centerLabel="Sources" compact />
            </ChartPanel>
            <ChartPanel title="By project" description="Top workstreams" className="lg:col-span-4">
              <SoftProgressTracks data={projectMix} />
            </ChartPanel>
          </ChartRow>
          <FilterBar className="lg:grid-cols-4">
            <FilterSearch id="task-search" label="Search tasks" value={query} onChange={setQuery} />
            <FilterSelect
              id="task-project"
              label="Project"
              value={project}
              onChange={setProject}
              options={[{ value: "all", label: "All projects" }, ...projects.map((name) => ({ value: name, label: name }))]}
            />
            <FilterSelect
              id="task-status"
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as (typeof statuses)[number])}
              options={statuses.map((item) => ({
                value: item,
                label: item === "all" ? "All statuses" : plainStatus(item),
              }))}
            />
            <FilterOrigin value={origin} onChange={setOrigin} />
            <label className="flex h-9 items-end gap-2 text-sm sm:col-span-2 lg:col-span-4">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={overdueOnly}
                onChange={(event) => setOverdueOnly(event.target.checked)}
              />
              Overdue only
            </label>
          </FilterBar>
          <ResultCount shown={visible.length} total={tasks.length} label="tasks" />
          <DataTable
            caption="Tasks and deadlines"
            rows={visible}
            empty="No task matches this filter."
            columns={[
              {
                key: "title",
                header: "Task",
                render: (row) =>
                  row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {row.title}
                    </a>
                  ) : (
                    row.title
                  ),
              },
              {
                key: "project",
                header: "Project",
                render: (row) =>
                  row.projectId ? (
                    <Link to={`/projects/${row.projectId}`} className="underline-offset-4 hover:underline">
                      {row.projectName}
                    </Link>
                  ) : (
                    row.projectName
                  ),
              },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              {
                key: "responsibility",
                header: "Responsibility",
                render: (row) => <span className="text-muted-foreground">{row.responsibility || "—"}</span>,
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
              },
              { key: "due", header: "Due", render: (row) => <Due value={row.dueDate} /> },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
            ]}
          />
        </div>
      ) : null}
    </>
  );
}
