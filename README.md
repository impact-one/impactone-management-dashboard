# Impact Management Dashboard

Pilot prototype for Impact One and IOC. It is a management desk: projects, tasks, deadlines, documents, follow-ups, IOC consultants and budget layout, and a map of the tools and automations already named in the brief.

Google Calendar schedules meetings, invitations, availability, and shared calendars. Google Drive keeps the library: folders, empty Docs and Sheets, and sharing. Slack reads and posts in one configured channel. Otter.ai supplies meeting transcripts, summaries, and action items when an Enterprise key is set. ClickUp stays read-only. It does not post to Make or Instagram. File contents stay in Drive. Otter audio stays in Otter.

## Run locally

```bash
npm install
npm run dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:4000

Optional environment file: copy `backend/.env.example` to `backend/.env` only if you have an Impact token. With no tokens, every external source stays on labelled sample data.

```bash
npm test
npm run typecheck
```

## Demo sign-in

Local accounts only. Not company SSO. The session is an httpOnly cookie, not a token in browser storage. Do not deploy this password.

Password for every account: `Pilot-2026!`

| Name | Email | Role |
| --- | --- | --- |
| Mikolaj | mikolaj@impactone.example | Executive |
| Kulde | kulde@impactone.example | Manager |
| Zygm | zygm@impactone.example | Manager |
| Saray | saray@impactone.example | Manager |
| Pilot consultant | consultant@impactone.example | Consultant, King Salman Park Hills only |
| Tetia | tetia@impactone.example | Viewer, no budget and no audit |

## Layout

```
backend/src/modules/<area>/
  <area>.routes.ts
  <area>.controller.ts
  <area>.service.ts
frontend/src/pages/
docs/
```

Modules: auth, dashboard, projects, tasks, documents, follow-ups, milestones, consultants, budgets, calendar, otter, slack, ai-tools, automations, integrations, system-map, audit, proposal.

## Data labels

- **Live** — connected to ClickUp, Calendar, Drive, Slack, or Otter during this session.
- **Sample** — fictional or placeholder, safe to show without the real file.
- **Documented** — stated in the pilot brief.
- **Needs review** — unknown. Not guessed.

## Documents

- [Handover](docs/HANDOVER.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Access and security](docs/ACCESS-AND-SECURITY.md)
- [System map](docs/SYSTEM-MAP.md)
- [Slack setup](docs/SLACK-INTEGRATION.md)
- [Otter setup](docs/OTTER-INTEGRATION.md)
- [Cost estimate](docs/COST-ESTIMATE.md)
