import type { ReactNode } from "react";
import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
    <header className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
      <div className="relative max-w-2xl pl-3.5 sm:pl-5">
        <span
          className="absolute top-1 bottom-1 left-0 w-1 rounded-full bg-primary"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-1.5 text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{lede}</p>
      </div>
      {children ? <div className="w-full shrink-0 sm:w-auto sm:pb-0.5">{children}</div> : null}
    </header>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mb-5 rounded-xl sm:mb-6">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function RetryableError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mb-5 rounded-xl sm:mb-6">
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
    <Alert className="mb-5 rounded-xl border-primary/15 bg-accent/40 py-3 text-foreground shadow-none ring-0 sm:mb-6">
      <InfoIcon className="text-primary!" />
      <AlertDescription className="text-sm leading-5 text-foreground/90">{children}</AlertDescription>
    </Alert>
  );
}
