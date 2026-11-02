import { Link } from "react-router-dom";
import { CalendarDaysIcon, FolderKanbanIcon, ListTodoIcon, MessageSquareIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartPanel,
  SoftAreaChart,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  SoftRadarChart,
  countBy,
} from "../components/charts";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { OverviewSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MarkIcon } from "../components/marks";
import { CardGrid, MetricStrip, Panel, RecordCard, Section } from "../components/Surface";
import { plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { DashboardData, Envelope, FollowUp, Task } from "../types";

const FEED_LIMIT = 5;

export function OverviewPage() {
  const { data, error, loading, reload } = useApi<Envelope<DashboardData>>("/dashboard");
  const dashboard = data?.data;

  return (
    <>
      <PageHeader
        eyebrow="Impact One · IOC"
        title="Overview"
        lede="A live snapshot of projects, deadlines, meetings, and connected systems."
      />
      {loading && !dashboard ? <OverviewSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {dashboard ? <Overview dashboard={dashboard} /> : null}
    </>
  );
}

function statusLabel(value: string) {
  const plain = plainStatus(value);
  if (plain === "in progress") return "In progress";
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

function Overview({ dashboard }: { dashboard: DashboardData }) {
  const statusMix = countBy(dashboard.deadlines, (task) => statusLabel(task.status));
  const integrationMix = countBy(dashboard.integrations, (item) => {
    if (item.origin === "live") return "Live";
    if (item.origin === "sample") return "Sample";
    if (item.origin === "documented") return "Documented";
    return "Needs review";
  });
  const workload = [
    { name: "Projects", value: dashboard.counts.projects },
    { name: "Open tasks", value: dashboard.counts.openTasks },
    { name: "Due 7 days", value: dashboard.counts.deadlinesThisWeek },
    { name: "Follow-ups", value: dashboard.counts.openFollowUps },
    { name: "AI review", value: dashboard.counts.aiNeedsReview },
  ];
  const pressureSeries = [
    { name: "Open", value: dashboard.counts.openTasks },
    { name: "Week", value: dashboard.counts.deadlinesThisWeek },
    { name: "Follow", value: dashboard.counts.openFollowUps },
    { name: "AI", value: dashboard.counts.aiNeedsReview },
    {
      name: "Focus",
      value: Math.max(dashboard.counts.openTasks - dashboard.counts.deadlinesThisWeek, 0),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <MetricStrip
        items={[
          { label: "Projects", value: dashboard.counts.projects, icon: <FolderKanbanIcon /> },
          { label: "Open tasks", value: dashboard.counts.openTasks, icon: <ListTodoIcon /> },
          {
            label: "Due in 7 days",
            value: dashboard.counts.deadlinesThisWeek,
            icon: <CalendarDaysIcon />,
          },
          { label: "Follow-ups", value: dashboard.counts.openFollowUps, icon: <MessageSquareIcon /> },
          { label: "AI to review", value: dashboard.counts.aiNeedsReview, icon: <SparklesIcon /> },
        ]}
      />

      <Note>{dashboard.taskNote}</Note>

      {/* Row: area + radar (reference-style dual viz) */}
      <div className="grid gap-5 lg:grid-cols-12">
        <ChartPanel title="Workload trend" description="Open work across the desk" className="lg:col-span-8">
          <SoftAreaChart data={pressureSeries} />
        </ChartPanel>
        <ChartPanel title="Balance radar" description="Counts across work types" className="lg:col-span-4">
          <SoftRadarChart data={workload} />
        </ChartPanel>
      </div>

      {/* Row: donut + horizontal bars + progress tracks */}
      <div className="grid gap-5 lg:grid-cols-12">
        <ChartPanel title="Integration mix" description="Connection status by system" className="lg:col-span-4">
          <SoftDonutChart data={integrationMix} centerLabel="Systems" />
        </ChartPanel>
        <ChartPanel title="Deadline status" description="Next 7 days by status" className="lg:col-span-4">
          {statusMix.length ? (
            <SoftBarChart data={statusMix} layout="horizontal" compact />
          ) : (
            <p className="grid min-h-[200px] place-items-center text-sm text-muted-foreground">No deadlines this week.</p>
          )}
        </ChartPanel>
        <ChartPanel title="Workload share" description="Relative volume" className="lg:col-span-4">
          <SoftProgressTracks data={workload} />
        </ChartPanel>
      </div>

      {/* Feeds */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Deadlines"
          action={
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
              <Link to="/tasks">All tasks</Link>
            </Button>
          }
        >
          <FeedList
            empty="No open deadline in the next 7 days."
            items={dashboard.deadlines.slice(0, FEED_LIMIT)}
            hrefFor={(task) => (task.projectId ? `/projects/${task.projectId}` : "/tasks")}
            meta={(task) => `${task.owner} · ${task.projectName}`}
          />
        </Panel>

        <Panel
          title="Follow-ups"
          action={
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
              <Link to="/follow-ups">View all</Link>
            </Button>
          }
        >
          <FeedList
            empty="No open follow-ups."
            items={dashboard.followUps.slice(0, FEED_LIMIT)}
            hrefFor={() => "/follow-ups"}
            meta={(item) => `${item.owner} · ${item.projectName}`}
          />
        </Panel>
      </div>

      <Section
        title="Workstreams"
        action={
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
            <Link to="/projects">All projects</Link>
          </Button>
        }
      >
        {dashboard.projects.length === 0 ? (
          <EmptyState title="No projects in view" description="Your role may limit which workstreams appear." />
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
        {dashboard.meetingNote ? (
          <div className="mb-5">
            <Note>{dashboard.meetingNote}</Note>
          </div>
        ) : null}
        {dashboard.meetings.length === 0 ? (
          <EmptyState
            title="No meetings listed"
            description="Upcoming meetings will appear here once the calendar is connected."
          />
        ) : (
          <CardGrid columns="2">
            {dashboard.meetings.slice(0, 4).map((meeting) => (
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

      <Section
        title="Where the data sits"
        action={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link to="/integrations">Integrations</Link>
          </Button>
        }
      >
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
      </Section>
    </div>
  );
}

function FeedList<T extends Task | FollowUp>({
  items,
  empty,
  hrefFor,
  meta,
}: {
  items: T[];
  empty: string;
  hrefFor: (item: T) => string;
  meta: (item: T) => string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
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
              <Link to={hrefFor(item)} className="hover:text-primary hover:underline">
                {item.title}
              </Link>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{meta(item)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
            <Due value={item.dueDate} />
            <SourceBadge origin={item.source.origin} />
          </div>
        </li>
      ))}
    </ul>
  );
}
