import { env } from "../../../config/env.js";
import type { DocumentItem } from "../../../types/domain.js";
import { readJson, ReadOnlyClient } from "./readOnlyClient.js";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const driveClient = new ReadOnlyClient<DocumentItem[]>({
  isConfigured: () => Boolean(env.googleAccessToken),
  missingMessage: "Google access token is not set. Documents stay on labelled sample rows.",
  load: async () => {
    const params = new URLSearchParams({
      pageSize: "15",
      fields: "files(id,name,modifiedTime,webViewLink)",
      orderBy: "modifiedTime desc",
    });
    const payload = await readJson(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      Authorization: `Bearer ${env.googleAccessToken ?? ""}`,
    });
    const record = payload && typeof payload === "object" ? (payload as { files?: unknown }) : {};
    const files = Array.isArray(record.files) ? record.files : [];
    return files.slice(0, 15).map((item, index) => {
      const file = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const href = text(file.webViewLink);
      return {
        id: `drive-${text(file.id) || String(index)}`,
        projectId: null,
        projectName: "Google Drive",
        title: text(file.name) || "Untitled file",
        owner: "Google Drive",
        source: {
          origin: "live" as const,
          system: "Google Drive",
          detail: "File name and link only. File contents are not downloaded.",
        },
        href: href || null,
        reviewFlags: [],
      };
    });
  },
});
