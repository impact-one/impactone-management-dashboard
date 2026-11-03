import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ErrorNote, RetryableError } from "../components/PageHeader";
import { DetailSkeleton } from "../components/PageSkeleton";
import { formatDate, formatMoney } from "../lib/format";
import { useTitle } from "../lib/useTitle";
import { useApi } from "../lib/useApi";
import type { Envelope, ProjectDetail, Task } from "../types";

function words(value: string) {
  return value.replaceAll("-", " ");
}

function when(value: string | null) {
  return value ? formatDate(value) : "—";
}

function fee(amount: number | null, currency: string) {
  return amount === null ? "—" : formatMoney(amount, currency);
}

function taskTitle(row: Task) {
  if (!row.href) return row.title;
  return (
    <a href={row.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
      {row.title}
    </a>
  );
}

function Status({ value }: { value: string }) {
  const key = value.toLowerCase();
  const dot = key.includes("review")
    ? "bg-[var(--origin-review-dot)]"
    : key === "active" || key === "done"
      ? "bg-[var(--brand-leaf)]"
      : key.includes("progress")
        ? "bg-[var(--brand-cyan)]"
        : "bg-muted-foreground/40";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      {words(value)}
    </span>
  );
}

function Group({
  title,
  count,
  children,
  className,
}: {
  title: string;
  count: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface h-full rounded-2xl bg-card px-4 py-3.5", className)}>
      <h2 className="flex items-baseline gap-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {title}
        <span className="tracking-normal tabular-nums">{count}</span>
      </h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function Item({
  title,
  label,
  detail,
  aside,
}: {
  title: ReactNode;
  label: string;
  detail?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border/60 py-1.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground" title={label}>
          {title}
        </p>
        {detail ? <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">{detail}</p> : null}
      </div>
      {aside ? <div className="shrink-0 text-xs text-muted-foreground tabular-nums">{aside}</div> : null}
    </div>
  );
}

function Quiet({ children }: { children: string }) {
  return <p className="border-b border-border/60 py-2 text-sm text-muted-foreground">{children}</p>;
}

export function ProjectPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<Envelope<ProjectDetail>>(id ? `/projects/${id}` : null);
  const detail = data?.data;
  useTitle(detail?.project.name ?? "Project");

  if (!id) return <ErrorNote message="Project not found." />;

  const tasks = detail ? [...detail.tasks, ...detail.teamLiveTasks] : [];
  const documents = detail ? [...detail.documents, ...detail.teamLiveDocuments] : [];

  return (
    <>
      {loading && !detail ? <DetailSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {detail ? (
        <div>
          <Breadcrumbs
            className="mb-3"
            items={[
              { label: "Projects", to: "/projects" },
              { label: detail.project.name },
            ]}
          />
          <header className="flex items-start justify-between gap-8 border-b border-border/80 pb-5">
            <div className="min-w-0 max-w-2xl">
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">{detail.project.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <span>{detail.project.organisation}</span>
                <span aria-hidden="true">·</span>
                <span>{detail.project.owner}</span>
                <span aria-hidden="true">·</span>
                <Status value={detail.project.status} />
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail.project.summary}</p>
            </div>
            <Link
              to="/tasks"
              className="inline-flex shrink-0 items-center gap-1 pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              All tasks
              <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
            </Link>
          </header>

          <div className="mt-5 grid items-start gap-4 lg:grid-cols-6">
              <Group className="lg:col-span-4" title="Documents" count={documents.length}>
                {documents.length === 0 ? (
                  <Quiet>No project documents.</Quiet>
                ) : (
                  documents.map((item) => (
                    <Item
                      key={item.id}
                      label={item.title}
                      title={
                        item.href ? (
                          <a href={item.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )
                      }
                      detail={item.projectId ? item.owner : `${item.owner} · team-wide`}
                    />
                  ))
                )}
              </Group>

              <div className="grid content-start gap-4 lg:col-span-2">
                <Group title="Tasks" count={tasks.length}>
                  {tasks.length === 0 ? (
                    <Quiet>No tasks on this project.</Quiet>
                  ) : (
                    tasks.map((row) => (
                      <Item
                        key={row.id}
                        label={row.title}
                        title={taskTitle(row)}
                        detail={row.projectId ? row.owner : `${row.owner} · team-wide`}
                        aside={when(row.dueDate)}
                      />
                    ))
                  )}
                </Group>
                <Group title="Follow-ups" count={detail.followUps.length}>
                  {detail.followUps.length === 0 ? (
                    <Quiet>No open follow-ups.</Quiet>
                  ) : (
                    detail.followUps.map((row) => (
                      <Item key={row.id} label={row.title} title={row.title} detail={row.owner} aside={when(row.dueDate)} />
                    ))
                  )}
                </Group>
              </div>

              <div className="grid items-stretch gap-4 lg:col-span-6 lg:grid-cols-3">
              <Group title="Workstreams" count={detail.project.workstreams.length}>
                {detail.project.workstreams.length === 0 ? (
                  <Quiet>No workstreams listed.</Quiet>
                ) : (
                  detail.project.workstreams.map((item) => (
                    <Item
                      key={item.id}
                      label={item.name}
                      title={item.name}
                      detail={item.owner}
                      aside={<Status value={item.status} />}
                    />
                  ))
                )}
              </Group>

              <Group title="Milestones" count={detail.milestones.length}>
                {detail.milestones.length === 0 ? (
                  <Quiet>No milestones listed.</Quiet>
                ) : (
                  detail.milestones.map((row) => (
                    <Item
                      key={row.id}
                      label={row.title}
                      title={row.title}
                      detail={row.owner}
                      aside={<Status value={row.status} />}
                    />
                  ))
                )}
              </Group>

              <Group title="Consultants" count={detail.consultants.length}>
                {detail.consultants.length === 0 ? (
                  <Quiet>No consultants assigned.</Quiet>
                ) : (
                  detail.consultants.map((row) => (
                    <Item
                      key={row.id}
                      label={row.role}
                      title={row.role}
                      detail={words(row.status)}
                      aside={fee(row.feeAmount, row.currency)}
                    />
                  ))
                )}
              </Group>
              </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
