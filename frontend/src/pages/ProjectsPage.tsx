import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2Icon, FolderKanbanIcon, FlagIcon, RadioIcon } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftRadarChart,
  countBy,
} from "../components/charts";
import { FilterBar, FilterOrigin, FilterSearch, FilterSelect, ResultCount } from "../components/FilterBar";
import { MarkIcon } from "../components/marks";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardsSkeleton } from "../components/PageSkeleton";
import { CardGrid, MetricStrip, RecordCard } from "../components/Surface";
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
      ? "Showing only projects assigned to your account."
      : user?.role === "viewer"
        ? "Viewer access excludes budget and audit detail."
        : null;

  const statusMix = useMemo(() => countBy(projects, (item) => plainStatus(item.status)), [projects]);
  const orgMix = useMemo(() => countBy(projects, (item) => item.organisation), [projects]);
  const liveCount = projects.filter((item) => item.source.origin === "live").length;
  const reviewCount = projects.filter((item) => item.source.origin === "needs-review" || item.reviewFlags.length).length;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        lede="Active workstreams across Impact One operations and IOC programmes."
      />
      {loading && !data ? <CardsSkeleton label="Loading projects" count={4} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {roleNote ? <div className="mb-6"><Note>{roleNote}</Note></div> : null}
      {data ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "In view", value: projects.length, icon: <FolderKanbanIcon /> },
              { label: "Organisations", value: orgs.length, icon: <Building2Icon /> },
              { label: "Statuses", value: statuses.length, icon: <FlagIcon /> },
              { label: "Live", value: liveCount, icon: <RadioIcon /> },
              { label: "Needs review", value: reviewCount, icon: <FlagIcon /> },
            ]}
          />
          <ChartRow>
            <ChartPanel title="Status mix" description="Project health" className="lg:col-span-5">
              <SoftBarChart data={statusMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="Organisation mix" className="lg:col-span-3">
              <SoftDonutChart data={orgMix} centerLabel="Orgs" compact />
            </ChartPanel>
            <ChartPanel title="Portfolio radar" description="Status spread" className="lg:col-span-4">
              <SoftRadarChart data={statusMix.length ? statusMix : orgMix} />
            </ChartPanel>
          </ChartRow>
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
          <ResultCount shown={visible.length} total={projects.length} label="projects" />
          {visible.length === 0 ? (
            <EmptyState title="No projects match" description="Clear filters to see workstreams in view." />
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
                    ]}
                    flags={project.reviewFlags}
                  />
                </li>
              ))}
            </CardGrid>
          )}
        </div>
      ) : null}
    </>
  );
}
