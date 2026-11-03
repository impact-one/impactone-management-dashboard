export function formatDate(value: string | null): string {
  if (!value) return "Date not set";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function dueState(value: string | null): "none" | "overdue" | "soon" | "later" {
  if (!value) return "none";
  const today = new Date().toISOString().slice(0, 10);
  if (value < today) return "overdue";
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 7);
  if (value <= horizon.toISOString().slice(0, 10)) return "soon";
  return "later";
}

export function dueLabel(state: ReturnType<typeof dueState>): string {
  if (state === "overdue") return "Overdue";
  if (state === "soon") return "This week";
  if (state === "later") return "Later";
  return "No date";
}

export function formatMoney(amount: number | null, currency = "SAR"): string {
  if (amount === null) return "Hidden";
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isTaskClosed(task: { status: string; closed?: boolean }): boolean {
  if (typeof task.closed === "boolean") return task.closed;
  return task.status === "done";
}

/** Keep the source string. Do not rename, respell, or change case. */
export function plainStatus(value: string): string {
  return value;
}
