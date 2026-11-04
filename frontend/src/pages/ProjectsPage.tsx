import { useState } from "react";
import { SearchIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../components/EmptyState";
import { MarkIcon } from "../components/marks";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardsSkeleton } from "../components/PageSkeleton";
import { CardGrid, RecordCard } from "../components/Surface";
import { Input } from "@/components/ui/input";
import { useApi } from "../lib/useApi";
import { useAuth } from "../app/AuthContext";
import type { Envelope, Project } from "../types";

export function ProjectsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Envelope<Project[]>>("/projects");
  const projects = data?.data ?? [];
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();

  const visible = projects.filter((project) => {
    const haystack = `${project.name} ${project.summary} ${project.owner} ${project.organisation}`.toLowerCase();
    return !trimmedQuery || haystack.includes(trimmedQuery.toLowerCase());
  });

  const roleNote =
    user?.role === "consultant"
      ? "Showing only projects assigned to your account."
      : user?.role === "viewer"
        ? "Viewer access excludes budget and audit detail."
        : null;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        lede="Active workstreams across Impact One operations and IOC programmes."
      />
      {loading && !data ? <CardsSkeleton label="Loading projects" count={4} /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {roleNote ? (
        <div className="mb-6">
          <Note>{roleNote}</Note>
        </div>
      ) : null}
      {data ? (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="project-search"
              value={query}
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-10 bg-card pl-9"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {visible.length === 0 ? (
            trimmedQuery ? (
              <div role="status" className="surface flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center ring-0">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <SearchXIcon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-base font-semibold tracking-tight text-foreground">No projects found</p>
                <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
                  Nothing matches <span className="font-medium text-foreground">“{trimmedQuery}”</span>. Search by name,
                  owner, or organisation.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 h-9 bg-background"
                  onClick={() => {
                    setQuery("");
                    document.getElementById("project-search")?.focus();
                  }}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <EmptyState title="No projects yet" description="Projects assigned to your account will appear here." />
            )
          ) : (
            <CardGrid>
              {visible.map((project) => (
                <li key={project.id}>
                  <RecordCard
                    kicker={project.organisation}
                    title={project.name}
                    to={`/projects/${project.id}`}
                    origin={project.source.origin}
                    summary={project.summary}
                    mark={<MarkIcon name={project.name} />}
                    fields={[
                      { label: "Owner", value: project.owner },
                      { label: "Status", value: project.status },
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
