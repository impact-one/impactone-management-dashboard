import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AudioLinesIcon, ListChecksIcon, RefreshCwIcon, Share2Icon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSearch, ResultCount } from "../components/FilterBar";
import { Note, PageHeader, RetryableError } from "../components/PageHeader";
import { CardsSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MetricStrip, Section } from "../components/Surface";
import { formatWhen, plainStatus } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Envelope, OtterDesk, OtterMeeting } from "../types";

const CONSENT_KEY = "impact-otter-confirmed";

function readConfirmed(): string[] {
  try {
    const raw = sessionStorage.getItem(CONSENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberConfirmed(id: string) {
  const next = new Set(readConfirmed());
  next.add(id);
  sessionStorage.setItem(CONSENT_KEY, JSON.stringify([...next]));
}

function meetingHaystack(meeting: OtterMeeting): string {
  return [
    meeting.title,
    meeting.owner,
    meeting.summary,
    meeting.transcript,
    ...meeting.guests.map((guest) => `${guest.name} ${guest.email ?? ""}`),
    ...meeting.shares.map((share) => `${share.name} ${share.permission} ${share.discoverability ?? ""}`),
    ...meeting.actionItems.map((item) => `${item.text} ${item.assignee ?? ""}`),
    ...meeting.insights.flatMap((insight) => [insight.topic, ...insight.points]),
  ]
    .join(" ")
    .toLowerCase();
}

function highlight(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const target = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(target);
  let key = 0;
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={key} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    key += 1;
    cursor = index + needle.length;
    index = lower.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function MeetingsPage() {
  const { data, error, loading, reload } = useApi<Envelope<OtterDesk>>("/otter/desk");
  const desk = data?.data;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>(() => readConfirmed());
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const meetings = desk?.meetings ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return meetings;
    return meetings.filter((meeting) => meetingHaystack(meeting).includes(needle));
  }, [desk?.meetings, query]);

  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((meeting) => meeting.id === selectedId)) {
      setSelectedId(visible[0]?.id ?? null);
    }
  }, [visible, selectedId]);

  const selected = visible.find((meeting) => meeting.id === selectedId) ?? null;
  const notesOpen = selected ? confirmed.includes(selected.id) : false;
  const openActions = (desk?.meetings ?? []).reduce(
    (count, meeting) => count + meeting.actionItems.filter((item) => !item.completed).length,
    0,
  );
  const shareCount = new Set(
    (desk?.meetings ?? []).flatMap((meeting) => meeting.shares.map((share) => share.name)),
  ).size;

  function toggleCheck(id: string) {
    setChecks((current) => ({ ...current, [id]: !current[id] }));
  }

  function openNotes() {
    if (!selected || !desk) return;
    const ready = desk.consentChecks.every((check) => checks[check.id]);
    if (!ready) return;
    rememberConfirmed(selected.id);
    setConfirmed(readConfirmed());
    setChecks({});
  }

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Meetings"
        lede="Otter transcripts, summaries, and action items. Confirm consent and sharing before the notes open."
      >
        <Button type="button" variant="outline" onClick={() => reload()} disabled={loading}>
          <RefreshCwIcon data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </PageHeader>
      {loading && !desk ? <CardsSkeleton label="Loading meeting notes" /> : null}
      {error && !desk ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? (
        <div className="mb-6">
          <Note>{data.meta.note}</Note>
        </div>
      ) : null}
      {desk ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Conversations", value: desk.meetings.length, icon: <AudioLinesIcon /> },
              { label: "Open actions", value: openActions, icon: <ListChecksIcon /> },
              { label: "Audiences", value: shareCount, icon: <Share2Icon /> },
              {
                label: "Connected",
                value: desk.connected ? "Live" : "Sample",
                icon: <ShieldCheckIcon />,
                tone: desk.connected ? "good" : "muted",
              },
              {
                label: "Visible",
                value: visible.length,
                icon: <UsersIcon />,
                hint: query ? "Filtered" : "All",
              },
            ]}
          />
          <Note>{desk.implementationNote}</Note>
          <p className="text-sm leading-6 text-muted-foreground">{desk.operatingModel}</p>
          {desk.meetings.length === 0 ? (
            <Section title="Conversations">
              <p className="text-sm text-muted-foreground">No meeting notes are available for this role.</p>
            </Section>
          ) : (
            <>
              <FilterBar>
                <FilterSearch
                  id="meeting-search"
                  label="Search notes"
                  value={query}
                  onChange={setQuery}
                  placeholder="Title, summary, transcript, or action"
                />
              </FilterBar>
              <ResultCount shown={visible.length} total={desk.meetings.length} label="conversations" />
              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations match that search.</p>
              ) : (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
                  <ul className="grid gap-2">
                    {visible.map((meeting) => {
                      const active = meeting.id === selected?.id;
                      const inTranscript = query.trim() && meeting.transcript.toLowerCase().includes(query.trim().toLowerCase());
                      return (
                        <li key={meeting.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(meeting.id);
                              setChecks({});
                            }}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                              active ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted/40"
                            }`}
                            aria-current={active ? "true" : undefined}
                          >
                            <span className="block text-sm font-medium">{meeting.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {formatWhen(meeting.createdAt)} · {meeting.owner}
                            </span>
                            {inTranscript ? (
                              <span className="mt-2 block text-xs text-primary">Matches the transcript</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {selected ? (
                    <article className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold tracking-tight">{selected.title}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatWhen(selected.createdAt)} · {selected.owner}
                            {selected.summaryStatus ? ` · Summary ${plainStatus(selected.summaryStatus)}` : ""}
                          </p>
                        </div>
                        <SourceBadge origin={selected.source.origin} />
                      </div>
                      <SharingPanel meeting={selected} />
                      {notesOpen ? (
                        <Notes
                          meeting={selected}
                          query={query}
                          otterUrl={selected.url}
                        />
                      ) : (
                        <ConsentGate
                          statement={desk.consentStatement}
                          checks={desk.consentChecks}
                          checked={checks}
                          onToggle={toggleCheck}
                          onOpen={openNotes}
                        />
                      )}
                    </article>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

function SharingPanel({ meeting }: { meeting: OtterMeeting }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Sharing</h3>
      {meeting.shares.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Otter has not shared this conversation with a person or channel.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {meeting.shares.map((share) => (
            <li key={`${share.kind}-${share.name}`} className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{share.name}</span>
              <span className="text-muted-foreground">
                {" "}
                · {share.kind === "channel" ? "Channel" : "Person"} · {plainStatus(share.permission)}
                {share.discoverability ? ` · ${plainStatus(share.discoverability)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {meeting.guests.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Calendar guests: {meeting.guests.map((guest) => guest.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function ConsentGate({
  statement,
  checks,
  checked,
  onToggle,
  onOpen,
}: {
  statement: string;
  checks: { id: string; label: string }[];
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  onOpen: () => void;
}) {
  const ready = checks.every((check) => checked[check.id]);
  return (
    <form
      className="mt-5 grid gap-3 rounded-xl border border-border bg-muted/30 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <h3 className="text-sm font-semibold">Confirm before opening notes</h3>
      <p className="text-sm leading-6 text-muted-foreground">{statement}</p>
      {checks.map((check) => (
        <label key={check.id} className="flex items-start gap-2 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={Boolean(checked[check.id])}
            onChange={() => onToggle(check.id)}
          />
          <span>{check.label}</span>
        </label>
      ))}
      <div>
        <Button type="submit" disabled={!ready}>
          Open notes
        </Button>
      </div>
    </form>
  );
}

function Notes({ meeting, query, otterUrl }: { meeting: OtterMeeting; query: string; otterUrl: string | null }) {
  return (
    <div className="mt-5 space-y-5">
      <section>
        <h3 className="text-sm font-semibold">Summary</h3>
        <p className="mt-2 text-sm leading-6">{meeting.summary ? highlight(meeting.summary, query) : "No summary yet."}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Action items</h3>
        {meeting.actionItems.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No action items yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {meeting.actionItems.map((item) => (
              <li key={item.id} className="text-sm leading-6">
                {highlight(item.text, query)}
                <span className="text-muted-foreground">
                  {" "}
                  · {item.assignee ?? "Unassigned"} · {item.completed ? "Done" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {meeting.insights.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Insights</h3>
          <ul className="mt-2 grid gap-3">
            {meeting.insights.map((insight) => (
              <li key={insight.topic}>
                <p className="text-sm font-medium">{highlight(insight.topic, query)}</p>
                <ul className="mt-1 grid gap-1">
                  {insight.points.map((point) => (
                    <li key={point} className="text-sm leading-6 text-muted-foreground">
                      {highlight(point, query)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h3 className="text-sm font-semibold">Transcript</h3>
        {meeting.transcript ? (
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-6">
            {highlight(meeting.transcript, query)}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No transcript yet.</p>
        )}
        {meeting.transcriptTruncated ? (
          <p className="mt-2 text-xs text-muted-foreground">Transcript shortened for this desk. The full text stays in Otter.</p>
        ) : null}
      </section>
      {otterUrl ? (
        <p className="text-sm">
          <a className="underline-offset-4 hover:underline" href={otterUrl} target="_blank" rel="noreferrer">
            Open in Otter
          </a>
        </p>
      ) : null}
    </div>
  );
}
