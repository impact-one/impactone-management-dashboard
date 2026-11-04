import { ApiError } from "./api";
import { clearSessionToken, readSessionToken } from "./session";

export async function downloadApiFile(path: string) {
  const headers = new Headers();
  const token = readSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { headers, credentials: "include" });
  if (!response.ok) {
    if (response.status === 401 && !window.location.pathname.startsWith("/login")) {
      clearSessionToken();
      window.location.assign("/login");
    }
    let message = "Could not download that file.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      message = "Could not download that file.";
    }
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();
  const filename = filenameFrom(response.headers.get("Content-Disposition")) ?? "document";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function filenameFrom(header: string | null) {
  if (!header) return null;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] || null;
}
