import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dueLabel, dueState, formatDate } from "../lib/format";

const tones = {
  none: "text-[var(--due-none-fg)]",
  overdue: "text-[var(--due-overdue-fg)]",
  soon: "text-[var(--due-soon-fg)]",
  later: "text-[var(--due-later-fg)]",
};

const shell =
  "h-5 border-[var(--badge-shell-border)] bg-[var(--badge-shell-bg)] px-1.5 text-xs font-medium shadow-none";

export function Due({ value }: { value: string | null }) {
  const state = dueState(value);
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
      <span className="text-sm whitespace-nowrap text-foreground tabular-nums">{formatDate(value)}</span>
      <Badge variant="outline" className={cn(shell, tones[state])}>
        {dueLabel(state)}
      </Badge>
    </span>
  );
}
