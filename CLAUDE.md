# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## פקודות עבודה

| פעולה | פקודה |
|-------|--------|
| Deploy לייצור | `npx vercel --prod` |
| הרצה מקומית (כולל API) | `npx vercel dev` |
| יצירת VAPID keys חדשים | `node generate-vapid.js` |

---

## ארכיטקטורה

### Frontend
- **קובץ יחיד:** `index.html` — HTML + CSS + JS ביחד (~3000 שורות), ללא bundler או framework
- **שפה:** עברית, RTL, ממוקד מובייל
- **PWA:** `manifest.json` + `sw.js` לתמיכה ב-offline ו-push notifications

### Backend — Vercel Serverless Functions (`/api/`)

| קובץ | תפקיד |
|------|--------|
| `api/ai.js` | פרוקסי ל-Anthropic API — מעביר את ה-body ישירות ל-`/v1/messages` |
| `api/subscribe.js` | ניהול Web Push subscriptions ב-Vercel KV (actions: `get-public-key`, `subscribe`, `update`, `unsubscribe`) |
| `api/cron.js` | שליחת push notifications לפי לוח זמנים — בודק שעה ישראלית (`Asia/Jerusalem`), מונע כפילויות עם key `sent:<profileId>:<time>:<date>` (TTL 24h) |

### אחסון
- **נתוני משתמשים:** `localStorage` בלבד — אין DB
- **Push subscriptions:** Vercel KV, מפתח `sub:<profileId>`

---

## משתני סביבה (Vercel)

| משתנה | שימוש |
|-------|--------|
| `ANTHROPIC_API_KEY` | `api/ai.js` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | push notifications |
| `CRON_SECRET` | הגנה על `api/cron.js` (Bearer token) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | מוגדר אוטומטית ע"י Vercel KV addon |

---

## דפוסים מרכזיים ב-index.html

| נושא | פרטים |
|------|--------|
| **טאבים** | `showTab(name)` — `home`, `workout`, `food`, `mini`, `scan`, `stats` |
| **פרופילים** | multi-user ב-localStorage, PIN-protected, onboarding wizard של 11 שלבים |
| **קריאות AI** | `fetch('/api/ai', { method:'POST', body: JSON.stringify({model, messages, ...}) })` |
| **Push** | subscribe קורא ל-`/api/subscribe`, cron קורא ל-`/api/cron` עם `Authorization: Bearer <CRON_SECRET>` |
| **תמה** | `body.light-mode` class — toggles CSS variables מוגדרים ב-`:root` |
