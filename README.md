# MinePulse Command — PS 24 governance MVP

A deployable Vite + React website with optional Supabase persistence. The frontend is live on both **Vercel** and **Render**; Supabase is not configured on the current public deployments.

## Live sites

- [Vercel production site](https://minepulse-command-mvp.vercel.app)
- [Render static site](https://minepulse-command.onrender.com)
- [Private GitHub source repository](https://github.com/officialrenaissancedas/minepulse-command-mvp)

Both hosts deploy from the `main` branch when changes are pushed. The current sites show **Local demo mode**: the only connected Supabase project is inactive, has not been restored, and has not received this app’s migration. Data entered on the sites does not sync between visitors or devices. Use demo/test data only; do not enter sensitive or real operational records. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) before enabling a Supabase backend.

## What works in this MVP

- A source-linked overview with CIL/SECL/NCL production through **26 Sep 2026** and provisional FY 2024–25 output for five mines; Sohagpur is marked **not reported** in the cited Top-35 table, not zero.
- Mine observation reporting with severity/category, optional browser geolocation, Supabase storage, and browser-local offline retry when connectivity returns.
- A database trigger that creates a linked **in-app queued report** and audit record for each saved observation.
- Private evidence uploads up to 10 MB when online.
- Working create/read/status-update/delete contractor and compliance registers with CSV export.
- Searchable report library and CSV export.
- Fixed-response copilot preview limited to explaining the public snapshot and product boundaries; no external LLM is connected.
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
- Public production values are dated snapshots, not live mine operations, safety, attendance, or compliance data; the app does not refresh them automatically.
- The editable financial/scalability scenario is local to the current browser, not synced to Supabase or connected to provider billing APIs.
- The copilot uses fixed local replies; no predictive model, live risk feed, or external AI service is connected. It is not safety advice.

See [DATA_SOURCES.md](DATA_SOURCES.md) for the complete provenance record; the overview also links directly to the two primary production sources.
