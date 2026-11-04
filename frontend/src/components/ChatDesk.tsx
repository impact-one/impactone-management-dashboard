import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowUpIcon, CheckIcon, ChevronDownIcon, CopyIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Breadcrumbs";

export type ChatMode = {
  id: string;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  modeLabel?: string;
  intentLabel?: string;
  pending?: boolean;
  reviewNote?: string;
};

const frameClass = "-my-5 flex h-[calc(100svh-4rem)] min-h-0 flex-col sm:-my-6 md:h-[calc(100svh-4.5rem)]";

export function ChatDeskFrame({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={frameClass} role={label ? "status" : undefined} aria-label={label}>
      {children}
    </div>
  );
}

export function ChatDesk({
  title,
  lede,
  breadcrumbs,
  modes = [],
  mode,
  onMode,
  placeholder,
  maxLength,
  canRun,
  blockedNote,
  onSend,
}: {
  title: string;
  lede: string;
  breadcrumbs: { label: string; to?: string }[];
  modes?: ChatMode[];
  mode?: string;
  onMode?: (id: string) => void;
  placeholder: string;
  maxLength: number;
  canRun: boolean;
  blockedNote?: string;
  onSend: (input: { mode?: string; brief: string }) => Promise<{ output: string; reviewNote: string; intentLabel?: string }>;
}) {
  const [brief, setBrief] = useState("");
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | undefined>();
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seq = useRef(0);
  const labelId = useId();
  const selected = modes.find((item) => item.id === mode) ?? modes[0];
  const ready = brief.trim().length >= 8 && !running;

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: messages.length > 0 ? "smooth" : "auto" });
  }, [messages]);

  function nextId() {
    seq.current += 1;
    return `turn-${seq.current}`;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canRun || running) return;
    if (modes.length > 0 && !selected) return;
    const text = brief.trim();
    if (text.length < 8) {
      setFormError("Write a little more so the reply has something to work from.");
      return;
    }
    const userId = nextId();
    const replyId = nextId();
    setFormError(undefined);
    setCopiedId(undefined);
    setBrief("");
    setRunning(true);
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text, modeLabel: modes.length > 0 ? selected?.label : undefined },
      { id: replyId, role: "assistant", text: "", pending: true },
    ]);
    try {
      const result = await onSend({ mode: selected?.id, brief: text });
      setMessages((current) =>
        current.map((item) =>
          item.id === replyId
            ? { ...item, text: result.output, reviewNote: result.reviewNote, intentLabel: result.intentLabel, pending: false }
            : item,
        ),
      );
    } catch (reason) {
      setMessages((current) => current.filter((item) => item.id !== userId && item.id !== replyId));
      setBrief(text);
      setFormError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
    } catch {
      setFormError("Could not copy. Select the reply and copy it manually.");
    }
  }

  return (
    <div className={frameClass}>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <header className="shrink-0 pb-5">
          <Breadcrumbs items={breadcrumbs} className="mb-2.5" />
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </header>

        <div
          ref={threadRef}
          className="min-h-0 flex-1 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={`${title} conversation`}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              {selected ? <selected.icon className="size-5 text-primary" /> : null}
              {selected ? <p className="mt-3 text-base font-medium">{selected.label}</p> : null}
              <p className={selected ? "mt-1 max-w-sm text-sm leading-6 text-muted-foreground" : "max-w-md text-sm leading-6 text-muted-foreground"}>
                {selected?.hint ?? lede}
              </p>
              {blockedNote ? <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{blockedNote}</p> : null}
            </div>
          ) : (
            <ol className="flex flex-col gap-4 py-2">
              {messages.map((message) =>
                message.role === "user" ? (
                  <li key={message.id} className="flex justify-end">
                    <div className="max-w-[85%]">
                      {message.modeLabel ? (
                        <p className="mb-1 text-right text-[11px] font-medium text-muted-foreground">{message.modeLabel}</p>
                      ) : null}
                      <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground whitespace-pre-wrap">
                        {message.text}
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={message.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 shadow-sm ring-1 ring-foreground/10">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium text-muted-foreground">{message.intentLabel ?? title}</p>
                        {message.pending || !message.text ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={copiedId === message.id ? "Copied" : "Copy reply"}
                            onClick={() => void copyMessage(message)}
                          >
                            {copiedId === message.id ? <CheckIcon /> : <CopyIcon />}
                          </Button>
                        )}
                      </div>
                      {message.pending ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LoaderCircleIcon className="size-3.5 motion-safe:animate-spin" />
                          Working…
                        </p>
                      ) : (
                        <div className="text-sm leading-6 whitespace-pre-wrap">{message.text}</div>
                      )}
                      {message.reviewNote ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{message.reviewNote}</p>
                      ) : null}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>

        {canRun ? (
          <form className="shrink-0 pt-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-ring/40">
              <label className="sr-only" htmlFor={labelId}>
                Message
              </label>
              <textarea
                id={labelId}
                ref={inputRef}
                rows={1}
                value={brief}
                onChange={(event) => {
                  setBrief(event.target.value);
                  setFormError(undefined);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={running}
                className="max-h-40 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-3.5 pt-3 text-sm leading-6 outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:opacity-60"
              />
              <div className="flex items-center gap-2 px-2 pt-1 pb-2">
                {selected && onMode ? <ModePicker modes={modes} mode={selected.id} onMode={onMode} disabled={running} /> : null}
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {brief.length > 0 ? `${brief.length.toLocaleString()} / ${maxLength.toLocaleString()}` : ""}
                </span>
                <Button
                  type="submit"
                  size="icon"
                  className="size-8 rounded-full"
                  disabled={!ready}
                  aria-label={running ? "Working" : "Send"}
                >
                  {running ? <LoaderCircleIcon className="motion-safe:animate-spin" /> : <ArrowUpIcon />}
                </Button>
              </div>
            </div>
            {formError ? (
              <p className="mt-2 px-1 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}

function ModePicker({
  modes,
  mode,
  onMode,
  disabled,
}: {
  modes: ChatMode[];
  mode: string;
  onMode: (id: string) => void;
  disabled: boolean;
}) {
  const selected = modes.find((item) => item.id === mode) ?? modes[0];
  if (!selected) return null;
  const Icon = selected.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          aria-label={`Task, ${selected.label}`}
        >
          <Icon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{selected.label}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-80"
        style={{ width: "20rem" }}
      >
        <DropdownMenuLabel>Task</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={onMode}>
          {modes.map((item) => {
            const ItemIcon = item.icon;
            return (
              <DropdownMenuRadioItem key={item.id} value={item.id} className="items-start gap-2.5 py-2">
                <ItemIcon className={cn("mt-0.5 size-4 shrink-0", item.id === mode ? "text-primary" : "text-muted-foreground")} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs leading-4 font-normal text-muted-foreground">{item.hint}</span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
