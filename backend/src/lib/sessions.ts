const activeSessionIds = new Set<string>();

export function rememberSession(sessionId: string) {
  activeSessionIds.add(sessionId);
}

export function revokeSession(sessionId: string) {
  activeSessionIds.delete(sessionId);
}

export function sessionIsActive(sessionId: string) {
  return activeSessionIds.has(sessionId);
}
