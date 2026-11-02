import { useMemo } from "react";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
import { formatDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, Meeting } from "../types";

export function CalendarPage() {
  const { data, error, loading, reload } = useApi<Envelope<Meeting[]>>("/calendar");
  const meetings = data?.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of meetings) {
      const key = meeting.date ?? "undated";
      const list = map.get(key) ?? [];
      list.push(meeting);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return a.localeCompare(b);
    });
  }, [meetings]);

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Agenda"
        lede="Meetings in list form beside the pilot plan. A live Google Calendar read waits on a read-only token, and it is limited to executive and manager roles."
      />
      {loading && !data ? <Loading label="Loading agenda" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {data && meetings.length === 0 ? (
        <EmptyState
          title="No meetings in view"
          description="Sample or live calendar rows will appear here once available for your role."
        />
      ) : null}
      {grouped.map(([day, rows]) => (
        <Section key={day} title={day === "undated" ? "Date not set" : formatDate(day)}>
          <DataTable
            caption={`Meetings on ${day === "undated" ? "unset dates" : formatDate(day)}`}
            rows={rows}
            columns={[
              {
                key: "title",
                header: "Meeting",
                render: (row) =>
                  row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {row.title}
                    </a>
                  ) : (
                    row.title
                  ),
              },
              { key: "when", header: "When", render: (row) => <Due value={row.date} /> },
              { key: "time", header: "Time", render: (row) => row.timeLabel },
              { key: "owner", header: "Owner", render: (row) => row.owner },
              { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
            ]}
          />
        </Section>
      ))}
    </>
  );
}
