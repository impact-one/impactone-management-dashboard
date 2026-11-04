import { useEffect, useState } from "react";
import { LightbulbIcon, ListTreeIcon, PenLineIcon, SearchIcon, TextIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatDesk, ChatDeskFrame, type ChatMode } from "../components/ChatDesk";
import { RetryableError } from "../components/PageHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { AssistantDesk, AssistantRun, AssistantWorkflow, Envelope } from "../types";

const taskIcon: Record<AssistantWorkflow, ChatMode["icon"]> = {
  draft: PenLineIcon,
  research: SearchIcon,
  analyze: ListTreeIcon,
  brainstorm: LightbulbIcon,
  summarize: TextIcon,
};

const placeholders: Record<AssistantWorkflow, string> = {
  draft: "Paste the notes for an email, brief, or update.",
  research: "Write the question you want researched.",
  analyze: "Paste the notes you want pulled apart.",
  brainstorm: "Describe the problem you want options for.",
  summarize: "Paste the notes you want shortened.",
};

export function AssistantPage() {
  const [desk, setDesk] = useState<AssistantDesk | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<AssistantWorkflow>("draft");
  useTitle("ChatGPT");

  async function load() {
    setLoading(true);
    try {
      const envelope = await api<Envelope<AssistantDesk>>("/assistant/desk");
      setDesk(envelope.data);
      setNote(envelope.meta.note);
      setError(undefined);
      setWorkflow((current) =>
        envelope.data.workflows.some((item) => item.id === current) ? current : envelope.data.workflows[0]?.id ?? "draft",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const modes: ChatMode[] =
    desk?.workflows.map((item) => ({
      id: item.id,
      label: item.label,
      hint: item.hint,
      icon: taskIcon[item.id],
    })) ?? [];

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
      lede="Pick a task, write the note, and read the reply before you share it."
      breadcrumbs={[{ label: "AI tools", to: "/ai" }, { label: "ChatGPT" }]}
      modes={modes}
      mode={workflow}
      onMode={(id) => setWorkflow(id as AssistantWorkflow)}
      placeholder={placeholders[workflow]}
      maxLength={6000}
      acknowledgeLabel="I will review the reply. No secrets or budget figures."
      canRun={desk.canRun}
      blockedNote={desk.canRun ? undefined : note}
      onSend={async ({ mode, brief }) => {
        const envelope = await api<Envelope<AssistantRun>>("/assistant/runs", {
          method: "POST",
          body: JSON.stringify({ workflow: mode, brief, acknowledged: true }),
        });
        return { output: envelope.data.output, reviewNote: envelope.data.reviewNote };
      }}
    />
  );
}
