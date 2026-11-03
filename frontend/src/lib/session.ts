const SESSION_KEY = "impact_session";

export function readSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function writeSessionToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
}
