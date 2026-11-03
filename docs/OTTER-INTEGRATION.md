# Otter.ai setup

Connect an Otter Enterprise workspace so executive and manager roles can read meeting transcripts, summaries, and action items.

## What you need

- An Otter Enterprise workspace. The public API is not on other plans.
- One API key in `backend/.env` only:

```bash
OTTER_API_KEY=
```

## Setup (once)

1. In Otter, open **Integrations → Developer**.
2. **Create key**, copy it once, and put it in `backend/.env`.
3. Restart the API.
4. Sign in as an executive or manager and open **Meetings**. Status should say **Live** once the workspace answers.

Before anyone relies on a transcript, confirm three things on that screen:

- Participants were told the meeting would be transcribed.
- The key belongs to the Impact workspace, not a personal Otter account.
- The people and channels Otter lists are the audience that should see the notes. This desk does not change that sharing.

## Daily use

1. Sign in as an executive or manager.
2. Open **Meetings**.
3. Pick a conversation and review **Sharing**.
4. Tick the three confirmations, then **Open notes**.
5. Search titles, summaries, transcripts, and action items from the search box.

Audio stays in Otter. Action items are not copied into ClickUp.

## If it fails

| Problem | Fix |
| --- | --- |
| Still shows Sample | Add `OTTER_API_KEY` and restart the API |
| Key rejected | Create a new Enterprise key under Integrations → Developer |
| Empty for a consultant or viewer | Use an executive or manager account |
| A meeting is missing | In Otter, share it to the workspace or channel before it finishes, if you also use webhooks later |

## Limits

Read only. Eight recent conversations, including ones shared with the key’s user. Long transcripts are shortened on this desk; the full text stays in Otter. Consultants and viewers do not see the notes.
