const activeSessionIds = new Set<string>();
const revokedSessionIds = new Set<string>();

export function rememberSession(sessionId: string) {
  activeSessionIds.add(sessionId);
}

export function revokeSession(sessionId: string) {
  activeSessionIds.delete(sessionId);
  revokedSessionIds.add(sessionId);
}

/**
 * A process restart empties the in-memory registry. A signed, unexpired token
 * is still the same session, so accept it again. Logout stays rejected until restart.
 */
export function acceptPresentedSession(sessionId: string) {
  if (revokedSessionIds.has(sessionId)) return false;
  activeSessionIds.add(sessionId);
  return true;
}
