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

## Docker

One container serves the built web app and the API on port 4000. `backend/.env` is read at run time and is not copied into the image.

```bash
docker compose build
docker compose up
```

Open http://localhost:4000. Sign-in needs HTTPS on a public host, because the session cookie is `Secure` and uses the `__Host-` prefix. `http://localhost` is treated as a secure origin, so the local container still accepts the cookie.

On a host, set `JWT_SECRET` to a long random string and set `NODE_ENV=production`. Leave integration keys blank to keep sample data. Copy only the keys you already use in `backend/.env`. Do not commit that file.

A free web service that builds this Dockerfile and gives you HTTPS is enough. Render is the shortest path: New Web Service, connect the repo, runtime Docker, free instance. Set the env vars in the dashboard, then open the `https://…onrender.com` URL. The free instance sleeps after about 15 minutes with no visits, and the in-memory audit log resets when the process starts again. Google Cloud Run is the other free container option if you already have a billing account; it scales to zero the same way.

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

Modules: auth, dashboard, projects, tasks, documents, follow-ups, milestones, consultants, budgets, calendar, otter, slack, assistant, claude, ai-tools, automations, integrations, system-map, audit, proposal.

ChatGPT drafts, research, analysis, brainstorming, and summaries run from **Assistant** once `OPENAI_API_KEY` is set in `backend/.env`. See [ChatGPT setup](docs/CHATGPT-INTEGRATION.md).

Claude writes, reviews, and synthesizes a long document from **Claude** once `ANTHROPIC_API_KEY` is set. See [Claude setup](docs/CLAUDE-INTEGRATION.md).

Otter.ai supplies meeting transcripts, summaries, and action items once `OTTER_API_KEY` is set. See [Otter setup](docs/OTTER-INTEGRATION.md).

## Data labels

- **Live** — connected to ClickUp, Calendar, Drive, Slack, ChatGPT, Claude, or Otter during this session.
- **Sample** — fictional or placeholder, safe to show without the real file.
- **Documented** — stated in the pilot brief.
- **Needs review** — unknown. Not guessed.

## Documents

- [Handover](docs/HANDOVER.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Access and security](docs/ACCESS-AND-SECURITY.md)
- [System map](docs/SYSTEM-MAP.md)
- [Slack setup](docs/SLACK-INTEGRATION.md)
- [ChatGPT setup](docs/CHATGPT-INTEGRATION.md)
- [Claude setup](docs/CLAUDE-INTEGRATION.md)
- [Otter setup](docs/OTTER-INTEGRATION.md)
- [Cost estimate](docs/COST-ESTIMATE.md)
