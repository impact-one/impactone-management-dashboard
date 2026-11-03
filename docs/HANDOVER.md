# Handover — Impact Management Dashboard pilot

For Mikolaj's end-of-pilot review. This is a working prototype, not a production system. Further build waits on that review.

## What works

- Sign-in with role-based screens: executive, manager, consultant, viewer.
- Overview of projects, deadlines, follow-ups, and meetings.
- Project pages for Impact One operations, King Salman Park Hills, social intake, and the AI overview.
- Tasks, calendar, documents, follow-ups, and Slack channel updates.
- IOC screen: consultant directory, sample budget, milestones.
- AI tools list, with an empty agents list where the brief names none.
- System map of tools, the Instagram → Make → Slack flow, and data sources.
- Integrations page. Calendar schedules meetings when a token is set. Drive keeps the library when a token is set. Slack reads and posts in one configured channel when a bot token is set. ClickUp stays read-only. Make, Instagram, and Sheets have no client.
- Audit trail of authenticated reads, in memory.
- Pilot notes: access model, architecture, LibreChat evaluation, cost, assumptions, risks.
- Layout usable with a phone-width viewport (bottom navigation and stacked tables).

## What is sample or still open

| Area | State |
| --- | --- |
| ClickUp tasks | Sample until `CLICKUP_API_TOKEN` and `CLICKUP_TEAM_ID` are set on an Impact account |
| Google Calendar | Labelled workspace in Asia/Riyadh until a Calendar token is set. Then scheduling, invitations, free/busy, and sharing go to Google |
| Google Drive | Labelled library until a Drive token is set. Then folders, empty Docs and Sheets, and sharing go to Google. File contents stay in Drive |
| Slack channel | Sample until `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are set. Then staff can read recent messages and post a daily update. Invite the bot to the channel first |
| IOC budget | Fictional SAR figures. The finance sheet is not connected |
| King Salman Park Hills dates and consultant fees | Placeholders. Not Saray's plan |
| ChatGPT assistant | Built for drafts, research, analysis, brainstorming, and summaries. Live replies wait on `OPENAI_API_KEY`. Review outputs and do not paste confidential information |
| AI purposes for Claude, Cursor, Plaud | Needs review. Zygm's overview was in preparation from 26 October 2026 |
| Agents | None named. The list is empty on purpose |
| Otter → ClickUp | Not drawn as a live automation |
| HTML master dashboard | Described, not embedded. URL was not provided |
| LibreChat | Evaluated. Not installed |
| Sign-in | Local demo accounts. Not company SSO |
| Audit log | Lost when the API restarts |

Live ClickUp, Calendar, Drive, and Slack results are shown only to executive and manager roles, because those APIs are team-wide.

## Demo path

1. Sign in as Mikolaj (`mikolaj@impactone.example` / `Pilot-2026!`).
2. Overview, then System map, then AI tools.
3. Open IOC and point at the sample budget warning.
4. Open Integrations and Audit.
5. Sign out. Sign in as the pilot consultant. King Salman Park Hills remains. Budget, fees, and audit do not.

## Assumptions that need a yes

- The four work areas in the brief are the right first cut.
- Sample budget figures are acceptable until finance approves a snapshot.
- The role split is acceptable until Kulde confirms real access.
- LibreChat stays off until the AI overview exists.
- No further build until Mikolaj reviews this prototype.

## Next stage, after approval

Indicative only, not a quotation. Detail is in [COST-ESTIMATE.md](COST-ESTIMATE.md).

- Company sign-in and a stored audit log.
- Turn on ClickUp reads, live Calendar scheduling, and Slack channel updates once tokens exist.
- Budget only with finance approval.
- Replace the AI catalogue with Zygm's overview, then decide on LibreChat.
- About 4–6 weeks part time, or 2–3 focused weeks, to make it an operational desk. Depends on the review.

## Daily Slack update

From the Slack screen, staff post a short note in the configured channel: what was finished, what is blocked on access, and the question for the next day. Do not paste tokens or budget figures. Recent channel messages are listed on the same screen.

Short setup note: [Slack setup](SLACK-INTEGRATION.md).

## ChatGPT

From the Assistant screen, executive and manager roles can draft, research, analyze, brainstorm, or summarize a note they type. Review the reply before sharing it. Do not paste tokens, fees, or live budget figures. The desk does not store the note or the reply, and it does not attach other systems. Live replies wait on `OPENAI_API_KEY`.

Short setup note: [ChatGPT setup](CHATGPT-INTEGRATION.md).
