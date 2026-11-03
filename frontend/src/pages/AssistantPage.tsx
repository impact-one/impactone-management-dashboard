import { useEffect, useRef, useState, type FormEvent } from "react";
import { LightbulbIcon, ListTreeIcon, PenLineIcon, SearchIcon, TextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNote, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { api } from "../lib/api";
import type { AssistantDesk, AssistantRun, AssistantWorkflow, Envelope } from "../types";

const taskIcon: Record<AssistantWorkflow, typeof PenLineIcon> = {
  draft: PenLineIcon,
  research: SearchIcon,
  analyze: ListTreeIcon,
  brainstorm: LightbulbIcon,
  summarize: TextIcon,
};

const taskLine: Record<AssistantWorkflow, string> = {
  draft: "Email, brief, or update.",
  research: "What is known, and what to check.",
  analyze: "Findings, risks, and open points.",
  brainstorm: "Options to review. Not a decision.",
  summarize: "A short version to review.",
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
  const [brief, setBrief] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AssistantRun | undefined>();
  const [copied, setCopied] = useState(false);
  const replyRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (result) replyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!desk?.canRun || running) return;
    setFormError(undefined);
    setCopied(false);
    setRunning(true);
    try {
      const envelope = await api<Envelope<AssistantRun>>("/assistant/runs", {
        method: "POST",
        body: JSON.stringify({ workflow, brief: brief.trim(), acknowledged: true }),
      });
      setResult(envelope.data);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setRunning(false);
    }
  }

  async function copyOutput() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
    } catch {
      setFormError("Could not copy. Select the reply and copy it manually.");
    }
  }

  const selected = desk?.workflows.find((item) => item.id === workflow);
  const blocked = Boolean(desk && !desk.canRun);

  return (
    <>
      <PageHeader
        eyebrow="Assistant"
        title="ChatGPT"
        lede="Pick a task, write the note, and read the reply before you share it."
      />
      {loading && !desk ? (
        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]" role="status" aria-label="Loading assistant">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : null}
      {error && !desk ? <RetryableError message={error} onRetry={() => void load()} /> : null}
      {blocked && note ? <Note>{note}</Note> : null}

      <div className={result ? "assistant-workspace has-reply" : "assistant-workspace"}>
        {desk?.canRun ? (
          <form
            className="surface relative overflow-hidden rounded-2xl bg-card before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-primary before:via-[var(--brand-leaf)] before:to-[var(--brand-cyan)]"
            onSubmit={(event) => void onSubmit(event)}
          >
            <div className="assistant-composer">
              <fieldset className="border-b border-border/70 bg-muted/40 p-2 lg:border-r lg:border-b-0">
                <legend className="sr-only">Task</legend>
                <div className="assistant-tasks-compact gap-1 overflow-x-auto" role="radiogroup" aria-label="Task">
                  {desk.workflows.map((item) => {
                    const active = item.id === workflow;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={running}
                        onClick={() => setWorkflow(item.id)}
                        className={
                          active
                            ? "h-8 shrink-0 rounded-lg bg-card px-3 text-sm font-medium text-foreground shadow-sm"
                            : "h-8 shrink-0 rounded-lg px-3 text-sm font-medium text-muted-foreground"
                        }
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="assistant-tasks" role="radiogroup" aria-label="Task">
                  {desk.workflows.map((item) => {
                    const active = item.id === workflow;
                    const Icon = taskIcon[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={running}
                        onClick={() => setWorkflow(item.id)}
                        className={
                          active
                            ? "flex items-start gap-3 rounded-xl bg-card px-3 py-2 text-left shadow-sm ring-1 ring-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            : "flex items-start gap-3 rounded-xl px-3 py-2 text-left text-muted-foreground hover:bg-card/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        }
                      >
                        <Icon className={active ? "mt-0.5 size-4 shrink-0 text-primary" : "mt-0.5 size-4 shrink-0"} />
                        <span>
                          <span className={active ? "block text-sm font-medium text-foreground" : "block text-sm font-medium"}>
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{taskLine[item.id]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 p-4 sm:p-5">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">{selected?.label ?? "Notes"}</span>
                  <textarea
                    className="w-full resize-y rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                    style={{ height: "9rem" }}
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    placeholder={placeholders[workflow]}
                    maxLength={6000}
                    required
                    disabled={running}
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                      disabled={running}
                      required
                    />
                    <span>I will review the reply. No secrets or budget figures.</span>
                  </label>
                  <Button type="submit" className="sm:shrink-0" disabled={running || !acknowledged || brief.trim().length < 8}>
                    {running ? "Working…" : selected?.label ?? "Run"}
                  </Button>
                </div>
                {formError ? <ErrorNote message={formError} /> : null}
              </div>
            </div>
          </form>
        ) : null}

        {result ? (
          <section
            ref={replyRef}
            className="surface rounded-2xl bg-card p-4 sm:p-5"
            aria-labelledby="assistant-reply"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="assistant-reply" className="text-[15px] font-semibold tracking-tight">
                Reply
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyOutput()}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="max-h-80 overflow-auto border-l-2 border-primary/25 pl-4 text-sm leading-6 whitespace-pre-wrap">
              {result.output}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Review this reply before you share it.</p>
          </section>
        ) : null}
      </div>
    </>
  );
}
