import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Origin } from "../types";

const labels: Record<Origin, string> = {
  live: "Live",
  sample: "Sample",
  documented: "Documented",
  "needs-review": "Needs review",
};

const tones: Record<Origin, string> = {
  live: "text-[var(--origin-live-fg)]",
  sample: "text-[var(--origin-sample-fg)]",
  documented: "text-[var(--origin-documented-fg)]",
  "needs-review": "text-[var(--origin-review-fg)]",
};

const dots: Record<Origin, string> = {
  live: "bg-[var(--origin-live-dot)]",
  sample: "bg-[var(--origin-sample-dot)]",
  documented: "bg-[var(--origin-documented-dot)]",
  "needs-review": "bg-[var(--origin-review-dot)]",
};

const shell =
  "h-6 shrink-0 gap-1.5 rounded-md border-[var(--badge-shell-border)] bg-[var(--badge-shell-bg)] px-2 text-[11px] font-medium shadow-none";

export function SourceBadge({ origin }: { origin: Origin }) {
  return (
    <Badge variant="outline" className={cn(shell, tones[origin])}>
      <span className={cn("size-1.5 rounded-full", dots[origin])} aria-hidden="true" />
      {labels[origin]}
    </Badge>
  );
}

export function ReviewList({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className="grid list-none gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 text-xs leading-5 text-foreground">
      {flags.map((flag) => (
        <li key={flag} className="flex gap-2">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--origin-review-dot)]" aria-hidden="true" />
          <span>{flag}</span>
        </li>
      ))}
    </ul>
  );
}

/** Step state on system map — visually distinct from data-origin badges. */
export function StepStateBadge({ state }: { state: string }) {
  return (
    <Badge variant="outline" className={cn(shell, "capitalize text-foreground")}>
      {state}
    </Badge>
  );
}
