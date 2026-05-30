# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

This is a Vercel project — there is no local dev server or build step. Deploy via:

```bash
npx vercel --prod
```

To test API routes locally:
```bash
npx vercel dev
```

## Architecture

**Single-page PWA** with no bundler, no framework — everything lives in `index.html` (HTML + CSS + JS all in one file, ~3000 lines). The app is RTL Hebrew, targeting mobile.

**Backend: Vercel Serverless Functions** (`/api/`)
- `api/ai.js` — proxy to Anthropic Claude API. Forwards POST body directly to `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY`. Used for meal photo analysis and product scanning.
- `api/subscribe.js` — manages Web Push subscriptions in Vercel KV. Actions: `get-public-key`, `subscribe`, `update`, `unsubscribe`. Keys stored as `sub:<profileId>`.
- `api/cron.js` — scheduled push notification sender. Reads all `sub:*` keys from KV, checks Israel time (`Asia/Jerusalem`), sends via `web-push` VAPID. Protected by `CRON_SECRET` Bearer token. Deduplication key: `sent:<profileId>:<time>:<date>` (TTL 24h).

**Service Worker** (`sw.js`) — caches `index.html` + `manifest.json` for offline use (cache name `dad-fit-v2`). Handles push events and notification clicks.

**Storage** — all user data is `localStorage` only (no user database). Each family member is a separate profile with a PIN. KV is only used for push subscriptions.

## Environment Variables

Required in Vercel:
- `ANTHROPIC_API_KEY` — for `api/ai.js`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — for push notifications (generate with `node generate-vapid.js`)
- `CRON_SECRET` — authorizes calls to `api/cron.js`
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — auto-set by Vercel KV addon

## Key Patterns in index.html

- **Tabs**: `showTab(name)` switches between `#tab-home`, `#tab-workout`, `#tab-food`, `#tab-mini`, `#tab-scan`, `#tab-stats`
- **Profiles**: multi-user via `localStorage`, PIN-protected, onboarding wizard (11 steps)
- **AI calls**: `fetch('/api/ai', { method:'POST', body: JSON.stringify({model, messages, ...}) })` — mirrors Anthropic API shape exactly
- **Push**: subscribe flow calls `/api/subscribe` with `action:'subscribe'`; cron trigger calls `/api/cron` with `Authorization: Bearer <CRON_SECRET>`
- **Theme**: `body.light-mode` class toggles light/dark via CSS variables on `:root`
