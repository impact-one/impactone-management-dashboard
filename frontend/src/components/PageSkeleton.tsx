import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Block({ className, ...props }: ComponentProps<"div">) {
  return <Skeleton className={cn("rounded-md", className)} {...props} />;
}

function FilterSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="surface mb-4 grid gap-3 rounded-2xl bg-card p-4 ring-0 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-1.5">
          <Block className="h-3 w-16" />
          <Block className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({
  columns = 5,
  rows = 6,
  label = "Loading table",
}: {
  columns?: number;
  rows?: number;
  label?: string;
}) {
  return (
    <div className="surface overflow-hidden rounded-2xl bg-card ring-0" role="status" aria-label={label}>
      <div className="border-b px-4 py-3.5">
        <Block className="h-4 w-40" />
      </div>
      <div className="grid gap-0">
        <div
          className="hidden gap-3 border-b bg-muted/50 px-4 py-2.5 sm:grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, i) => (
            <Block key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="grid gap-3 border-b px-4 py-3.5 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, col) => (
              <Block key={col} className={cn("h-4", col === 0 ? "w-[85%]" : "w-[65%]", col > 1 && "hidden sm:block")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Filter bar + data table — Tasks, Projects, Follow-ups, Integrations, Audit, Slack */
export function TablePageSkeleton({
  label,
  columns = 5,
  filters = 4,
}: {
  label: string;
  columns?: number;
  filters?: number;
}) {
  return (
    <div className="grid gap-1" role="status" aria-label={label}>
      <FilterSkeleton fields={filters} />
      <Block className="mb-3 h-4 w-28" />
      <TableSkeleton columns={columns} rows={7} label={label} />
    </div>
  );
}

/** Metric strip + feeds — Overview */
export function OverviewSkeleton({ label = "Loading overview" }: { label?: string }) {
  return (
    <div className="grid gap-4" role="status" aria-label={label}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="surface rounded-2xl bg-card p-4 ring-0">
            <Block className="mb-3 h-3 w-16" />
            <Block className="h-7 w-12" />
          </div>
        ))}
      </div>
      <Block className="h-10 w-full rounded-lg" />
      <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
        <div className="border-b px-4 py-3">
          <Block className="h-4 w-28" />
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Block key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, panel) => (
          <div key={panel} className="surface overflow-hidden rounded-2xl bg-card ring-0">
            <div className="border-b px-4 py-3">
              <Block className="h-4 w-24" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Block className="h-4 w-[75%]" />
                    <Block className="h-3 w-[45%]" />
                  </div>
                  <Block className="h-5 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Block className="mb-3 h-4 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="surface rounded-2xl bg-card p-4 ring-0">
              <Block className="mb-3 h-5 w-10" />
              <Block className="mb-2 h-4 w-[70%]" />
              <Block className="h-3 w-full" />
              <Block className="mt-2 h-3 w-[80%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Agenda / documents desk — day groups or file list */
export function DeskSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div className="grid gap-6" role="status" aria-label={label}>
      <div>
        <Block className="mb-3 h-4 w-28" />
        <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
          {Array.from({ length: 2 }, (_, group) => (
            <div key={group} className="border-b last:border-b-0">
              <div className="bg-muted/70 px-4 py-2">
                <Block className="h-3 w-32" />
              </div>
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:gap-6">
                  <div className="sm:w-36">
                    <Block className="mb-1.5 h-4 w-20" />
                    <Block className="h-3 w-14" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Block className="h-4 w-[70%]" />
                    <Block className="h-3 w-[50%]" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Slack — note, metric strip, composer, and message feed */
export function SlackSkeleton({ label = "Loading Slack" }: { label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/15 bg-accent/40 px-4 py-3 sm:mb-6">
        <div className="size-4 shrink-0 animate-pulse rounded-full bg-primary/25" />
        <div className="h-4 max-w-md flex-1 animate-pulse rounded-md bg-primary/15" />
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="surface flex h-full flex-col rounded-2xl bg-card px-3.5 py-3.5 ring-0">
              <div className="flex items-center justify-between gap-2">
                <Block className="h-3 w-16" />
                <Block className="size-7 rounded-md" />
              </div>
              <Block className="mt-3 h-6 w-16" />
              {i === 3 ? <Block className="mt-2 h-3 w-14" /> : null}
            </div>
          ))}
        </div>
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-foreground/10" />
        <section className="mt-9">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-24 animate-pulse rounded-md bg-foreground/10" />
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/70 to-transparent" />
          </div>
          <div className="surface grid max-w-2xl gap-3 rounded-2xl bg-card p-5 ring-0">
            <Block className="h-3.5 w-16" />
            <Block className="h-24 w-full rounded-xl" />
            <Block className="h-9 w-32 rounded-lg" />
          </div>
        </section>
        <section className="mt-9">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-36 animate-pulse rounded-md bg-foreground/10" />
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/70 to-transparent" />
          </div>
          <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
            <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Block className="h-4 w-32" />
                  <Block className="h-3 w-28" />
                </div>
                <div className="grid w-full gap-1.5 sm:max-w-sm">
                  <Block className="h-3 w-14" />
                  <Block className="h-10 w-full rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Block className="h-8 w-14 rounded-full" />
                <Block className="h-8 w-16 rounded-full" />
                <Block className="h-8 w-20 rounded-full" />
              </div>
            </div>
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="flex gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0">
                <Block className="size-8 shrink-0 rounded-full" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <Block className="h-3 w-40" />
                  <Block className="h-4 w-[80%]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** AI tools — filter + card grid */
export function CardsSkeleton({ label, count = 6 }: { label: string; count?: number }) {
  return (
    <div className="grid gap-4" role="status" aria-label={label}>
      <FilterSkeleton fields={3} />
      <Block className="h-4 w-28" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="surface rounded-2xl bg-card p-4 ring-0">
            <div className="mb-3 flex items-center gap-2">
              <Block className="size-8 rounded-lg" />
              <Block className="h-4 w-28" />
            </div>
            <Block className="mb-2 h-3 w-full" />
            <Block className="mb-2 h-3 w-[80%]" />
            <Block className="mt-3 h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Project detail */
export function DetailSkeleton({ label = "Loading project" }: { label?: string }) {
  return (
    <div className="grid gap-4" role="status" aria-label={label}>
      <Block className="h-4 w-48" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Block className="h-8 w-72 max-w-full" />
          <Block className="h-4 w-56" />
          <Block className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex gap-2">
          <Block className="h-9 w-24 rounded-full" />
          <Block className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <Block className="h-12 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="surface rounded-2xl bg-card p-4 ring-0">
            <Block className="mb-3 h-3 w-20" />
            <Block className="h-7 w-24" />
            <Block className="mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden border-b pb-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} className="h-4 w-24 shrink-0" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, column) => (
          <div key={column} className="grid gap-4">
            {Array.from({ length: 2 }, (_, card) => (
              <div key={card} className="surface rounded-2xl bg-card p-4 ring-0">
                <Block className="mb-3 h-4 w-28" />
                {Array.from({ length: 3 }, (_, row) => (
                  <div key={row} className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Block className="h-4 w-[70%]" />
                      <Block className="h-3 w-[40%]" />
                    </div>
                    <Block className="h-5 w-20 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** System map — sticky nav + flow cards + tables */
export function MapSkeleton({ label = "Loading system map" }: { label?: string }) {
  return (
    <div className="grid gap-6" role="status" aria-label={label}>
      <div className="flex flex-wrap gap-2 border-b py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Block key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="surface rounded-2xl bg-card p-4 ring-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Block className="h-4 w-40" />
              <Block className="h-5 w-20" />
            </div>
            <Block className="mb-2 h-3 w-full" />
            <Block className="h-3 w-[75%]" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={4} rows={4} />
    </div>
  );
}

/** IOC — sectioned tables */
export function IocSkeleton({ label = "Loading IOC desk" }: { label?: string }) {
  return (
    <div className="grid gap-8" role="status" aria-label={label}>
      {[0, 1, 2].map((section) => (
        <div key={section}>
          <Block className="mb-3 h-4 w-28" />
          <TableSkeleton columns={section === 1 ? 3 : 5} rows={4} />
        </div>
      ))}
    </div>
  );
}

/** Single section table while sibling sections may already show */
export function SectionTableSkeleton({ label = "Loading" }: { label?: string }) {
  return <TableSkeleton columns={5} rows={4} label={label} />;
}

/** Auth gate */
export function AuthSkeleton({ label = "Checking session" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6" role="status" aria-label={label}>
      <div className="w-full max-w-sm surface space-y-4 rounded-2xl bg-card p-6 ring-0">
        <Block className="mx-auto h-8 w-28" />
        <Block className="h-4 w-full" />
        <Block className="h-4 w-[65%]" />
        <Block className="h-10 w-full" />
      </div>
    </div>
  );
}

/** Pilot / proposal long-form */
export function ProseSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid max-w-3xl gap-4" role="status" aria-label={label}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2 surface rounded-2xl bg-card p-4 ring-0">
          <Block className="h-4 w-40" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-[80%]" />
        </div>
      ))}
    </div>
  );
}
