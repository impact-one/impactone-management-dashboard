import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRightIcon, FileTextIcon, InfoIcon, PlusIcon, SquareCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../app/AuthContext";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ErrorNote, RetryableError } from "../components/PageHeader";
import { DetailSkeleton } from "../components/PageSkeleton";
import { dueState, formatDate } from "../lib/format";
import { useTitle } from "../lib/useTitle";
import { downloadApiFile } from "../lib/download";
import { useApi } from "../lib/useApi";
import type { Envelope, ProjectDetail, Task } from "../types";

type Tone = "done" | "active" | "progress" | "planned" | "review" | "neutral";

const toneOrder: Tone[] = ["done", "active", "progress", "planned", "review", "neutral"];

const barColor: Record<Tone, string> = {
  done: "bg-[var(--brand-leaf)]",
  active: "bg-[var(--brand-leaf)]",
  progress: "bg-[var(--brand-cyan)]",
  planned: "bg-[oklch(0.82_0.008_236)]",
  review: "bg-[var(--origin-review-dot)]",
  neutral: "bg-muted-foreground/35",
};

const ringColor: Record<Tone, string> = {
  done: "border-[var(--brand-leaf)]",
  active: "border-[var(--brand-leaf)]",
  progress: "border-[var(--brand-cyan)]",
  planned: "border-[oklch(0.75_0.01_236)]",
  review: "border-[var(--origin-review-dot)]",
  neutral: "border-muted-foreground/40",
};

const dotColor: Record<Tone, string> = {
  done: "bg-[var(--brand-leaf)]",
  active: "bg-[var(--brand-leaf)]",
  progress: "bg-[var(--brand-cyan)]",
  planned: "bg-muted-foreground/45",
  review: "bg-[var(--origin-review-dot)]",
  neutral: "bg-muted-foreground/45",
};

const pillColor: Record<Tone, string> = {
  done: "bg-[color-mix(in_oklch,var(--brand-leaf)_16%,white)] text-[oklch(0.38_0.11_145)]",
  active: "bg-[color-mix(in_oklch,var(--brand-leaf)_16%,white)] text-[oklch(0.38_0.11_145)]",
  progress: "bg-[color-mix(in_oklch,var(--brand-cyan)_14%,white)] text-[oklch(0.42_0.09_223)]",
  planned: "bg-muted text-muted-foreground",
  review: "bg-[color-mix(in_oklch,var(--origin-review-dot)_12%,white)] text-[var(--due-overdue-fg)]",
  neutral: "bg-muted text-muted-foreground",
};

const captionColor: Record<Tone, string> = {
  done: "text-[oklch(0.42_0.11_145)]",
  active: "text-[oklch(0.42_0.11_145)]",
  progress: "text-[oklch(0.45_0.09_223)]",
  planned: "text-muted-foreground",
  review: "text-[var(--due-overdue-fg)]",
  neutral: "text-muted-foreground",
};

function toneOf(status: string): Tone {
  const key = status.trim().toLowerCase().replaceAll("_", "-");
  if (key === "done" || key === "complete" || key === "completed" || key === "closed") return "done";
  if (key === "active") return "active";
  if (key.includes("progress") || key === "doing") return "progress";
  if (key.includes("review") || key === "blocked" || key === "overdue") return "review";
  if (key === "planned" || key === "open") return "planned";
  return "neutral";
}

function statusLabel(value: string) {
  const text = value.replaceAll("-", " ").replaceAll("_", " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : value;
}

function person(value: string) {
  return value.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function roleMark(role: string) {
  const key = role.toLowerCase();
  if (key.includes("coordination") || key.includes("project manager")) return "PM";
  const words = role
    .split(/[^A-Za-z]+/)
    .filter((word) => word && !["and", "of", "the", "for"].includes(word.toLowerCase()));
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] ?? role).slice(0, 2).toUpperCase();
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

function compactMoney(amount: number, currency: string) {
  if (Math.abs(amount) >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${currency} ${millions}M`;
  }
  return money(amount, currency);
}

function isClosed(status: string) {
  return toneOf(status) === "done";
}

function isOverdue(item: { dueDate: string | null; status: string }) {
  return !isClosed(item.status) && dueState(item.dueDate) === "overdue";
}

function statusGroups(items: { status: string }[]) {
  const groups = new Map<string, { tone: Tone; label: string; count: number }>();
  for (const item of items) {
    const label = statusLabel(item.status);
    const key = label.toLowerCase();
    const current = groups.get(key);
    if (current) current.count += 1;
    else groups.set(key, { tone: toneOf(item.status), label, count: 1 });
  }
  return [...groups.values()].sort((a, b) => toneOrder.indexOf(a.tone) - toneOrder.indexOf(b.tone));
}

function attentionCopy(overdue: number, review: number) {
  const parts: string[] = [];
  if (overdue === 1) parts.push("1 follow-up is overdue");
  else if (overdue > 1) parts.push(`${overdue} follow-ups are overdue`);
  if (review === 1) parts.push("1 item is waiting for review");
  else if (review > 1) parts.push(`${review} items are waiting for review`);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `Needs attention: ${parts[0]}.`;
  return `Needs attention: ${parts[0]} and ${parts[1]}.`;
}

function earliestOverdue(items: { dueDate: string | null; status: string }[]) {
  return items
    .filter(isOverdue)
    .map((item) => item.dueDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
}

function jumpTo(id: string, focus: boolean) {
  const section = document.getElementById(id);
  if (!section) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (!focus) return;
  const heading = section.querySelector("h2");
  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function StatusMark({ status }: { status: string }) {
  return <span className={cn("size-4 shrink-0 rounded-full border-2 bg-card", ringColor[toneOf(status)])} aria-hidden="true" />;
}

function StatusPill({ status }: { status: string }) {
  const tone = toneOf(status);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", pillColor[tone])}>
      <span className={cn("size-1.5 rounded-full", dotColor[tone])} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

function DuePill({ value }: { value: string | null }) {
  const state = dueState(value);
  if (state === "overdue") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_oklch,var(--origin-review-dot)_12%,white)] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-[var(--due-overdue-fg)]">
        Overdue · {formatDate(value)}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
      {state === "none" ? "No date" : formatDate(value)}
    </span>
  );
}

function Panel({
  id,
  title,
  count,
  action,
  children,
}: {
  id: string;
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="surface scroll-mt-24 rounded-2xl bg-card px-4 py-3.5 sm:px-5">
      <header className="flex items-center justify-between gap-3">
        <h2 id={`${id}-heading`} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          {title}
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        </h2>
        {action}
      </header>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function RecordRow({ status, title, meta }: { status: string; title: string; meta: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <StatusMark status={status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={title}>
          {title}
        </p>
        {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      <StatusPill status={status} />
    </li>
  );
}

function SegmentBar({ items }: { items: { id: string; status: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex h-1.5 gap-1" aria-hidden="true">
      {items.map((item) => (
        <span key={item.id} className={cn("h-full min-w-1 flex-1 rounded-full", barColor[toneOf(item.status)])} />
      ))}
    </div>
  );
}

function StatusCaption({ items }: { items: { status: string }[] }) {
  const groups = statusGroups(items);
  if (groups.length === 0) return null;
  return (
    <p className="mt-2 text-xs leading-5">
      {groups.map((group, index) => (
        <span key={group.label}>
          {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
          <span className={captionColor[group.tone]}>
            {group.count} {group.label.toLowerCase()}
          </span>
        </span>
      ))}
    </p>
  );
}

function Stat({
  label,
  value,
  suffix,
  children,
}: {
  label: string;
  value: string;
  suffix?: string;
  children?: ReactNode;
}) {
  return (
    <article className="surface h-full rounded-2xl bg-card px-4 py-3.5">
      <h2 className="text-[13px] font-medium text-muted-foreground">{label}</h2>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[1.65rem] font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </p>
      {children}
    </article>
  );
}

const primaryPill =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const quietPill =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Envelope<ProjectDetail>>(id ? `/projects/${id}` : null);
  const detail = data?.data;
  const [downloadError, setDownloadError] = useState<string | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function downloadDocument(documentId: string) {
    setDownloadError(undefined);
    setDownloadingId(documentId);
    try {
      await downloadApiFile(`/documents/files/${encodeURIComponent(documentId)}/download`);
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : "Could not download that file.");
    } finally {
      setDownloadingId(null);
    }
  }
  useTitle(detail?.project.name ?? "Project");

  if (!id) return <ErrorNote message="Project not found." />;

  const tasks = detail?.tasks ?? [];
  const documents = detail ? [...detail.documents, ...detail.teamLiveDocuments] : [];
  const milestones = detail?.milestones ?? [];
  const workstreams = detail?.project.workstreams ?? [];
  const followUps = detail?.followUps ?? [];
  const consultants = detail?.consultants ?? [];
  const showFees = Boolean(user?.permissions.viewConsultantFees);

  const doneMilestones = milestones.filter((item) => isClosed(item.status)).length;
  const runningWorkstreams = workstreams.filter((item) => !isClosed(item.status)).length;
  const openFollowUps = followUps.filter((item) => !isClosed(item.status));
  const overdueFollowUps = followUps.filter(isOverdue);
  const overdueSince = earliestOverdue(followUps);
  const reviewItems = [...milestones, ...workstreams].filter((item) => toneOf(item.status) === "review").length;
  const attention = attentionCopy(overdueFollowUps.length, reviewItems);
  const funded = consultants.filter((item) => item.feeAmount !== null);
  const currency = consultants.find((item) => item.currency)?.currency ?? "SAR";
  const assignedTotal = funded.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);

  function openSection(sectionId: string) {
    jumpTo(sectionId, true);
  }

  function reviewNow() {
    if (overdueFollowUps.length > 0) {
      openSection("follow-ups");
      return;
    }
    if (milestones.some((item) => toneOf(item.status) === "review")) {
      openSection("milestones");
      return;
    }
    openSection("workstreams");
  }

  return (
    <>
      {loading && !detail ? <DetailSkeleton /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {detail ? (
        <div>
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: "Projects", to: "/projects" },
              { label: detail.project.name },
            ]}
          />

          <header className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground">{detail.project.name}</h1>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex h-6 items-center rounded-md bg-muted px-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {detail.project.organisation}
                </span>
                <span>
                  Owner: <span className="text-foreground/80">{person(detail.project.owner)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-foreground/80">
                  <span className={cn("size-1.5 rounded-full", dotColor[toneOf(detail.project.status)])} aria-hidden="true" />
                  {statusLabel(detail.project.status)}
                </span>
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{detail.project.summary}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/tasks" className={quietPill}>
                All tasks
                <ArrowUpRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </Link>
              <Link to="/tasks" className={primaryPill}>
                <PlusIcon className="size-4" aria-hidden="true" />
                Add task
              </Link>
            </div>
          </header>

          {attention ? (
            <div
              role="status"
              className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[color-mix(in_oklch,var(--origin-review-dot)_9%,white)] px-4 py-3 text-sm text-[var(--due-overdue-fg)]"
            >
              <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1">{attention}</p>
              <button
                type="button"
                className="font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={reviewNow}
              >
                Review now
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Milestones" value={String(doneMilestones)} suffix={`of ${milestones.length} done`}>
              <SegmentBar items={milestones} />
              <StatusCaption items={milestones} />
            </Stat>
            <Stat label="Workstreams" value={String(runningWorkstreams)} suffix="running">
              <SegmentBar items={workstreams} />
              <StatusCaption items={workstreams} />
            </Stat>
            <Stat label="Follow-ups" value={String(openFollowUps.length)} suffix="open">
              {overdueFollowUps.length > 0 ? (
                <p className="mt-3 text-xs leading-5 text-[var(--due-overdue-fg)]">
                  {overdueFollowUps.length} overdue
                  {overdueSince ? <span> · since {formatDate(overdueSince)}</span> : null}
                </p>
              ) : openFollowUps.length > 0 ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">None overdue</p>
              ) : null}
            </Stat>
            <Stat
              label="Consultant budget"
              value={!showFees ? "Hidden" : consultants.length === 0 ? "—" : compactMoney(assignedTotal, currency)}
              suffix={showFees && consultants.length > 0 ? "assigned" : undefined}
            >
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {!showFees
                  ? "Consultant fees are hidden for this role."
                  : consultants.length === 0
                    ? "No consultants assigned"
                    : `${funded.length} of ${consultants.length} consultants have a budget`}
              </p>
            </Stat>
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="grid content-start gap-4">
              <Panel id="milestones" title="Milestones" count={milestones.length}>
                {milestones.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No milestones listed.</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {milestones.map((row) => (
                      <RecordRow key={row.id} status={row.status} title={row.title} meta={person(row.owner)} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel id="workstreams" title="Workstreams" count={workstreams.length}>
                {workstreams.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No workstreams listed.</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {workstreams.map((row) => (
                      <RecordRow key={row.id} status={row.status} title={row.name} meta={person(row.owner)} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel id="documents" title="Documents" count={documents.length}>
                {downloadError ? <ErrorNote message={downloadError} /> : null}
                {documents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No project documents.</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {documents.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--brand-leaf)_16%,white)] text-primary">
                          <FileTextIcon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => downloadDocument(item.id)}
                            disabled={downloadingId === item.id}
                            className="text-left text-sm leading-5 font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-60"
                          >
                            {downloadingId === item.id ? "Downloading…" : item.title}
                          </button>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.projectId ? person(item.owner) : `${person(item.owner)} · team-wide`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="grid content-start gap-4">
              <Panel id="follow-ups" title="Follow-ups" count={followUps.length}>
                {followUps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No open follow-ups.</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {followUps.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 font-medium text-foreground">{row.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{person(row.owner)}</p>
                        </div>
                        <DuePill value={row.dueDate} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel
                id="tasks"
                title="Tasks"
                count={tasks.length}
                action={
                  <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    All tasks
                    <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                  </Link>
                }
              >
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <SquareCheckIcon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm text-muted-foreground">No tasks on this project yet.</p>
                    <Link to="/tasks" className={cn(quietPill, "mt-3 h-8 px-3 text-[13px]")}>
                      <PlusIcon className="size-3.5" aria-hidden="true" />
                      Add task
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {tasks.map((row) => (
                      <TaskRow key={row.id} task={row} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel id="consultants" title="Consultants" count={consultants.length}>
                {consultants.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No consultants assigned.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-border/70">
                      {consultants.map((row) => (
                        <li key={row.id} className="flex items-center gap-3 py-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                            {roleMark(row.role)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground" title={row.role}>
                              {row.role}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className={cn("size-1.5 rounded-full", dotColor[toneOf(row.status)])} aria-hidden="true" />
                              {statusLabel(row.status)}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "shrink-0 text-sm whitespace-nowrap tabular-nums",
                              showFees && row.feeAmount !== null ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {!showFees ? "Hidden" : row.feeAmount === null ? "Budget not set" : money(row.feeAmount, row.currency)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm">
                      <span className="text-muted-foreground">Total assigned</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {showFees ? money(assignedTotal, currency) : "Hidden"}
                      </span>
                    </div>
                  </>
                )}
              </Panel>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TaskRow({ task }: { task: Task }) {
  const meta = task.dueDate ? `${person(task.owner)} · ${formatDate(task.dueDate)}` : person(task.owner);
  const title = task.href ? (
    <a href={task.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
      {task.title}
    </a>
  ) : (
    task.title
  );
  return (
    <li className="flex items-center gap-3 py-3">
      <StatusMark status={task.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={task.title}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <StatusPill status={task.status} />
    </li>
  );
}
