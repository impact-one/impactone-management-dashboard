# Access and security

## Rules this prototype follows

- Code and future credentials stay in Impact accounts. Nothing here is wired to a personal Slack, ClickUp, or Google account.
- No route creates, edits, posts, or deletes in a live tool.
- Slack, Make, Instagram, and Google Sheets have no client, so a token for them cannot be used by this app.
- ClickUp, Calendar, and Drive clients send GET only, with an 8-second timeout.
- Confidential budget figures are not copied from the finance sheet. The screen uses a fictional sample and says so.
- Live team-wide exports (ClickUp, Calendar, Drive) return only to executive and manager roles.
- Consultant fees are hidden from consultant and viewer roles.
- The audit log stores actor, role, method, path, and status. It does not store bodies, passwords, or tokens.
- Sign-in failures use the same error for an unknown email and a wrong password.
- Sign-in is rate-limited per IP.
- The session is a JWT in a cookie named `__Host-impact_session`: HttpOnly, Secure, SameSite=Lax, Path=/. The page script cannot read it. Sign-out revokes the session id and clears that cookie, so the old value cannot be reused.
- Protected routes use JWT middleware. A Bearer token is accepted only for non-browser clients such as curl. The web app does not send one.
- `JWT_SECRET` is required when `NODE_ENV=production`. The development fallback must not be deployed.
- Demo passwords are documented for the local pilot only.

## Access to request from Kulde

| Need | Scope | Why |
| --- | --- | --- |
| ClickUp | Read tasks on the relevant team | Replace sample tasks. Team id plus a read token |
| Google Calendar | `calendar.readonly` | List events. Do not grant write |
| Google Drive | `drive.readonly` metadata | Names and links. Contents are not required for the pilot |
| IOC budget sheet | None until finance agrees | A snapshot or a read-only share. Not a token with edit rights |

Access should be removed at the end of the pilot if it was granted only for this week.

## Known limits

- The audit trail is in memory and disappears on restart.
- Demo accounts share one password and are not SSO.
- A Google token that was issued with extra scopes is still unable to write through this API, but it should not be issued that way.
- Task titles from a live ClickUp read can be sensitive. That is why viewers and consultants do not receive them.
- This repository must not be pushed to a personal Git host. Use the Impact company repository when one is provided.
