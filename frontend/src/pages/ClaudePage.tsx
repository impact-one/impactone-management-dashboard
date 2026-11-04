import { useEffect, useState } from "react";
import { FileTextIcon, LayersIcon, PenLineIcon, SquareTerminalIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatDesk, ChatDeskFrame, type ChatMode } from "../components/ChatDesk";
import { RetryableError } from "../components/PageHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { ClaudeDesk, ClaudeRun, ClaudeWorkflow, Envelope } from "../types";

const taskIcon: Record<ClaudeWorkflow, ChatMode["icon"]> = {
  write: PenLineIcon,
  review: FileTextIcon,
  synthesize: LayersIcon,
  code: SquareTerminalIcon,
};

const placeholders: Record<ClaudeWorkflow, string> = {
  write: "Paste the source for the piece you want written.",
  review: "Paste the document you want reviewed.",
  synthesize: "Paste the long source you want pulled into one account.",
  code: "Describe the coding task, or paste the notes and the code.",
};

export function ClaudePage() {
  const [desk, setDesk] = useState<ClaudeDesk | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<ClaudeWorkflow>("write");
  useTitle("Claude");

  async function load() {
    setLoading(true);
    try {
      const envelope = await api<Envelope<ClaudeDesk>>("/claude/desk");
      setDesk(envelope.data);
      setNote(envelope.meta.note);
      setError(undefined);
      setWorkflow((current) =>
        envelope.data.workflows.some((item) => item.id === current) ? current : envelope.data.workflows[0]?.id ?? "write",
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
      <ChatDeskFrame label="Loading Claude">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-7 w-24" />
        <Skeleton className="mt-4 min-h-0 flex-1 rounded-2xl" />
        <Skeleton className="mt-3 h-28 rounded-2xl" />
      </ChatDeskFrame>
    );
  }

  if (error && !desk) {
    return (
      <>
        <Breadcrumbs items={[{ label: "AI tools", to: "/ai" }, { label: "Claude" }]} />
        <RetryableError message={error} onRetry={() => void load()} />
      </>
    );
  }

  if (!desk) return null;

  return (
    <ChatDesk
      title="Claude"
      lede="Work from a long document. Check important facts before you share the reply."
      breadcrumbs={[{ label: "AI tools", to: "/ai" }, { label: "Claude" }]}
      modes={modes}
      mode={workflow}
      onMode={(id) => setWorkflow(id as ClaudeWorkflow)}
      placeholder={placeholders[workflow]}
      maxLength={80000}
      acknowledgeLabel="I will check important facts. This source has no secrets or budget figures."
      canRun={desk.canRun}
      blockedNote={desk.canRun ? undefined : note}
      onSend={async ({ mode, brief }) => {
        const envelope = await api<Envelope<ClaudeRun>>("/claude/runs", {
          method: "POST",
          body: JSON.stringify({ workflow: mode, brief, acknowledged: true }),
        });
        return { output: envelope.data.output, reviewNote: envelope.data.reviewNote };
      }}
    />
  );
}
