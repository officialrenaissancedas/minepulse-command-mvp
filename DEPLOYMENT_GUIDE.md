# MinePulse Command — baby-step deployment guide

This guide assumes you have never deployed an app before. Follow the order below: **GitHub → Supabase → choose Vercel or Render → test**. Supabase is the database/login/file-storage backend; Vercel and Render are alternative places to host the website. You may deploy the website to both, but most teams only need one.

## Before you start

You need accounts at [GitHub](https://github.com), [Supabase](https://supabase.com), and **one** of [Vercel](https://vercel.com) or [Render](https://render.com). The setup uses your browser and GitHub Desktop; you do not need to type terminal commands to deploy.

> **Cost warning:** prices and free-plan limits change. Check the current provider pricing and your organization’s terms before adding real users or sensitive data. The in-app cost planner is an editable scenario calculator, not a live quote.

## Current live deployment

- [Open MinePulse on Vercel](https://minepulse-command-mvp.vercel.app)
- [Open MinePulse on Render](https://minepulse-command.onrender.com)
- Source: [private GitHub repository](https://github.com/officialrenaissancedas/minepulse-command-mvp)

Both hosts build from the `main` branch and redeploy after a push. The public sites are currently in **Local demo mode**. The only Supabase project in the connected account is inactive; it has not been restored, and this app’s migration has not been applied. Records entered on the public sites do not sync between visitors or devices. Use demo data only—do not enter sensitive or real operational information.

To enable shared persistence later, first choose an active Supabase project and check its plan/charges, then complete Part 2, add the two browser-safe environment variables to **both** hosting projects, and redeploy. Never use a Supabase service-role/secret key in this browser app.

### Pick your website host

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|
| Vercel + Supabase | Fast GitHub import and preview deployments; a good first choice for a Vite website. | Check current Vercel and Supabase plans; the app does not assume either is free. | Easiest |
| Render Static Site + Supabase | The repository includes a Render Blueprint (`render.yaml`) with the build settings and route fallback. | Check current Render and Supabase plan limits. | Easy |
| Vercel **and** Render + one Supabase project | Useful for trying both or keeping two deployments; it is **not** automatic failover and creates two sites to maintain. | Check both host prices/limits and Supabase usage. | More steps |

The same GitHub repository can deploy to either or both hosts. **Supabase is used with either hosting choice.**

## Part 1 — Put the project on GitHub (using GitHub Desktop)

1. Download and unzip `minepulse-command-mvp.zip` on your computer.
2. Open [github.com/new](https://github.com/new) and create a repository named `minepulse-command-mvp`. Choose **Private** for a prototype with test data. Do not add a README, license, or `.gitignore` (they are already in the project).
3. Install [GitHub Desktop](https://desktop.github.com/) and sign in.
4. In GitHub Desktop, choose **File → Clone repository**, select the new repository, choose a folder on your computer, and click **Clone**.
5. Open the unzipped MinePulse project folder. Copy its contents—including hidden `.gitignore` and `.env.example`—into the cloned GitHub folder. **Do not copy `node_modules`, `dist`, or any `.env.local` file.**
6. Return to GitHub Desktop. Confirm the changed files are listed. In the summary box type `Prepare MinePulse MVP`, then choose **Commit to main** and **Push origin** (or **Publish repository** if it asks).
7. On GitHub.com, refresh the repository page. You should see `package.json`, `pnpm-lock.yaml`, `client/`, and `supabase/`.

## Part 2 — Set up Supabase (do this before the website host)

### A. Create the project

1. Open [Supabase](https://supabase.com) and sign in.
2. Choose **New project**.
3. Name it `minepulse-command` and choose a region near your intended users.
4. Create a strong database password. Save it in a password manager; **do not paste it into this website, GitHub, or a chat**.
5. Wait until the project is ready.

### B. Enable temporary guest sessions

The MVP signs a browser into a Supabase **anonymous** identity so database row-level security can protect that browser’s records without putting a server secret in the website.

1. In the Supabase dashboard, open **Authentication → Sign In / Providers** (the label may vary slightly).
2. Find **Anonymous Sign-Ins** and enable them.
3. Save the setting.

Important: anonymous identities are tied to that browser’s saved session. If someone signs out, clears browser data, or changes devices, Supabase cannot restore that anonymous identity. Data is also private to that identity; **this MVP does not yet have company-wide role/membership sharing**. Use test records for the prototype, not confidential production records.

### C. Create the database, private file bucket, and permissions

1. In Supabase, choose **SQL Editor → New query**.
2. In the GitHub repository, open `supabase/migrations/20260928000000_minepulse.sql` and copy the **entire** file.
3. Paste it into the SQL Editor and click **Run**.
4. Confirm the query finishes without an error.

The migration creates the observation/report workflow, contractor and compliance registers, audit rows, indexes, row-level security policies, realtime publication membership (where available), and the **private** `minepulse-evidence` Storage bucket. Every saved observation automatically creates an **in-app queued report** and an audit event. It does not send an email or file an official report.

### D. Copy the two browser-safe settings

1. In Supabase, open **Connect** or **Project Settings → API Keys**.
2. Copy the **Project URL**.
3. Copy the browser-safe **Publishable key** (usually starts with `sb_publishable_`).
4. Keep them ready for Part 3 or 4.

The publishable key is meant to be visible in a browser app. **Do not use or expose a Supabase secret/service-role key.** The app also accepts an older public `anon` key through `VITE_SUPABASE_ANON_KEY`; the preferred current name is:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_YOUR_PUBLIC_KEY
```

## Part 3 — Host the website on Vercel (choose this or Render)

1. Open [vercel.com](https://vercel.com), create/sign into your account, and choose **Continue with GitHub**.
2. Choose **Add New → Project** and **Import** `minepulse-command-mvp`.
3. Use these build settings (the checked-in `vercel.json` already supplies the install/build/output settings):

   - Framework: **Vite**
   - Root directory: repository root (`.`)
   - Build command: `pnpm build`
   - Output directory: `dist/public`

4. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase browser-safe publishable key |

5. Choose **Production**, **Preview**, and (if available) **Development** for each variable.
6. Click **Deploy** and wait for the build to finish. Open the `.vercel.app` URL.

If you later change an environment variable, redeploy—the values are embedded into the frontend at build time.

## Part 4 — Or host the website on Render instead

1. Open [render.com](https://render.com) and sign in with GitHub.
2. Choose **New → Blueprint** and select the `minepulse-command-mvp` repository.
3. Render reads the included `render.yaml`. When asked, provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Click **Apply** and wait for the Static Site to finish building.
5. Open the `.onrender.com` link.

If you prefer to configure it manually, choose **New → Static Site** and use:

- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Publish directory: `dist/public`
- Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Add a **Rewrite** from `/*` to `/index.html` (not a redirect) for client-side routes

The checked-in `render.yaml` already sets that rewrite and the build output directory.

## Part 5 — If you want it on both Vercel and Render

Repeat Part 3 and Part 4 using the **same GitHub repository and same Supabase project**. Add the two environment variables to each hosting provider. Each host gets its own public URL. Changes pushed to GitHub can redeploy both; the hosts do not automatically route traffic between each other.

## Part 6 — Check that it really works

1. Open your deployed URL and refresh the page once. It should still load (that checks the single-page-app rewrite).
2. In MinePulse, open **Log observation** and enter a test title, mine, category, severity, and description.
3. To attach coordinates, press **Capture my location** and allow the browser’s location prompt. Location is optional; the report still works if permission is denied.
4. Submit. The report should appear in the **Reports** page and in Supabase **Table Editor → observations** and `reports`.
5. Open **Contractors** and add a test company. Change its status and refresh; the value should persist.
6. Open **Compliance** and add a test requirement. Change status, refresh, and export its CSV.
7. Open **Cost & scale**; edit an assumption. The cards/chart/table recalculate, the browser saves your values locally, and **Export scenario** downloads a CSV.
8. In Supabase **Storage**, confirm that the `minepulse-evidence` bucket is private. Upload a small evidence file with an observation to test the private storage policy.

The Overview shows source-linked public production snapshots: company/subsidiary YTD to **26 Sep 2026** and provisional mine-wise FY 2024–25 values. These figures are static in the app and do not represent live mine conditions. Observation, report, contractor, and compliance counts remain empty until your team enters records. The cost/scalability inputs are saved only in the current browser and are not shared with Supabase. See `DATA_SOURCES.md` for the full provenance and update notes.

## Local preview (optional)

Install [Node.js 22](https://nodejs.org/) and pnpm 10. From a terminal in the project folder:

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local`, then add the two Supabase values above. On Windows PowerShell, the copy command is:

```powershell
Copy-Item .env.example .env.local
```

Start the development site:

```bash
pnpm dev
```

Open the local address printed in the terminal (usually `http://localhost:5173`). Without environment variables, the app works in browser-only demo mode; browser-only records are not uploaded to Supabase.

Before pushing changes, run:

```bash
pnpm check
pnpm test
pnpm build
```

The static site output is `dist/public`.

## Troubleshooting

### It says “Supabase tables are not ready”

Return to **Supabase → SQL Editor**, run the full checked-in migration, and confirm there is no red SQL error. Verify the Auth **Anonymous Sign-Ins** setting is on.

### A new browser can’t see the previous anonymous user’s records

That is expected with anonymous access: records are private to the original browser identity. This MVP has no account-recovery or shared organization/team roles. Do not use guest identities for long-term or confidential records.

### It says “browser-only mode”

Confirm both variable names match exactly and that you set the public key from the **same** Supabase project. Rebuild/redeploy after changing variables. Never paste a secret/service-role key into a `VITE_` setting.

### A report works, but an evidence file does not

Check that the migration created the private `minepulse-evidence` bucket and its policies. Files larger than 10 MB are rejected. File uploads need a network connection; the offline queue covers report text and coordinates, not file blobs.

### The page is blank or the build reports that it cannot find the output directory

Use the Vite build command and the matching output directory: `pnpm build` → `dist/public`. Do not change one without the other. Check the deployment’s build log for the first error.

### I changed code; how do I publish the update?

Commit and push the changed files to GitHub using GitHub Desktop. Vercel and Render then make a new deployment from that push. The deployment is not complete until its build is marked successful.

## MVP boundaries — please read before real-world use

- **Notifications:** submissions create a queued report and database audit event, but no email, WhatsApp, SMS, or regulator delivery is configured.
- **AI:** the Copilot preview uses fixed local response templates. There is no live risk feed, LLM, or predictive model; the feature does not provide safety advice.
- **Offline:** when Supabase is configured, report text and coordinates are stored in a browser outbox and retried on reconnection. Evidence-file uploads still require a connection. Without Supabase configuration, records are browser-only and do not sync.
- **Access:** current anonymous-user policies isolate each user’s records. There are no company roles, shared contractor accounts, or regulator portal yet.
- **Compliance:** checks are team-entered tracking records, not a legally validated or automatically updated statutory register.
- **Public production data:** overview figures are source-linked dated snapshots and are not refreshed automatically. They do not certify mine health, safety, attendance, or compliance.
- **Scalability:** use the planner for scenario discussion. It does not query hosting quotas, billing, traffic, or Supabase usage.

For a production rollout, the next steps are named sign-in/SSO, organization and mine membership roles, reviewed multi-tenant RLS, server-side notification delivery, testing with real workload data, and a security review.

## Official setup references

- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite), [rewrites](https://vercel.com/docs/routing/rewrites), and [environment variables](https://vercel.com/docs/environment-variables)
- [Render Static Sites](https://render.com/docs/static-sites), [first deploy](https://render.com/docs/your-first-deploy), and [redirects/rewrites](https://render.com/docs/redirects-rewrites)
- [Supabase React setup and publishable keys](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [database migrations](https://supabase.com/docs/guides/local-development/database-migrations), [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
