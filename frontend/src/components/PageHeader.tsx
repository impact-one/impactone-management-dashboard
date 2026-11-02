import type { ReactNode } from "react";
import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTitle } from "../lib/useTitle";

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  useTitle(title);
  return (
    <header className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{lede}</p>
      </div>
      {children}
    </header>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="mb-6 grid gap-3" role="status" aria-label={label}>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function RetryableError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <CircleAlertIcon />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 bg-background" onClick={onRetry}>
          <RefreshCwIcon className="size-3.5" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Alert className="mb-4 border-border bg-card py-2 text-foreground shadow-sm">
      <InfoIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
