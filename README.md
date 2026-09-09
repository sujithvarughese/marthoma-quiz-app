# Church Quiz Night

A single-screen host console for a live in-person quiz night (host's laptop
mirrored to a projector). Six themed rounds plus a rapid-fire round, up to eight
teams, a running scoreboard, timers, a pass-for-half-points mechanic, and a
sudden-death tiebreaker. Game state (scores + which questions have been played)
is saved to a **Firestore backend** so the game survives a refresh, crash, or
closed tab.

## Getting started (local)

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase values (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app still runs without Firebase configured — it falls back to saving in the
browser's `localStorage` and the top-bar indicator shows **“Local only.”** To
get cross-device/cloud persistence, set up Firestore below.

## Editing questions

All content lives in plain data files — edit these and reload:

- `data/rounds.ts` — the 6 rounds, 10 questions each (all worth 10 points).
- `data/rapidFire.ts` — the mixed rapid-fire pool.
- `data/tiebreaker.ts` — sudden-death questions.

Only question **text** comes from these files. Which cards have been used and the
scoreboard are stored per-event in the backend, so editing questions never wipes
an in-progress game.

## Firestore backend setup

1. Create a Firebase project and enable **Firestore Database**.
2. **Project settings → Service accounts → Generate new private key.** This
   downloads a JSON file.
3. Copy `project_id`, `client_email`, and `private_key` from that JSON into your
   env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY`). See `.env.example` for the exact format — the private
   key keeps its `\n` escapes.
4. (Optional) `HOST_ACCESS_CODE` — if set, the host's browser must supply this
   code before the server will save, so random visitors can't overwrite the
   scoreboard. The app prompts for it when needed (top-bar “🔒 Enter code”).
5. (Optional) `QUIZ_GAME_ID` — the Firestore document id to save under
   (default `default`).

State is stored in the `quizGames` collection. Because writes go through the
server (Admin SDK), you can keep your Firestore security rules locked down —
clients never talk to Firestore directly.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add the same env vars under **Project → Settings → Environment Variables**
   (Production + Preview). For `FIREBASE_PRIVATE_KEY`, paste the value including
   the `\n` escapes exactly as in `.env.example`.
3. Deploy. The `/api/state` route runs as a Node serverless function and talks to
   Firestore; the game auto-loads on open and auto-saves as you play.

## How it works

- **Frontend:** a single client-side app (`components/QuizApp.tsx`) driven by a
  reducer store (`lib/store.tsx`). No routing — the host moves between screens
  via state.
- **Persistence:** the store loads from `/api/state` on start (falling back to
  the local cache), then debounces saves back to it as the game changes.
- **Backend:** `app/api/state/route.ts` (GET/PUT) → `lib/firestore.ts` (Admin
  SDK) → a single Firestore document.
