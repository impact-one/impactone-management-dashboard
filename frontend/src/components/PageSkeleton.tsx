import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Block({ className, ...props }: ComponentProps<"div">) {
  return <Skeleton className={cn("rounded-md", className)} {...props} />;
}

function FilterSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm" role="status" aria-label={label}>
      <div className="border-b px-3 py-3">
        <Block className="h-4 w-40" />
      </div>
      <div className="grid gap-0">
        <div
          className="grid gap-3 border-b bg-muted/50 px-3 py-2.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, i) => (
            <Block key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="grid gap-3 border-b px-3 py-3.5 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, col) => (
              <Block key={col} className={cn("h-4", col === 0 ? "w-[85%]" : "w-[65%]")} />
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

/** Metric strip + dual panels + card grid — Overview */
export function OverviewSkeleton({ label = "Loading overview" }: { label?: string }) {
  return (
    <div className="grid gap-4" role="status" aria-label={label}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
            <Block className="mb-3 h-3 w-16" />
            <Block className="h-7 w-12" />
          </div>
        ))}
      </div>
      <Block className="h-10 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <Block className="h-4 w-24" />
              <Block className="h-7 w-16" />
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
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
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
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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

/** Slack — composer + message table */
export function SlackSkeleton({ label = "Loading Slack" }: { label?: string }) {
  return (
    <div className="grid gap-6" role="status" aria-label={label}>
      <Block className="h-4 w-56" />
      <div>
        <Block className="mb-3 h-4 w-24" />
        <div className="grid max-w-2xl gap-3">
          <Block className="h-3 w-16" />
          <Block className="h-24 w-full rounded-lg" />
          <Block className="h-9 w-32" />
        </div>
      </div>
      <div>
        <Block className="mb-3 h-4 w-36" />
        <TableSkeleton columns={4} rows={5} label={label} />
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
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
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
    <div className="grid gap-6" role="status" aria-label={label}>
      <Block className="h-3 w-40" />
      <div className="space-y-3 border-b pb-5">
        <Block className="h-3 w-24" />
        <Block className="h-8 w-72" />
        <Block className="h-4 w-full max-w-2xl" />
        <Block className="h-4 w-[80%] max-w-xl" />
      </div>
      <div>
        <Block className="mb-3 h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
              <Block className="mb-2 h-4 w-[70%]" />
              <Block className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Block className="mb-3 h-4 w-20" />
        <TableSkeleton columns={5} rows={4} />
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
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
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
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
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
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
          <Block className="h-4 w-40" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-full" />
          <Block className="h-3 w-[80%]" />
        </div>
      ))}
    </div>
  );
}
