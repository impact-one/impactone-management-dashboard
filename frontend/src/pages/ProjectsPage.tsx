import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { MarkIcon } from "../components/marks";
import { Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardGrid, RecordCard } from "../components/Surface";
import { plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import { useAuth } from "../app/AuthContext";
import type { Envelope, Origin, Project } from "../types";

export function ProjectsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Envelope<Project[]>>("/projects");
  const projects = data?.data ?? [];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [org, setOrg] = useState("all");
  const [origin, setOrigin] = useState<Origin | "all">("all");

  const orgs = useMemo(() => Array.from(new Set(projects.map((item) => item.organisation))), [projects]);
  const statuses = useMemo(() => Array.from(new Set(projects.map((item) => item.status))), [projects]);

  const visible = projects.filter((project) => {
    const haystack = `${project.name} ${project.summary} ${project.owner}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (status !== "all" && project.status !== status) return false;
    if (org !== "all" && project.organisation !== org) return false;
    if (origin !== "all" && project.source.origin !== origin) return false;
    return true;
  });

  const roleNote =
    user?.role === "consultant"
      ? "Your role only shows projects assigned to you."
      : user?.role === "viewer"
        ? "Viewer access shows the shared workstreams without budget or audit."
        : null;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        lede="Impact One company work and the IOC project named in the brief. What you see depends on your role."
      >
        {data ? (
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">In view</p>
            <p className="text-2xl font-semibold tabular-nums">{projects.length}</p>
          </div>
        ) : null}
      </PageHeader>
      {loading && !data ? <Loading label="Loading projects" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {roleNote ? <Note>{roleNote}</Note> : null}
      <FilterBar>
        <FilterSearch id="project-search" label="Search projects" value={query} onChange={setQuery} />
        <FilterSelect
          id="project-org"
          label="Organisation"
          value={org}
          onChange={setOrg}
          options={[{ value: "all", label: "All organisations" }, ...orgs.map((name) => ({ value: name, label: name }))]}
        />
        <FilterSelect
          id="project-status"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            ...statuses.map((item) => ({ value: item, label: plainStatus(item) })),
          ]}
        />
        <FilterOrigin value={origin} onChange={setOrigin} />
      </FilterBar>
      {data ? <ResultCount shown={visible.length} total={projects.length} label="projects" /> : null}
      {data && visible.length === 0 ? (
        <EmptyState
          title="No projects match"
          description="Try clearing search or origin filters. Role visibility can also hide some workstreams."
        />
      ) : (
        <CardGrid>
          {visible.map((project) => (
            <li key={project.id}>
              <RecordCard
                kicker={project.organisation}
                title={
                  <Link className="hover:text-primary" to={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                }
                origin={project.source.origin}
                summary={project.summary}
                mark={<MarkIcon name={project.name} />}
                fields={[
                  { label: "Owner", value: project.owner },
                  { label: "Status", value: <span className="capitalize">{plainStatus(project.status)}</span> },
                  { label: "Source", value: project.source.system, wide: true },
                ]}
                flags={project.reviewFlags}
              />
            </li>
          ))}
        </CardGrid>
      )}
    </>
  );
}
