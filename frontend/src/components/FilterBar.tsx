import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Origin } from "../types";

const ORIGIN_OPTIONS: { value: Origin | "all"; label: string }[] = [
  { value: "all", label: "All origins" },
  { value: "live", label: "Live" },
  { value: "sample", label: "Sample" },
  { value: "documented", label: "Documented" },
  { value: "needs-review", label: "Needs review" },
];

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface mb-6 grid gap-4 rounded-2xl bg-card/90 p-4 ring-0 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.4fr)_repeat(auto-fit,minmax(9rem,1fr))] lg:items-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterSearch({
  id,
  label = "Search",
  value,
  onChange,
  placeholder = "Search…",
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className="h-9 bg-background"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterOrigin({
  id = "filter-origin",
  value,
  onChange,
}: {
  id?: string;
  value: Origin | "all";
  onChange: (value: Origin | "all") => void;
}) {
  return (
    <FilterSelect
      id={id}
      label="Origin"
      value={value}
      onChange={(next) => onChange(next as Origin | "all")}
      options={ORIGIN_OPTIONS}
    />
  );
}

export function ResultCount({ shown, total, label = "rows" }: { shown: number; total: number; label?: string }) {
  return (
    <p className="mb-3 text-sm text-muted-foreground">
      Showing <span className="font-semibold text-foreground tabular-nums">{shown}</span> of{" "}
      <span className="font-semibold text-foreground tabular-nums">{total}</span> {label}
    </p>
  );
}
