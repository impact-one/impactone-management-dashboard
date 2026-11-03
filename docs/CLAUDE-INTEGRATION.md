# Claude setup

Connect Claude so staff can work with a long document: write, review, synthesize, or support a coding note.

Best fit: long-form writing and document review.

Validate important facts and generated outputs. Do not paste tokens, passwords, fees, live budget figures, or client files you are not allowed to send.

## What you need

- An Anthropic **API** key for an Impact account (platform.claude.com). A Claude.ai login is not an API key.
- Billing enabled on that Anthropic account.
- One value in `backend/.env` only (never share the key in chat):

```bash
ANTHROPIC_API_KEY=sk-ant-…
ANTHROPIC_MODEL=claude-sonnet-5-5
```

`ANTHROPIC_MODEL` is optional. `claude-sonnet-5-5` is the default.

## Setup (once)

1. Sign in to https://platform.claude.com with the Impact Anthropic account.
2. Confirm billing is active.
3. Create an API key and copy it into `ANTHROPIC_API_KEY`.
4. Restart the API.
5. Sign in as an executive or manager and open **Claude**. Status should say Claude can run.
6. Integrations should show Claude as **Live**.

## Daily use

1. Sign in as an executive or manager.
2. Open **Claude**.
3. Choose Write, Review, Synthesize, or Code.
4. Paste only the source you are allowed to send. The box holds up to 80,000 characters.
5. Confirm you will check important facts.
6. Read the reply before sharing it. Claims marked `[check this]` still need a source. This desk does not store the source or the reply.

The desk does not open Drive, ClickUp, Calendar, Slack, or the budget. It does not post or change those systems.

## If it fails

| Problem | Fix |
| --- | --- |
| Still shows Off | Add `ANTHROPIC_API_KEY` and restart the API |
| Key rejected | Create a new key on the Impact Anthropic account |
| Model not listed | Set `ANTHROPIC_MODEL` to a model that account can use, then restart |
| Rate limit or billing | Check the Anthropic billing page and try again later |
| Secret was blocked | Remove tokens, passwords, and `.env` lines from the source |

## Limits

Executive and manager roles only. Consultants and viewers can open the screen and cannot run a workflow. Sources are limited to 80,000 characters. Replies are not saved.
