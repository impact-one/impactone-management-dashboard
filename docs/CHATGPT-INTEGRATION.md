# ChatGPT setup

Connect ChatGPT so staff can draft, research, analyze, brainstorm, and summarize from the Assistant screen.

Best fit: writing, analysis, and summaries.

Review every output. Do not paste tokens, passwords, fees, live budget figures, or client documents.

## What you need

- An OpenAI **API** key for an Impact account (platform.openai.com). A ChatGPT Plus login is not an API key.
- Billing enabled on that OpenAI account.
- One value in `backend/.env` only (never share the key in chat):

```bash
OPENAI_API_KEY=sk-…
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_MODEL` is optional. `gpt-4o-mini` is the default.

## Setup (once)

1. Sign in to https://platform.openai.com with the Impact OpenAI account.
2. Confirm billing is active.
3. Create an API key and copy it into `OPENAI_API_KEY`.
4. Restart the API.
5. Sign in as an executive or manager and open **Assistant**. Status should say the assistant can run.
6. Integrations should show ChatGPT as **Live**.

## Daily use

1. Sign in as an executive or manager.
2. Open **Assistant**.
3. Choose Draft, Research, Analyze, Brainstorm, or Summarize.
4. Paste only the notes you are allowed to send.
5. Confirm you will review the output.
6. Read the reply before sharing it. Copy it out if you want to keep it. This desk does not store the note or the reply.

The desk does not attach ClickUp, Drive, Calendar, Slack, or the budget. It does not post or change those systems.

## If it fails

| Problem | Fix |
| --- | --- |
| Still shows Off | Add `OPENAI_API_KEY` and restart the API |
| Key rejected | Create a new key on the Impact OpenAI account |
| Model not confirmed | Set `OPENAI_MODEL` to a model that account can use, then restart |
| Rate limit or billing | Check the OpenAI billing page and try again later |
| Secret was blocked | Remove tokens, passwords, and `.env` lines from the note |

## Limits

Executive and manager roles only. Consultants and viewers can open the screen and cannot run a workflow. Notes are limited to 6000 characters. Replies are not saved.
