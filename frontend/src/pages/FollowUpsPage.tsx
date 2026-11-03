import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlertIcon, MessageSquareIcon, RadioIcon, ListTodoIcon } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { PageHeader, RetryableError } from "../components/PageHeader";
import { TablePageSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MetricStrip } from "../components/Surface";
import { dueState, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, FollowUp, Origin } from "../types";

export function FollowUpsPage() {
  const { data, error, loading, reload } = useApi<Envelope<FollowUp[]>>("/follow-ups");
  const rows = data?.data ?? [];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const projects = useMemo(() => Array.from(new Set(rows.map((item) => item.projectName))), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((item) => item.status))), [rows]);

  const visible = rows.filter((item) => {
    const haystack = `${item.title} ${item.owner} ${item.source.detail}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && item.status !== status) return false;
    if (project !== "all" && item.projectName !== project) return false;
    if (origin !== "all" && item.source.origin !== origin) return false;
    if (overdueOnly && dueState(item.dueDate) !== "overdue") return false;
    return true;
  });

  const overdueCount = rows.filter((item) => dueState(item.dueDate) === "overdue").length;
  const openCount = rows.filter((item) => item.status !== "done" && item.status !== "closed").length;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Follow-ups"
        lede="Open decisions and outstanding questions that still need an owner."
      />
      {loading && !data ? <TablePageSkeleton label="Loading follow-ups" columns={6} filters={4} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Total", value: rows.length, icon: <MessageSquareIcon /> },
              { label: "Open", value: openCount, icon: <ListTodoIcon /> },
              { label: "Overdue", value: overdueCount, icon: <CircleAlertIcon /> },
              { label: "Projects", value: projects.length, icon: <RadioIcon /> },
              { label: "Statuses", value: statuses.length, icon: <ListTodoIcon /> },
            ]}
          />
          <FilterBar>
            <FilterSearch id="follow-search" label="Search follow-ups" value={query} onChange={setQuery} />
            <FilterSelect
              id="follow-project"
              label="Project"
              value={project}
              onChange={setProject}
              options={[{ value: "all", label: "All projects" }, ...projects.map((name) => ({ value: name, label: name }))]}
            />
            <FilterSelect
              id="follow-status"
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                ...statuses.map((item) => ({ value: item, label: plainStatus(item) })),
              ]}
            />
            <FilterOrigin value={origin} onChange={setOrigin} />
            <label className="flex h-9 items-end gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={overdueOnly}
                onChange={(event) => setOverdueOnly(event.target.checked)}
              />
              Overdue only
            </label>
          </FilterBar>
          <ResultCount shown={visible.length} total={rows.length} label="follow-ups" />
          <DataTable
            caption="Follow-ups"
            rows={visible}
            empty="No follow-up matches this filter."
            columns={[
              {
                key: "title",
                header: "Follow-up",
                render: (row) => (
                  <Link to="/follow-ups" className="font-medium underline-offset-4 hover:underline">
                    {row.title}
                  </Link>
                ),
              },
              { key: "project", header: "Project", render: (row) => row.projectName },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              {
                key: "status",
                header: "Status",
                render: (row) => row.status,
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
