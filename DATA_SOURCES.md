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

## Public production snapshots shown on the overview

- **Current company/subsidiary snapshot**: [Ministry of Coal dashboard — Coal Production: Year (YTD)](https://apps.coalindia.in/ords/f?p=119:2:::::P2_SUB_CODE:CIL:), manually captured for **26 September 2026** (FY 2026–27 YTD). It reported CIL at **312.92 MT actual / 341.31 MT YTD target (91.68%)**, SECL at **75.14 / 81.94 MT (91.70%)**, and NCL at **56.70 / 67.52 MT (83.97%)**. These are company/subsidiary aggregates, not mine-level records.
- **Mine-wise annual output**: [Ministry of Coal — Monthly Statistics for Mar 2025 (PDF)](https://coal.nic.in/sites/default/files/2025-04/msg-march25.pdf), PDF page 11, **“Top 35 Mines Production during Mar’2025 (provisional)”**. The table reports FY 2024–25 cumulative output: Gevra OC **56.03 MT** (row 18), Dipka OC **33.52 MT** (row 20), Kusmunda OC **28.43 MT** (row 19), Jayant OC **29.99 MT** (row 9), and Nigahi OC **25.00 MT** (row 11). The published annual targets and achievement rates are shown in the same table. The source labels these figures provisional.
- **Sohagpur** has no site-specific row in that Top-35 table. The overview therefore says “Not reported” for this source; it does **not** treat the absence as zero production or substitute a broader area total.
- These values are **dated snapshots embedded in the app**, not a live API feed. Refresh the figures and source date from the primary pages before relying on newer reporting.

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
- The overview's production values above are attributed public snapshots with periods and source links. They do not indicate current mine health, safety, attendance, statutory compliance, or contractor status.
- Zero counts in observations, reports, contractors, and compliance registers mean **no user-entered workspace records exist yet**; public corporate or mine data is not substituted for those private operational records.
- The application does not automatically fetch live mine performance, DGMS updates, contractor records, or Ministry data from an API.
- New observations, report queue items, contractor records, and compliance checks are entered by the user. Their persistence depends on the Supabase setup described in `DEPLOYMENT_GUIDE.md`; if the app says browser-only mode, those records remain in that browser.
- Cost/scalability figures come solely from the user-editable scenario inputs in the planner. Starting values are illustrative, not vendor quotes, approved budgets, or verified savings.
- The Copilot uses fixed local reply templates only; it does not assess live mine risks, produce trained AI/ML predictions, or call an external AI service.

**Use note:** These references are for a hackathon/prototype demonstration. They are not legal advice, a certified compliance register, an official notification, or proof of current mine conditions. Verify the current regulations and source documents before using them for operational, legal, safety, or financial decisions.
