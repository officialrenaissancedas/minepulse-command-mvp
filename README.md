# MinePulse Command — PS 24 governance MVP

A deployable Vite + React website backed by Supabase. Deploy the frontend to **Vercel or Render** (or both); Supabase provides Auth, Postgres, private evidence storage, row-level security, and realtime updates.

## What works in this MVP

- Mine observation reporting with severity/category, optional browser geolocation, Supabase storage, and browser-local offline retry when connectivity returns.
- A database trigger that creates a linked **in-app queued report** and audit record for each saved observation.
- Private evidence uploads up to 10 MB when online.
- Working create/read/status-update/delete contractor and compliance registers with CSV export.
- Searchable report library and CSV export.
- Deterministic severity-based review queue and fixed-response copilot demo; no external LLM is connected.
- Editable cost/value scenario and year-by-year scale forecast; assumptions save in the current browser and can be exported.
- Browser-only demo mode if Supabase has not been configured.

## Quick start

1. Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for first-time setup on GitHub, Supabase, Vercel, and Render.
2. Run `supabase/migrations/20260928000000_minepulse.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`; enter `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Install Node.js 22 and pnpm 10; run `pnpm install --frozen-lockfile`, then `pnpm dev`.
5. Build/test using `pnpm check`, `pnpm test`, and `pnpm build`. The static site is generated at `dist/public`.

## Important limits

- The app does not send email/SMS/WhatsApp or submit official forms.
- Guest (anonymous) Supabase accounts are browser-bound; the MVP does not yet include named users, organizational roles, or shared mine membership.
- Overview/map scores and selected activity cards are demo values, not live mine data.
- The editable financial/scalability scenario is local to the current browser, not synced to Supabase or connected to provider billing APIs.
- The rule-based risk queue is not predictive AI, and the copilot uses fixed local replies. Neither is certified safety advice.

See [DATA_SOURCES.md](DATA_SOURCES.md) for public-sector and company reference links; sources are intentionally not displayed in the website interface.
