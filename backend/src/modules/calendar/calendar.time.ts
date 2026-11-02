import { AppError } from "../../lib/AppError.js";

export const TEAM_TIME_ZONE = "Asia/Riyadh";

export interface ZonedDateTime {
  timeZone: string;
  date: string;
  time: string;
  iso: string;
  instant: Date;
}

export function assertTimeZone(zone: string): string {
  const value = zone.trim();
  if (!value) throw new AppError(400, "Set a time zone, such as Asia/Riyadh.");
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
  } catch {
    throw new AppError(400, "Use an IANA time zone such as Asia/Riyadh.");
  }
  return value;
}

export function zonedDateTime(date: string, time: string, timeZone: string): ZonedDateTime {
  const zone = assertTimeZone(timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400, "Use a date as YYYY-MM-DD.");
  if (!/^\d{2}:\d{2}$/.test(time)) throw new AppError(400, "Use a time as HH:mm.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new AppError(400, "Use a time as HH:mm.");
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new AppError(400, "That date is not valid.");
  }
  const instant = wallTimeToUtc(year, month, day, hour, minute, zone);
  const offset = formatOffset(instant, zone);
  return {
    timeZone: zone,
    date,
    time,
    iso: `${date}T${time}:00${offset}`,
    instant,
  };
}

function wallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = partsInZone(new Date(utc), timeZone);
    const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = desired - asUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

function partsInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  let hour = pick("hour");
  if (hour === 24) hour = 0;
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour, minute: pick("minute"), second: pick("second") };
}

function formatOffset(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(instant);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  if (name === "GMT" || name === "UTC") return "+00:00";
  const match = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) throw new AppError(400, "Could not resolve the time zone offset.");
  return `${match[1]}${match[2].padStart(2, "0")}:${(match[3] ?? "00").padStart(2, "0")}`;
}
