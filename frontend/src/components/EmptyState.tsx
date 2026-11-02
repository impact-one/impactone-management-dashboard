import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-start gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/25 px-6 py-12">
      <div className="mb-1 size-8 rounded-lg bg-accent ring-1 ring-primary/10" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-lg text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
