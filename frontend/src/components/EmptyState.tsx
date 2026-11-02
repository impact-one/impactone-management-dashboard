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
    <div className="grid place-items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-lg text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
