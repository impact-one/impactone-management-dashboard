# Architecture

Browser (React, Vite) → JSON API (Express). The browser never holds ClickUp or Google tokens. Tokens, if Kulde adds them later, stay in the API environment on an Impact account.

## Modules

Each area under `backend/src/modules` has a route, a controller, and a service.

| Module | Route | Role |
| --- | --- | --- |
| auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | JWT in an httpOnly cookie. Middleware checks it on every protected route. 12-hour session |
| dashboard | `GET /api/dashboard` | Overview counts and lists |
| projects | `GET /api/projects`, `GET /api/projects/:id` | Workstreams |
| tasks | `GET /api/tasks` | Sample tasks, plus read-only ClickUp for staff |
| documents | `GET /api/documents` | Known files, plus Drive metadata for staff |
| follow-ups | `GET /api/follow-ups` | Open questions from the brief |
| milestones | `GET /api/milestones` | Placeholder IOC milestones |
| consultants | `GET /api/consultants` | Directory. Fees hidden outside staff roles |
| budgets | `GET /api/budgets` | Staff only. Fictional figures |
| calendar | `GET /api/calendar` | Sample meetings, plus read-only Calendar for staff |
| ai-tools | `GET /api/ai-tools` | Catalogue and empty agent list |
| automations | `GET /api/automations` | Known flows |
| integrations | `GET /api/integrations` | Adapter status and limits |
| system-map | `GET /api/system-map` | One-page map payload |
| audit | `GET /api/audit` | Staff only |
| proposal | `GET /api/proposal` | Access model, LibreChat, cost, assumptions |

CORS allows GET and POST only. POST is sign-in. External clients hard-code HTTP GET.

## When a token is missing

The service keeps the labelled sample and says so. The screen does not go blank, and it does not invent a live record.

## What this does not include

Company SSO, a database, LibreChat, a Slack or Make client, a Sheets client, and any write to a live tool.
