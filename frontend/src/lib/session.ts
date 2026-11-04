const SESSION_KEY = "impact_session";

export function readSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
}

export function writeSessionToken(token: string, persist = false) {
  if (persist) {
    localStorage.setItem(SESSION_KEY, token);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, token);
  localStorage.removeItem(SESSION_KEY);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}
