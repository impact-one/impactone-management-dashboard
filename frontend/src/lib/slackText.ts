import type { SlackFile } from "../types";

export interface SlackTextPart {
  type: "text" | "link" | "code" | "strong";
  text: string;
  href?: string;
}

const TOKEN =
  /<@([A-Z0-9]+)(?:\|([^>]+))?>|<#([A-Z0-9]+)(?:\|([^>]+))?>|<(https?:\/\/[^|>\s]+)(?:\|([^>]+))?>|`([^`\n]+)`|\*([^*\n]+)\*/g;

export function displayAuthor(author: string) {
  const value = author.trim() || "Unknown";
  if (/^U[A-Z0-9]{8,}$/i.test(value)) return `Member ${value.slice(-4)}`;
  return value;
}

export function slackParts(input: string): SlackTextPart[] {
  const parts: SlackTextPart[] = [];
  let cursor = 0;
  for (const match of input.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: "text", text: decode(input.slice(cursor, index)) });
    if (match[1]) parts.push({ type: "text", text: `@${match[2] || "member"}` });
    else if (match[3]) parts.push({ type: "text", text: `#${match[4] || "channel"}` });
    else if (match[5]) {
      const href = safeHttp(match[5]);
      const label = decode(match[6] || match[5]);
      if (href) parts.push({ type: "link", text: label, href });
      else parts.push({ type: "text", text: label });
    } else if (match[7]) parts.push({ type: "code", text: decode(match[7]) });
    else if (match[8]) parts.push({ type: "strong", text: decode(match[8]) });
    cursor = index + match[0].length;
  }
  if (cursor < input.length) parts.push({ type: "text", text: decode(input.slice(cursor)) });
  return parts;
}

export function plainSlackText(input: string): string {
  return slackParts(input)
    .map((part) => part.text)
    .join("");
}

/** Hide Slack's filename-only caption when the file card already shows that name. */
export function messageBody(text: string, files: Pick<SlackFile, "name" | "title">[]): string {
  let plain = plainSlackText(text).trim();
  if (!plain) return "";
  const names = new Set(files.flatMap((file) => [file.name.trim(), file.title.trim()].filter(Boolean)));
  if (names.has(plain)) return "";
  plain = plain.replace(/^(?:@\S+\s+)?uploaded a file:\s+.+$/i, "").trim();
  return plain;
}

function safeHttp(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function decode(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
