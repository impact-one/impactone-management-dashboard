# Slack setup

Connect one Slack channel to this dashboard so staff can read recent messages and post a short update.

## What you need

- Impact Slack workspace access  
- One public channel  
- Two values in `backend/.env` only (never share in chat):

```bash
SLACK_BOT_TOKEN=xoxb-…
SLACK_CHANNEL_ID=C…
```

## Setup (once)

1. Open https://api.slack.com/apps and sign in to the Impact workspace.  
2. **Create an App** → **Blank app** → name it (e.g. Impact Dashboard) → pick the workspace.  
3. Add bot scopes: `channels:history`, `channels:read`, `chat:write`, `files:read`. `files:read` lets the desk show image and document previews. File names still appear without it.  
4. **Create and Install** → Allow. Ignore any Slack CLI / `slack run` screens.  
5. **OAuth & Permissions** → copy **Bot User OAuth Token** (`xoxb-…`) into `.env`.  
6. Open the channel in Slack. From the browser URL, copy the id that starts with `C` into `.env`.  
7. In the channel type: `/invite @Impact Dashboard` (use your app name).  
8. Restart the API. Sign in as executive/manager → open **Slack** → status should say **Live**.

## Daily use

1. Sign in as executive or manager.  
2. Open **Slack**.  
3. Write a short update → **Post to Slack**.  
4. Check the channel in Slack. New channel messages show on the desk after refresh or about 10 seconds.
5. Use **Search messages** on the desk to find a recent update by text, author, or file name.

Do not paste tokens or budget figures into messages.

## If it fails

| Problem | Fix |
| --- | --- |
| Still shows Sample | Check both `.env` values and restart API |
| `invalid_auth` | Reinstall the app and copy a fresh `xoxb` token |
| `channel_not_found` | Fix the `C…` id; invite the app to the channel |
| Cannot see Live Slack | Use an executive/manager account |

## Limits

One channel only. No edit/delete from the desk. Consultants and viewers do not see live channel traffic.
