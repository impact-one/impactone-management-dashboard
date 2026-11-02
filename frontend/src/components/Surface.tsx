import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReviewList, SourceBadge } from "./SourceBadge";
import type { Origin } from "../types";

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section className="mt-8" id={id} aria-labelledby={headingId}>
      <div className="mb-3 flex items-center gap-3">
        <h2 id={headingId} className="text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

export function CardGrid({
  children,
  columns = "3",
}: {
  children: ReactNode;
  columns?: "2" | "3" | "5";
}) {
  return (
    <ul
      className={cn(
        "stagger grid list-none gap-4 p-0",
        columns === "5" && "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
        columns === "2" && "lg:grid-cols-2",
        columns === "3" && "sm:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </ul>
  );
}

export function MetricStrip({
  items,
}: {
  items: { label: string; value: number; icon: ReactNode }[];
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border bg-border shadow-sm sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-4 last:sm:col-span-2 last:xl:col-span-1">
          <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className="text-primary">{item.icon}</span>
            {item.label}
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

export function RecordCard({
  kicker,
  title,
  origin,
  summary,
  fields,
  flags,
  mark,
}: {
  kicker?: string;
  title: ReactNode;
  origin?: Origin;
  summary?: ReactNode;
  fields?: { label: string; value: ReactNode; wide?: boolean }[];
  flags?: string[];
  mark?: ReactNode;
}) {
  return (
    <Card className="lift h-full gap-0 py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary ring-1 ring-primary/15 [&_svg]:size-4">
            {mark}
          </span>
          <div className="min-w-0">
            {kicker ? (
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{kicker}</p>
            ) : null}
            <h3 className="text-[15px] leading-snug font-semibold tracking-tight">{title}</h3>
          </div>
        </div>
        {origin ? <SourceBadge origin={origin} /> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-4 py-3">
        {summary ? <p className="text-sm leading-6 text-muted-foreground">{summary}</p> : null}
        {fields && fields.length > 0 ? (
          <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3">
            {fields.map((field) => (
              <div key={field.label} className={field.wide ? "col-span-2" : undefined}>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{field.label}</dt>
                <dd className="mt-0.5 text-sm leading-5 text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {flags ? <ReviewList flags={flags} /> : null}
      </CardContent>
    </Card>
  );
}
