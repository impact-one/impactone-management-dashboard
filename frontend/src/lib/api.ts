import { clearSessionToken, readSessionToken } from "./session";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = readSessionToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { error?: string }) : {};

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      clearSessionToken();
      if (path !== "/auth/me" && path !== "/auth/logout" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    throw new ApiError(response.status, payload.error ?? "Request failed.");
  }

  return payload as T;
}
