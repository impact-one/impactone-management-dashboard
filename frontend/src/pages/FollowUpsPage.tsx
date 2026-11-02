import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { Loading, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
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

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Follow-ups"
        lede="The open questions from the pilot brief: access, IOC confirmation, finance, and the demo with Mikolaj."
      />
      {loading && !data ? <Loading label="Loading follow-ups" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
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
      {data ? (
        <>
          <ResultCount shown={visible.length} total={rows.length} label="follow-ups" />
          <DataTable
            caption="Follow-ups"
            rows={visible}
            empty="No follow-up matches this filter."
            columns={[
              { key: "title", header: "Follow-up", render: (row) => row.title },
              {
                key: "project",
                header: "Project",
                render: (row) => (
                  <Link to={`/projects/${row.projectId}`} className="underline-offset-4 hover:underline">
                    {row.projectName}
                  </Link>
                ),
              },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <span
                    className={
                      dueState(row.dueDate) === "overdue"
                        ? "font-medium capitalize text-[var(--due-overdue-fg)]"
                        : "capitalize"
                    }
                  >
                    {plainStatus(row.status)}
                  </span>
                ),
              },
              { key: "due", header: "Due", render: (row) => <Due value={row.dueDate} /> },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
            ]}
          />
        </>
      ) : null}
    </>
  );
}
