# MinePulse Command — source and data-provenance notes

This file is deliberately separate from the website interface, as requested. It records the primary documents consulted for the problem context, mining regulations, sustainability references, and deployment guidance.

## User-provided problem definition

- **Smart Governance in Coal Mines (SIH PS 24)** — the uploaded brief in `pasted_content.txt` describes statutory compliance, inspections, observations, contractor management, operational reporting, geo-tagged field reporting, and a scalable governance platform. This is the product requirement, not a source of measured operating data.

## Primary coal-mining and governance references

- **Coal India Limited — FY 2024–25 Business Responsibility and Sustainability Report (BRSR)**: [official PDF](https://www.coalindia.in/documents/12465/Coal_India_BRSR_31.07.2025.pdf). Used for sustainability and company-level context. A corporate BRSR is not mine-by-mine live telemetry.
- **Ministry of Coal — Annual Report 2024–25**: [official PDF](https://coal.gov.in/sites/default/files/2025-02/chap20AnnualReport2025en2.pdf). Used for ministry/sector context.
- **Ministry of Coal — Annual Report 2023–24**: [official PDF](https://coal.gov.in/sites/default/files/2024-07/chap20AnnualReport2024en2.pdf). Used for background context only.
- **Ministry of Coal — Safety in Coal Mines**: [official statistics and safety page](https://coal.gov.in/major-statistics/safety-coal-mines). Use the ministry’s latest publication for current national statistics.
- **Directorate General of Mines Safety (DGMS) — Coal Mines Regulations, 1957**: [official PDF](https://www.dgms.gov.in/writereaddata/UploadFile/Coal_Mines_Regulation_1957.pdf). Regulatory reference; verify amendments and the latest legal status before relying on it.
- **DGMS / Government of India — Mines Act, 1952**: [official PDF](https://www.dgms.gov.in/writereaddata/UploadFile/MinesAct195216032022.pdf). Historical statutory text; verify subsequent legislation and amendments before operational use.
- **DGMS — Annual Report 2024–25 / 2025**: [official PDF](https://www.dgms.gov.in/writereaddata/UploadFile/DGMSATAGLANCE2025_17042025.pdf). Used for regulator and sector context, not real-time mine status.
- **Coal India — official performance reports**: [physical performance](https://www.coalindia.in/performance/physical/) and [annual reports](https://www.coalindia.in/investors/annual-reports/). Use for reported company-level output, not as a substitute for each mine’s operational system.

## Deployment and backend references

- [Vercel: Vite framework deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel: routing rewrites](https://vercel.com/docs/routing/rewrites)
- [Vite: build output configuration](https://vite.dev/config/build-options)
- [Render: static sites](https://render.com/docs/static-sites)
- [Render: static-site redirects and rewrites](https://render.com/docs/redirects-rewrites)
- [Supabase: React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase: database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

## What is and is not sourced in the app

- The **mine names and locations** are used as a central-India demo/reference context. They are not a connection to live company systems.
- The map scores, trend lines, example risk/activity cards, staffing and operating figures are **illustrative placeholders**, not claims about current conditions at any named mine.
- The application does not fetch live mine performance, DGMS updates, contractor records, or Ministry data from an API.
- New observations, report queue items, contractor records, and compliance checks are entered by the user. Their persistence depends on the Supabase setup described in `DEPLOYMENT_GUIDE.md`; if the app says browser-only mode, those records remain in that browser.
- Cost/scalability figures come solely from the user-editable scenario inputs in the planner. Starting values are illustrative, not vendor quotes, approved budgets, or verified savings.
- The risk queue uses simple severity labels and deterministic ordering; the copilot uses fixed local reply templates. Neither is a trained AI/ML prediction, and no external AI service is called.

**Use note:** These references are for a hackathon/prototype demonstration. They are not legal advice, a certified compliance register, an official notification, or proof of current mine conditions. Verify the current regulations and source documents before using them for operational, legal, safety, or financial decisions.
