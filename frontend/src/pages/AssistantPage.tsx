import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatDesk, ChatDeskFrame } from "../components/ChatDesk";
import { RetryableError } from "../components/PageHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { AssistantDesk, AssistantRun, Envelope } from "../types";

export function AssistantPage() {
  const [desk, setDesk] = useState<AssistantDesk | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  useTitle("ChatGPT");

  async function load() {
    setLoading(true);
    try {
      const envelope = await api<Envelope<AssistantDesk>>("/assistant/desk");
      setDesk(envelope.data);
      setNote(envelope.meta.note);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !desk) {
    return (
      <ChatDeskFrame label="Loading ChatGPT">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-7 w-28" />
        <Skeleton className="mt-4 min-h-0 flex-1 rounded-2xl" />
        <Skeleton className="mt-3 h-28 rounded-2xl" />
      </ChatDeskFrame>
    );
  }

  if (error && !desk) {
    return (
      <>
        <Breadcrumbs items={[{ label: "AI tools", to: "/ai" }, { label: "ChatGPT" }]} />
        <RetryableError message={error} onRetry={() => void load()} />
      </>
    );
  }

  if (!desk) return null;

  return (
    <ChatDesk
      title="ChatGPT"
      lede="Ask about a new message, your next meeting, or paste notes to draft. The reply says which task it used."
      breadcrumbs={[{ label: "AI tools", to: "/ai" }, { label: "ChatGPT" }]}
      placeholder="Ask about Slack, ClickUp, the calendar, or paste notes."
      maxLength={6000}
      canRun={desk.canRun}
      blockedNote={desk.canRun && desk.connected ? undefined : note}
      onSend={async ({ brief }) => {
        const envelope = await api<Envelope<AssistantRun>>("/assistant/runs", {
          method: "POST",
          body: JSON.stringify({ brief, acknowledged: true }),
        });
        return {
          output: envelope.data.output,
          reviewNote: envelope.data.reviewNote,
          intentLabel: envelope.data.intentLabel,
        };
      }}
    />
  );
}
