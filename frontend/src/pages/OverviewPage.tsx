import { Link } from "react-router-dom";
import { CalendarDaysIcon, FolderKanbanIcon, ListTodoIcon, MessageSquareIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { OverviewSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MarkIcon } from "../components/marks";
import { CardGrid, MetricStrip, Panel, RecordCard, Section } from "../components/Surface";
import { plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { DashboardData, Envelope } from "../types";

export function OverviewPage() {
  const { data, error, loading, reload } = useApi<Envelope<DashboardData>>("/dashboard");
  const dashboard = data?.data;

  return (
    <>
      <PageHeader
        eyebrow="Impact One · IOC"
        title="Overview"
        lede="Projects, deadlines, follow-ups, and the tools this pilot can already name. Live connections appear only when read-only access is configured."
      />
      {loading && !dashboard ? <OverviewSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {dashboard ? <Overview dashboard={dashboard} /> : null}
    </>
  );
}

function Overview({ dashboard }: { dashboard: DashboardData }) {
  return (
    <>
      <MetricStrip
        items={[
          { label: "Projects", value: dashboard.counts.projects, icon: <FolderKanbanIcon className="size-3.5" /> },
          { label: "Open tasks", value: dashboard.counts.openTasks, icon: <ListTodoIcon className="size-3.5" /> },
          {
            label: "Due in 7 days",
            value: dashboard.counts.deadlinesThisWeek,
            icon: <CalendarDaysIcon className="size-3.5" />,
          },
          { label: "Follow-ups", value: dashboard.counts.openFollowUps, icon: <MessageSquareIcon className="size-3.5" /> },
          { label: "AI to review", value: dashboard.counts.aiNeedsReview, icon: <SparklesIcon className="size-3.5" /> },
        ]}
      />
      <div className="mt-4">
        <Note>{dashboard.taskNote}</Note>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Deadlines"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks">All tasks</Link>
            </Button>
          }
        >
          {dashboard.deadlines.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No open deadline in the next 7 days.</p>
          ) : (
            <ul className="divide-y">
              {dashboard.deadlines.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {task.projectId ? (
                        <Link to={`/projects/${task.projectId}`} className="hover:underline">
                          {task.title}
                        </Link>
                      ) : (
                        <Link to="/tasks" className="hover:underline">
                          {task.title}
                        </Link>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.owner} · {task.projectName} ·{" "}
                      <span className="capitalize">{plainStatus(task.status)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Due value={task.dueDate} />
                    <SourceBadge origin={task.source.origin} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Follow-ups"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/follow-ups">View all</Link>
            </Button>
          }
        >
          {dashboard.followUps.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No open follow-ups.</p>
          ) : (
            <ul className="divide-y">
              {dashboard.followUps.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <Link to="/follow-ups" className="hover:underline">
                        {item.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.owner} · {item.projectName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Due value={item.dueDate} />
                    <SourceBadge origin={item.source.origin} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Section title="Workstreams">
        {dashboard.projects.length === 0 ? (
          <EmptyState title="No projects in view" description="Your role may limit which workstreams appear." />
        ) : (
          <CardGrid>
            {dashboard.projects.map((project) => (
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
                  fields={[{ label: "Owner", value: project.owner }]}
                />
              </li>
            ))}
          </CardGrid>
        )}
      </Section>
      <Section title="Meetings">
        <Note>{dashboard.meetingNote}</Note>
        {dashboard.meetings.length === 0 ? (
          <EmptyState title="No meetings listed" description="Agenda rows will appear when sample or live calendar data is available." />
        ) : (
          <CardGrid>
            {dashboard.meetings.map((meeting) => (
              <li key={meeting.id}>
                <RecordCard
                  kicker="Meeting"
                  title={
                    meeting.href ? (
                      <a href={meeting.href} target="_blank" rel="noreferrer" className="hover:underline">
                        {meeting.title}
                      </a>
                    ) : (
                      meeting.title
                    )
                  }
                  origin={meeting.source.origin}
                  mark={<MarkIcon name={`meeting ${meeting.title}`} />}
                  fields={[
                    { label: "When", value: <Due value={meeting.date} /> },
                    { label: "Time", value: meeting.timeLabel },
                    { label: "Owner", value: meeting.owner, wide: true },
                  ]}
                />
              </li>
            ))}
          </CardGrid>
        )}
      </Section>
      <Section title="Where the data sits">
        <CardGrid columns="2">
          {dashboard.integrations.slice(0, 4).map((item) => (
            <li key={item.id}>
              <RecordCard
                kicker="System"
                title={item.name}
                origin={item.origin}
                summary={item.detail}
                mark={<MarkIcon name={item.name} />}
              />
            </li>
          ))}
        </CardGrid>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/integrations">Integrations</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/map">System map</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
