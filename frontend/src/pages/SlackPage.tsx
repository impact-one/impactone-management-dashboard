import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HashIcon, MessageSquareIcon, RadioIcon, UsersIcon, SendIcon } from "lucide-react";
import {
  ChartPanel,
  ChartRow,
  SoftBarChart,
  SoftDonutChart,
  SoftProgressTracks,
  countBy,
} from "../components/charts";
import { DataTable } from "../components/DataTable";
import { ErrorNote, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SlackSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { MetricStrip, Section } from "../components/Surface";
import { api } from "../lib/api";
import { formatWhen } from "../lib/format";
import type { Envelope, SlackDesk, SlackMessage } from "../types";

/** Soft sync only — not a realtime bus. Cache on API is 10s; keep poll aligned. */
const POLL_MS = 10_000;

function displayAuthor(author: string) {
  const value = author.trim() || "Unknown";
  if (/^U[A-Z0-9]{8,}$/i.test(value)) return `Member ${value.slice(-4)}`;
  return value;
}

function sortMessages(messages: SlackMessage[]): SlackMessage[] {
  return [...messages].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

function upsertMessage(messages: SlackMessage[], message: SlackMessage): SlackMessage[] {
  const without = messages.filter((item) => item.id !== message.id);
  return sortMessages([message, ...without]);
}

/** Keep just-posted rows until Slack history catches up; otherwise trust the server list. */
function reconcileDesk(previous: SlackDesk | undefined, incoming: SlackDesk): SlackDesk {
  if (!previous) return incoming;
  const serverIds = new Set(incoming.messages.map((item) => item.id));
  const pending = previous.messages.filter((item) => {
    if (serverIds.has(item.id)) return false;
    const age = Date.now() - new Date(item.postedAt).getTime();
    return age >= 0 && age < 12_000;
  });
  return {
    ...incoming,
    messages: sortMessages([...pending, ...incoming.messages]),
  };
}

export function SlackPage() {
  const [desk, setDesk] = useState<SlackDesk | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [bootLoading, setBootLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const [posting, setPosting] = useState(false);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const savedTimer = useRef<number | null>(null);

  const clearSavedLater = useCallback(() => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => {
      if (mounted.current) setSaved(undefined);
    }, 4000);
  }, []);

  const pull = useCallback(async (mode: "boot" | "soft" | "manual" = "soft") => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (mode === "manual") setRefreshing(true);
    if (mode === "boot") setBootLoading(true);
    try {
      const envelope = await api<Envelope<SlackDesk>>("/slack/desk");
      if (!mounted.current) return;
      setError(undefined);
      setNote(envelope.meta.note);
      setDesk((previous) => reconcileDesk(previous, envelope.data));
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setBootLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void pull("boot");
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void pull("soft");
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull("soft");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, [pull]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || posting) return;
    setFormError(undefined);
    setSaved(undefined);
    setPosting(true);
    try {
      const envelope = await api<Envelope<SlackMessage>>("/slack/messages", {
        method: "POST",
        body: JSON.stringify({ text: body }),
      });
      setText("");
      setSaved(envelope.meta.note ?? "Update posted to Slack.");
      clearSavedLater();
      setDesk((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          connected: true,
          messages: upsertMessage(previous.messages, envelope.data),
        };
      });
      // Pull after a beat so Slack history has indexed the new message.
      window.setTimeout(() => {
        if (mounted.current) void pull("soft");
      }, 400);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setPosting(false);
    }
  }

  const authorMix = useMemo(
    () =>
      countBy(desk?.messages ?? [], (item) => displayAuthor(item.author || "Unknown")).slice(0, 8),
    [desk?.messages],
  );

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Slack"
        lede={
          desk && !desk.canPost
            ? "Channel activity is available to executive and manager roles."
            : "Monitor the operations channel and post concise team updates."
        }
      >
        <Button type="button" variant="outline" onClick={() => void pull("manual")} disabled={refreshing || bootLoading || posting}>
          <RefreshCwIcon data-icon="inline-start" className={refreshing ? "animate-spin" : undefined} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </PageHeader>

      {bootLoading && !desk ? <SlackSkeleton /> : null}
      {error && !desk ? <RetryableError message={error} onRetry={() => void pull("boot")} /> : null}
      {error && desk ? <ErrorNote message={error} /> : null}
      {note && !bootLoading ? <Note>{note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}

      {desk ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Messages", value: desk.messages.length, icon: <MessageSquareIcon /> },
              { label: "Authors", value: authorMix.length, icon: <UsersIcon /> },
              {
                label: "Connected",
                value: desk.connected ? "Live" : "Off",
                icon: <RadioIcon />,
                tone: desk.connected ? "good" : "muted",
              },
              {
                label: "Can post",
                value: desk.canPost ? "Yes" : "No",
                icon: <SendIcon />,
                tone: desk.canPost ? "good" : "muted",
              },
              {
                label: "Channel",
                value: `#${desk.channelName}`,
                icon: <HashIcon />,
                hint: desk.connected ? "Synced" : "Reference",
              },
            ]}
          />
          <ChartRow>
            <ChartPanel
              title="Messages by author"
              description="Who is posting in this channel"
              className="lg:col-span-4"
            >
              <SoftBarChart data={authorMix} layout="horizontal" compact />
            </ChartPanel>
            <ChartPanel title="Source mix" description="Live vs reference rows" className="lg:col-span-4">
              <SoftDonutChart
                data={countBy(desk.messages, (item) => {
                  if (item.source.origin === "live") return "Live";
                  if (item.source.origin === "sample") return "Sample";
                  if (item.source.origin === "documented") return "Documented";
                  return "Needs review";
                })}
                centerLabel="Sources"
                compact
              />
            </ChartPanel>
            <ChartPanel title="Share by author" description="Relative volume" className="lg:col-span-4">
              <SoftProgressTracks data={authorMix} />
            </ChartPanel>
          </ChartRow>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Channel: <span className="font-medium text-foreground">#{desk.channelName}</span>
            {desk.connected ? " · Live" : " · Sample until the bot token is connected"}
            {" · "}
            Soft sync about every 10s
            {refreshing ? " · Updating…" : null}
            {posting ? " · Posting…" : null}
          </p>

          {desk.canPost ? (
            <Section title="Post update">
              <form className="surface grid max-w-2xl gap-3 rounded-2xl bg-card p-5 ring-0" onSubmit={(event) => void onSubmit(event)}>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Message</span>
                  <textarea
                    className="min-h-24 rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="What finished today, what is blocked, question for tomorrow."
                    maxLength={3000}
                    required
                    disabled={posting}
                  />
                </label>
                <div>
                  <Button type="submit" disabled={posting || !text.trim()}>
                    {posting ? "Posting…" : "Post to Slack"}
                  </Button>
                </div>
              </form>
            </Section>
          ) : null}

          <Section title="Recent messages">
            <DataTable
              caption="Slack messages"
              rows={desk.messages}
              empty="No messages in this channel yet."
              columns={[
                { key: "text", header: "Message", render: (row) => row.text },
                { key: "author", header: "From", render: (row) => displayAuthor(row.author) },
                {
                  key: "when",
                  header: "When",
                  render: (row) => formatWhen(row.postedAt),
                },
                {
                  key: "source",
                  header: "Data",
                  render: (row) => <SourceBadge origin={row.source.origin} />,
                },
              ]}
            />
          </Section>

        </div>
      ) : null}
    </>
  );
}
