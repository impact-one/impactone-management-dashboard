# Access and security

## Rules this prototype follows

- Code and future credentials stay in Impact accounts. Nothing here is wired to a personal Slack, ClickUp, or Google account.
- Make, Instagram, and Google Sheets have no client, so a token for them cannot be used by this app.
- The ClickUp client sends GET only, with an 8-second timeout.
- Google Calendar can schedule meetings, update invitations, read free/busy, and set sharing. It cannot grant the owner role.
- Google Drive can create a folder, an empty Doc, or an empty Sheet, and set sharing as writer, commenter, or reader. It does not download file contents or grant owner.
- Slack can read recent messages and post as the bot in one configured channel. It does not edit or delete messages, and it does not join other channels from this desk.
- Otter can read recent conversations, transcripts, summaries, action items, and sharing. It does not change sharing, download audio, or import recordings. Notes stay hidden until the signed-in staff member confirms consent and the sharing list.
- Confidential budget figures are not copied from the finance sheet. The screen uses a fictional sample and says so.
- Live team-wide exports (ClickUp, Calendar, Drive, Slack, Otter) return only to executive and manager roles.
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
| Google Calendar | Calendar events, free/busy, and ACL | Schedule, invite, check availability, and set sharing. Do not grant a token that can transfer ownership |
| Google Drive | `https://www.googleapis.com/auth/drive` | Create empty Docs, Sheets, and folders, and set sharing. File contents stay in Drive. Do not grant a token that can transfer ownership |
| Slack | Bot token with `channels:history`, `channels:read`, `chat:write` | Read and post in one agreed channel. Invite the app to that channel. See [Slack setup](SLACK-INTEGRATION.md) |
| Otter.ai | Enterprise API key from Integrations → Developer | Read transcripts, summaries, and action items. Confirm consent and sharing. See [Otter setup](OTTER-INTEGRATION.md) |
| IOC budget sheet | None until finance agrees | A snapshot or a read-only share. Not a token with edit rights |

Access should be removed at the end of the pilot if it was granted only for this week.

## Known limits

- The audit trail is in memory and disappears on restart.
- Demo accounts share one password and are not SSO.
- A Google token used here can create and update calendar events, and can create empty Drive files and change their sharing. Keep it on an Impact account. Sharing from this desk cannot grant owner. File contents are not downloaded.
- Task titles from a live ClickUp read can be sensitive. That is why viewers and consultants do not receive them.
- This repository must not be pushed to a personal Git host. Use the Impact company repository when one is provided.
