import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote, Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { ReviewList, SourceBadge } from "../components/SourceBadge";
import { MarkIcon } from "../components/marks";
import { CardGrid, RecordCard, Section } from "../components/Surface";
import { formatMoney, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, ProjectDetail, Task } from "../types";

function taskTitle(row: Task) {
  if (!row.href) return row.title;
  return (
    <a href={row.href} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
      {row.title}
    </a>
  );
}

export function ProjectPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<Envelope<ProjectDetail>>(id ? `/projects/${id}` : null);
  const detail = data?.data;

  if (!id) return <ErrorNote message="Project not found." />;

  return (
    <>
      {loading && !detail ? <Loading label="Loading project" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {detail ? (
        <>
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: detail.project.name },
            ]}
          />
          <PageHeader eyebrow={detail.project.organisation} title={detail.project.name} lede={detail.project.summary}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <SourceBadge origin={detail.project.source.origin} />
              <span className="capitalize text-muted-foreground">{plainStatus(detail.project.status)}</span>
              <span className="text-muted-foreground">· {detail.project.owner}</span>
            </div>
          </PageHeader>
          <p className="mb-3 text-sm text-muted-foreground">{detail.project.source.detail}</p>
          <ReviewList flags={detail.project.reviewFlags} />
          {detail.taskNote || detail.documentNote ? (
            <Note>
              {detail.taskNote} {detail.documentNote}
            </Note>
          ) : null}

          <Section title="Workstreams">
            {detail.project.workstreams.length === 0 ? (
              <EmptyState title="No workstreams listed" description="This project has no workstream rows in the pilot seed." />
            ) : (
              <CardGrid>
                {detail.project.workstreams.map((item) => (
                  <li key={item.id}>
                    <RecordCard
                      kicker="Workstream"
                      title={item.name}
                      mark={<MarkIcon name={item.name} />}
                      fields={[
                        { label: "Owner", value: item.owner },
                        { label: "Status", value: <span className="capitalize">{plainStatus(item.status)}</span> },
                      ]}
                    />
                  </li>
                ))}
              </CardGrid>
            )}
          </Section>

          <Section title="Tasks on this project">
            <DataTable
              caption={`Tasks for ${detail.project.name}`}
              rows={detail.tasks}
              empty="No project-scoped tasks yet."
              columns={[
                { key: "title", header: "Task", render: (row) => taskTitle(row) },
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
            <Button variant="link" className="mt-2 h-auto px-0" asChild>
              <Link to="/tasks">Open full task list</Link>
            </Button>
          </Section>

          {detail.teamLiveTasks.length > 0 ? (
            <Section title="Team-wide live tasks">
              <Note>
                These ClickUp rows are team-wide (`projectId` unset). They are not claimed for this project; open the
                team task list for the full live set.
              </Note>
              <DataTable
                caption="Team-wide live tasks"
                rows={detail.teamLiveTasks}
                columns={[
                  { key: "title", header: "Task", render: (row) => taskTitle(row) },
                  { key: "owner", header: "Owner", render: (row) => row.owner },
                  { key: "due", header: "Due", render: (row) => <Due value={row.dueDate} /> },
                  { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
                ]}
              />
            </Section>
          ) : null}

          <Section title="Documents">
            {detail.documents.length === 0 ? (
              <EmptyState title="No project documents" description="Known documents for this project will appear here." />
            ) : (
              <CardGrid>
                {detail.documents.map((item) => (
                  <li key={item.id}>
                    <RecordCard
                      kicker={item.owner}
                      title={
                        item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline-offset-4 hover:underline"
                          >
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )
                      }
                      origin={item.source.origin}
                      summary={item.source.detail}
                      mark={<MarkIcon name={`${item.title} document`} />}
                      flags={item.reviewFlags}
                    />
                  </li>
                ))}
              </CardGrid>
            )}
          </Section>

          {detail.teamLiveDocuments.length > 0 ? (
            <Section title="Team-wide live Drive files">
              <Note>Live Drive names are team-wide and not mapped to a project id. File contents are never downloaded.</Note>
              <DataTable
                caption="Team-wide Drive files"
                rows={detail.teamLiveDocuments}
                columns={[
                  {
                    key: "title",
                    header: "File",
                    render: (row) =>
                      row.href ? (
                        <a href={row.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                          {row.title}
                        </a>
                      ) : (
                        row.title
                      ),
                  },
                  { key: "owner", header: "Owner", render: (row) => row.owner },
                  { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
                ]}
              />
            </Section>
          ) : null}

          <Section title="Follow-ups">
            <DataTable
              caption={`Follow-ups for ${detail.project.name}`}
              rows={detail.followUps}
              empty="No open follow-ups on this project."
              columns={[
                { key: "title", header: "Follow-up", render: (row) => row.title },
                { key: "owner", header: "Owner", render: (row) => row.owner },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
                },
                { key: "due", header: "Due", render: (row) => <Due value={row.dueDate} /> },
                { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              ]}
            />
          </Section>

          <Section title="Milestones">
            <DataTable
              caption={`Milestones for ${detail.project.name}`}
              rows={detail.milestones}
              empty="No milestones listed for this project."
              columns={[
                { key: "title", header: "Milestone", render: (row) => row.title },
                { key: "owner", header: "Owner", render: (row) => row.owner },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
                },
                { key: "due", header: "Target", render: (row) => <Due value={row.targetDate} /> },
                { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              ]}
            />
          </Section>

          <Section title="Consultants">
            <DataTable
              caption={`Consultants for ${detail.project.name}`}
              rows={detail.consultants}
              empty="No consultants assigned to this project in the pilot seed."
              columns={[
                { key: "role", header: "Role", render: (row) => row.role },
                { key: "scope", header: "Scope", render: (row) => row.scope },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <span className="capitalize">{plainStatus(row.status)}</span>,
                },
                {
                  key: "fee",
                  header: "Fee",
                  render: (row) => formatMoney(row.feeAmount, row.currency),
                },
                { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
              ]}
            />
          </Section>
        </>
      ) : null}
    </>
  );
}
