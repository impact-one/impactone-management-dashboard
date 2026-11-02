import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SoftSparkline, sparkFromValue } from "./charts";
import { cn } from "@/lib/utils";
import { ReviewList, SourceBadge } from "./SourceBadge";
import type { Origin } from "../types";

export function Section({
  id,
  title,
  children,
  action,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section className="mt-9" id={id} aria-labelledby={headingId}>
      <div className="mb-4 flex items-center gap-3">
        <h2 id={headingId} className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border via-border/70 to-transparent" />
        {action}
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
        "stagger grid list-none gap-4 p-0 sm:gap-5",
        columns === "5" && "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
        columns === "2" && "md:grid-cols-2",
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
  items: {
    label: string;
    value: number | string;
    icon: ReactNode;
    hint?: string;
    tone?: "default" | "good" | "warn" | "muted";
  }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const tone = item.tone ?? "default";
        const valueClass =
          tone === "good"
            ? "text-primary"
            : tone === "warn"
              ? "text-[var(--due-overdue-fg)]"
              : tone === "muted"
                ? "text-muted-foreground"
                : "text-foreground";
        const sparkSeed =
          typeof item.value === "number"
            ? Math.max(item.value, 2)
            : Math.max(3, ([...item.label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 7) + 3);

        return (
          <Card
            key={item.label}
            className="surface relative flex h-full flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-card py-0 shadow-none ring-0 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-primary before:via-[var(--brand-leaf)] before:to-[var(--brand-cyan)]"
          >
            <CardContent className="flex h-full flex-col px-3.5 pt-3.5 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-primary ring-1 ring-primary/10 [&_svg]:size-3.5">
                  {item.icon}
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 truncate text-xl leading-none font-semibold tracking-tight tabular-nums",
                  valueClass,
                )}
                title={String(item.value)}
              >
                {item.value}
              </p>
              {item.hint ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.hint}</p>
              ) : (
                <p className="mt-1 text-[11px] text-transparent select-none" aria-hidden="true">
                  —
                </p>
              )}
              <div className="mt-auto border-t border-border/50 pt-2.5">
                <SoftSparkline values={sparkFromValue(sparkSeed)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "surface flex min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-card py-0 shadow-none ring-0",
        className,
      )}
    >
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border/60 px-5 pt-4 pb-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </CardHeader>
      <CardContent className="px-0 pb-2">{children}</CardContent>
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
    <Card className="lift surface h-full gap-0 overflow-hidden rounded-2xl border-0 bg-card py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary ring-1 ring-primary/10 [&_svg]:size-4">
            {mark}
          </span>
          <div className="min-w-0">
            {kicker ? <p className="text-xs font-medium text-muted-foreground">{kicker}</p> : null}
            <h3 className="text-[15px] leading-snug font-semibold tracking-tight">{title}</h3>
          </div>
        </div>
        {origin ? <SourceBadge origin={origin} /> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-5 pt-1 pb-5">
        {summary ? <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{summary}</p> : null}
        {fields && fields.length > 0 ? (
          <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-3.5">
            {fields.map((field) => (
              <div key={field.label} className={field.wide ? "col-span-2" : undefined}>
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {field.label}
                </dt>
                <dd className="mt-1 text-sm leading-5 text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {flags ? <ReviewList flags={flags} /> : null}
      </CardContent>
    </Card>
  );
}
