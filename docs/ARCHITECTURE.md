# Architecture

Browser (React, Vite) → JSON API (Express). The browser never holds ClickUp, Google, Slack, OpenAI, Anthropic, or Otter tokens. Tokens, if Kulde adds them later, stay in the API environment on an Impact account.

## Modules

Each area under `backend/src/modules` has a route, a controller, and a service.

| Module | Route | Role |
| --- | --- | --- |
| auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | JWT in an httpOnly cookie. Middleware checks it on every protected route. 12-hour session |
| dashboard | `GET /api/dashboard` | Overview counts and lists |
| projects | `GET /api/projects`, `GET /api/projects/:id` | Workstreams |
| tasks | `GET /api/tasks` | Sample tasks, plus read-only ClickUp for staff |
| documents | `GET /api/documents`, `GET /api/documents/desk`, `POST /api/documents/files`, sharing | Drive library for staff: folders, empty Docs and Sheets, and sharing. Sample library until a token is set. File contents stay in Drive |
| follow-ups | `GET /api/follow-ups` | Open questions from the brief |
| milestones | `GET /api/milestones` | Placeholder IOC milestones |
| consultants | `GET /api/consultants` | Directory. Fees hidden outside staff roles |
| budgets | `GET /api/budgets` | Staff only. Fictional figures |
| calendar | `GET /api/calendar`, `GET /api/calendar/desk`, `POST /api/calendar/meetings`, invitations, availability, sharing | Schedule, invite, free/busy, and sharing for staff. Sample workspace until a token is set |
| slack | `GET /api/slack`, `GET /api/slack/desk`, `POST /api/slack/messages` | Read recent channel messages and post a daily update for staff. Sample until bot token and channel id are set |
| otter | `GET /api/otter/desk` | Transcripts, summaries, and action items for staff. Sample until an Enterprise API key is set. Notes stay closed until consent and sharing are confirmed |
| ai-tools | `GET /api/ai-tools` | Catalogue and empty agent list |
| assistant | `GET /api/assistant/desk`, `POST /api/assistant/runs` | ChatGPT drafts, research, analysis, brainstorming, and summaries for staff. Off until `OPENAI_API_KEY` is set. The note is not stored |
| claude | `GET /api/claude/desk`, `POST /api/claude/runs` | Claude long-form writing, document review, synthesis, and coding notes for staff. Off until `ANTHROPIC_API_KEY` is set. The source is not stored |
| automations | `GET /api/automations` | Known flows |
| integrations | `GET /api/integrations` | Adapter status and limits |
| system-map | `GET /api/system-map` | One-page map payload |
| audit | `GET /api/audit` | Staff only |
| proposal | `GET /api/proposal` | Access model, LibreChat, cost, assumptions |

CORS allows GET and POST. POST is sign-in, Google Calendar scheduling, the Drive library, Slack channel posts, ChatGPT runs, and Claude runs. ClickUp and Otter send GET only. Drive does not download file bytes. ChatGPT and Claude receive only the text in that request. Otter audio is not downloaded.

## When a token is missing

The service keeps the labelled sample and says so. The screen does not go blank, and it does not invent a live record.

## What this does not include

Company SSO, a database, LibreChat, a Make client, a Sheets client, writes to ClickUp or Instagram, and writes to Otter. Calendar scheduling, the Drive library, and Slack channel posts are the live writes. ChatGPT replies are live only after an OpenAI key is set. Claude replies are live only after an Anthropic key is set. File contents stay in Drive. Otter sharing stays in Otter. Slack edit/delete and multi-channel admin stay out of scope.
