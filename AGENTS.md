# Working in this repo (Base44 sandbox notes)

## What runs
Single Vite + React + TypeScript + Three.js **client**. There is no backend
process, no database, and no API server. `npm run dev` (Vite on port 3000,
`--host=0.0.0.0`) is the whole app.

## Run / verify
```bash
docker compose -f docker-compose.base44.yml up -d
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/   # expect 200
```
- `node_modules` lives in the `web_node_modules` named volume; the startup
  command runs `npm ci` before `npm run dev`, so dependency changes only need a
  `docker compose ... restart web` (no image rebuild).
- Healthy page = `index.html` containing `/@vite/client` and `/src/main.tsx`
  (live source). A hashed prebuilt bundle means the dev-server wiring is broken.
- Type check (the repo's only lint step): `docker compose -f docker-compose.base44.yml exec -T web npx tsc --noEmit`.

## Non-obvious app behavior
- The app boots **straight into gameplay** — no router, no login gate. The
  splash screen starts the game on any click or keypress. `src/pages/*.jsx`
  (Login/Register/OAuthConsent) are leftovers and are not reachable from the UI.
- Firebase is **optional**: `src/firebase/config.ts` falls back to
  `localStorage` when cloud sync is unavailable, and the telemetry log shows
  "Local storage mode active." The committed Firebase `apiKey` is a redacted
  placeholder (`******`), so the sandbox normally runs in local-storage mode.
  Cloud saves / leaderboards / Google sign-in need a real Firebase web config
  (`VITE_FIREBASE_*`, see `.env.example`) — never required to boot.
- `@google/genai` is a dependency and `metadata.json` mentions a server-side
  Gemini capability, but nothing in `src/` calls Gemini, so `GEMINI_API_KEY` is
  unnecessary here.
- `vite.config.ts` disables HMR + file watching when `DISABLE_HMR=true`. Do not
  set it in the sandbox compose, or edits stop hot-reloading.
- The preview proxy host is allowed via the bare
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` env var (Vite >= 6.1), so no Vite
  config change is needed in the sandbox.
