import { Link } from "react-router-dom";
import { CalendarDaysIcon, FolderKanbanIcon, ListTodoIcon, MessageSquareIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { OverviewSkeleton } from "../components/PageSkeleton";
import { MarkIcon } from "../components/marks";
import { CardGrid, MetricStrip, Panel, RecordCard, Section } from "../components/Surface";
import { useApi } from "../lib/useApi";
import type { DashboardData, Envelope, FollowUp, Task } from "../types";

const FEED_LIMIT = 5;

const statusChip =
  "h-5 max-w-full border-[var(--badge-shell-border)] bg-[var(--badge-shell-bg)] px-1.5 text-xs font-medium text-foreground shadow-none";

export function OverviewPage() {
  const { data, error, loading, reload } = useApi<Envelope<DashboardData>>("/dashboard");
  const dashboard = data?.data;

  return (
    <>
      <PageHeader
        eyebrow="Impact One · IOC"
        title="Overview"
        lede="Projects, who owns them, what is due, and what needs a follow-up. Status names stay as they are in the source tool."
      />
      {loading && !dashboard ? <OverviewSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {dashboard ? <Overview dashboard={dashboard} /> : null}
    </>
  );
}

function Overview({ dashboard }: { dashboard: DashboardData }) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <MetricStrip
        items={[
          { label: "Projects", value: dashboard.counts.projects, icon: <FolderKanbanIcon /> },
          { label: "Open tasks", value: dashboard.counts.openTasks, icon: <ListTodoIcon /> },
          {
            label: "Deadlines",
            value: dashboard.counts.deadlinesThisWeek,
            icon: <CalendarDaysIcon />,
          },
          { label: "Follow-ups", value: dashboard.counts.openFollowUps, icon: <MessageSquareIcon /> },
          { label: "Meetings", value: dashboard.counts.meetings, icon: <CalendarDaysIcon /> },
        ]}
      />

      {dashboard.taskNote ? <Note>{dashboard.taskNote}</Note> : null}

      <Panel
        title="Task statuses"
        action={
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link to="/tasks">Tasks</Link>
          </Button>
        }
      >
        {dashboard.statuses.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No tasks in view.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
            {dashboard.statuses.map((item) => (
              <li
                key={item.name}
                className="flex max-w-full items-center gap-2 rounded-full bg-accent/60 px-3 py-1.5 ring-1 ring-border/70"
              >
                <span className="truncate text-sm text-foreground">{item.name}</span>
                <span className="text-sm font-semibold tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Deadlines"
          action={
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
              <Link to="/tasks">Tasks</Link>
            </Button>
          }
        >
          <DeadlineList tasks={dashboard.deadlines.slice(0, FEED_LIMIT)} />
        </Panel>

        <Panel
          title="Follow-ups"
          action={
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
              <Link to="/follow-ups">Follow-ups</Link>
            </Button>
          }
        >
          <FollowUpList items={dashboard.followUps.slice(0, FEED_LIMIT)} />
        </Panel>
      </div>

      <Section
        title="Projects"
        action={
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link to="/projects">Projects</Link>
          </Button>
        }
      >
        {dashboard.projects.length === 0 ? (
          <EmptyState title="No projects in view" description="Your role may limit which projects appear." />
        ) : (
          <CardGrid columns="2">
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
                  mark={<MarkIcon name={project.name} />}
                  fields={[
                    { label: "Owner", value: project.owner },
                    { label: "Status", value: project.status },
                  ]}
                />
              </li>
            ))}
          </CardGrid>
        )}
      </Section>

      <Section
        title="Calendar"
        action={
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link to="/calendar">Calendar</Link>
          </Button>
        }
      >
        {dashboard.meetingNote ? (
          <div className="mb-5">
            <Note>{dashboard.meetingNote}</Note>
          </div>
        ) : null}
        {dashboard.meetings.length === 0 ? (
          <EmptyState title="No meetings listed" description="Upcoming meetings appear here from Google Calendar." />
        ) : (
          <CardGrid columns="2">
            {dashboard.meetings.map((meeting) => (
              <li key={meeting.id}>
                <RecordCard
                  kicker={meeting.calendarName}
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
                  mark={<MarkIcon name={meeting.calendarName || meeting.title} />}
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
    </div>
  );
}

function DeadlineList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No open task is due in the next 7 days.</p>;
  }

  return (
    <ul className="divide-y divide-border/60">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-accent/30 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium sm:truncate">
              {task.href ? (
                <a href={task.href} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                  {task.title}
                </a>
              ) : (
                <Link
                  to={task.projectId ? `/projects/${task.projectId}` : "/tasks"}
                  className="hover:text-primary hover:underline"
                >
                  {task.title}
                </Link>
              )}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {task.owner} · {task.projectName}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            <Badge variant="outline" className={statusChip} title={task.status}>
              {task.status}
            </Badge>
            <Due value={task.dueDate} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function FollowUpList({ items }: { items: FollowUp[] }) {
  if (items.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No open follow-ups.</p>;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-accent/30 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium sm:truncate">
              <Link to="/follow-ups" className="hover:text-primary hover:underline">
                {item.title}
              </Link>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.owner} · {item.projectName}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            <Badge variant="outline" className={statusChip} title={item.status}>
              {item.status}
            </Badge>
            <Due value={item.dueDate} />
          </div>
        </li>
      ))}
    </ul>
  );
}
