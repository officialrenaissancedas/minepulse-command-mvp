# MinePulse Command · Production Deployment Guide

This guide deploys the MinePulse PS 24 coal-mine governance dashboard with:

- **Vercel or Render** for the React website
- **Supabase** for database, anonymous session identity, evidence storage, Row Level Security, and realtime updates
- **GitHub** as the source of truth for automatic redeploys

You can deploy to both Vercel and Render for testing, but normally choose one as the live website. Both can use the same Supabase project.

> The dashboard is designed to work in **local demo mode** until the Supabase migration is run. After the migration and environment variables are configured, the sidebar changes to **Supabase synced** and observations, reports, risk reviews, and evidence are stored remotely.

---

## 1. What is production-ready now

- Supabase browser client using only the public anon key.
- Supabase session bootstrap using anonymous auth; no service-role key is exposed in the browser.
- Database migration at `supabase/migrations/20260928000000_minepulse.sql`.
- RLS policies for observations, reports, evidence metadata, risk reviews, audit events, and mine data.
- Automatic report creation in the database whenever an observation is inserted.
- Private `minepulse-evidence` storage bucket with per-observation file paths.
- Optional evidence attachment in the Log Observation form; maximum 10 MB.
- Realtime refresh for new or changed observations and automatic reports.
- Local demo fallback when Supabase is not configured or the migration is not ready.
- Hardened Render Blueprint and Vercel configuration.
- TypeScript, build, and Supabase connectivity checks.

### What remains intentionally outside this first deployment

- Email, WhatsApp, SMS, or official DGMS notifications are not sent by the browser. The database records and routes the automatic report. Add a Supabase Edge Function or an email provider later for external delivery.
- Anonymous Supabase sessions are used for this competition-ready foundation. Before a real institutional rollout, replace them with Supabase email/SSO authentication and role-based mine access.

---

## 2. Supabase setup — do this first

### Step 1: Create a Supabase project

1. Open [supabase.com](https://supabase.com).
2. Click **Start your project** and sign in.
3. Click **New project**.
4. Name it `minepulse-command`.
5. Choose a region close to your users.
6. Create a strong database password and save it somewhere safe.
7. Wait for the project to finish provisioning.

### Step 2: Enable anonymous sign-ins

The current website creates a short-lived anonymous Supabase session so RLS can protect data without exposing any server secret.

1. In Supabase, open **Authentication → Providers**.
2. Find **Anonymous**.
3. Turn it on.
4. Click **Save**.

For a real production rollout, later replace this with organization SSO or email login and add role-based membership tables.

### Step 3: Run the MinePulse migration

1. In Supabase, open **SQL Editor**.
2. Click **New query**.
3. Open this file from the repository:

   `supabase/migrations/20260928000000_minepulse.sql`

4. Copy the complete file contents into the SQL Editor.
5. Click **Run**.
6. Confirm that the query completes without an error.

The migration creates:

| Table / resource | Purpose |
|---|---|
| `mines` | Seeded Central India mine network and health scores |
| `observations` | Geo-tagged safety, grievance, environment, and compliance reports |
| `reports` | Automatic report generated from every observation |
| `evidence` | File metadata pointing to private storage objects |
| `risk_reviews` | Review state for risk queue items |
| `audit_events` | Append-only governance events |
| `minepulse-evidence` bucket | Private evidence files |

It also enables RLS and creates the automatic-report database trigger.

### Step 4: Copy the two public API values

1. In Supabase, open **Project Settings → API**.
2. Copy **Project URL**.
3. Copy the key named **anon / public** or **publishable anon key**.

Use these exact variable names:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never use the `service_role` key in this React website. Never commit `.env` files.

---

## 3. Turn on real email escalations (optional but recommended)

The browser/database workflow records every automatic report. For real email delivery, the repository includes `supabase/functions/dispatch-report/index.ts`. It sends category-specific email through Resend without putting an email API key in Vercel or Render.

The function supports these destinations:

- Safety hazards → `DGMS_ESCALATION_EMAIL`
- Worker grievances → `GRIEVANCE_ESCALATION_EMAIL`
- Environmental issues → `ENVIRONMENT_ESCALATION_EMAIL`
- Compliance concerns → `COMPLIANCE_ESCALATION_EMAIL`

This is an escalation email to your configured compliance/safety contact. It is **not** an official DGMS filing or government submission.

### Deploy the function

1. Create a [Resend](https://resend.com) account.
2. Verify the sending domain or email address.
3. Install the Supabase CLI by following the [official guide](https://supabase.com/docs/guides/cli).
4. Log in and link your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

5. Set the function-only secrets. These stay inside Supabase Edge Functions:

```bash
supabase secrets set \
  RESEND_API_KEY=re_your_key \
  REPORT_FROM_EMAIL=MinePulse <alerts@your-verified-domain.com> \
  DGMS_ESCALATION_EMAIL=safety@example.com \
  GRIEVANCE_ESCALATION_EMAIL=grievance@example.com \
  ENVIRONMENT_ESCALATION_EMAIL=environment@example.com \
  COMPLIANCE_ESCALATION_EMAIL=compliance@example.com
```

6. Deploy the function:

```bash
supabase functions deploy dispatch-report
```

7. In Supabase, open **Database → Webhooks** and create an **INSERT** webhook for the `public.reports` table that calls the `dispatch-report` Edge Function.
8. Submit a test observation from MinePulse and confirm the configured mailbox receives the category-specific message.

If your team uses SendGrid, SES, an internal SMTP relay, or an incident tool instead of Resend, keep the same function boundary and replace only the provider request.

---

## 3. Run locally

You need Node.js 20 or newer. Node.js 22 is recommended.

```bash
cd minepulse-command
pnpm install
```

Create a local `.env` file in the project root and add the two Supabase values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Start the site:

```bash
pnpm dev
```

Open the local URL printed in the terminal.

### Test the Supabase connection

```bash
pnpm vitest run server/supabase.connectivity.test.ts
```

A passing test means the URL and anon key can reach Supabase. It does not replace running the SQL migration.

### Run all checks

```bash
pnpm check
pnpm test
pnpm build
```

The deployable static website is in `dist/public`.

---

## 5. Put the project on GitHub

1. Go to [github.com](https://github.com).
2. Click **New repository**.
3. Name it `minepulse-command`.
4. Keep it private if this is an SIH prototype.
5. Do not add another README or `.gitignore`.
6. In a terminal inside the project folder, run:

```bash
git init
git add .
git commit -m "Prepare MinePulse for Supabase production"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/minepulse-command.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 6. Deploy on Vercel

Vercel is the simplest choice for the live website.

1. Open [vercel.com](https://vercel.com).
2. Click **Sign Up** and choose **Continue with GitHub**.
3. Click **Add New → Project**.
4. Import the `minepulse-command` repository.
5. Use these settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `.` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist/public` |

6. Before deploying, open **Environment Variables**.
7. Add `VITE_SUPABASE_URL` with your Supabase Project URL.
8. Add `VITE_SUPABASE_ANON_KEY` with your public anon key.
9. Apply both variables to **Production**, **Preview**, and **Development**.
10. Click **Deploy**.

The included `vercel.json` already includes the Vite build settings and SPA fallback rewrite.

After the deployment is live:

1. Open the site.
2. Confirm the sidebar says **Supabase synced**.
3. Open **Log observation**.
4. Submit a test safety hazard.
5. In Supabase, open **Table Editor → observations** and confirm the row exists.
6. Open **reports** and confirm the automatic report exists.
7. Upload a small image and confirm it appears in **Storage → minepulse-evidence**.

If the sidebar says **Local demo mode**, check the two Vercel variables and redeploy. Environment variables are read during the build, so a redeploy is required after changing them.

---

## 7. Deploy on Render

Render is an equally valid alternative and the repository includes `render.yaml`.

### Blueprint method — easiest

1. Open [render.com](https://render.com).
2. Sign up or log in.
3. Click **New → Blueprint**.
4. Connect GitHub.
5. Select the `minepulse-command` repository.
6. Render detects `render.yaml`.
7. Enter the values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when Render asks for them.
8. Click **Apply**.
9. Wait for the build to finish.
10. Open the `.onrender.com` URL.

### Manual Static Site method

If Render does not detect the Blueprint:

1. Click **New → Static Site**.
2. Connect the GitHub repository.
3. Use:

| Setting | Value |
|---|---|
| Branch | `main` |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Publish directory | `dist/public` |
| Auto-deploy | Yes |

4. Add these environment variables under **Environment**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Create the static site.
6. If refreshing a route shows Not Found, add a rewrite from `/*` to `/index.html`.

The included Render Blueprint already configures the static publish directory, SPA rewrite, Node 22, Supabase variables, and automatic redeploys.

---

## 8. Important security rules

- The browser may contain only `VITE_SUPABASE_URL` and the public anon key.
- Do not put a Supabase `service_role` key in Vercel, Render frontend variables, GitHub, or chat.
- Keep RLS enabled on every table.
- Keep the evidence bucket private.
- Use small evidence files; the UI enforces a 10 MB limit.
- For institutional deployment, replace anonymous auth with SSO/email and add a `mine_memberships` table.
- Use Supabase Edge Functions for email or regulator notifications so provider secrets stay server-side.

---

## 9. Troubleshooting

### The site says “Local demo mode”

Check that both variables exist with the exact names:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Then redeploy. Vite embeds `VITE_` variables at build time.

### The site says “Supabase tables are not ready”

Run `supabase/migrations/20260928000000_minepulse.sql` in Supabase SQL Editor.

### Anonymous sign-in fails

Open **Authentication → Providers → Anonymous** in Supabase and enable it.

### An observation cannot be saved

Check these in order:

1. The migration ran successfully.
2. Anonymous sign-ins are enabled.
3. RLS policies still exist.
4. The browser is using the public anon key from the same Supabase project.
5. The minepulse-evidence bucket exists if an attachment is being uploaded.

### Vercel or Render shows a blank page

Check:

- Output directory is `dist/public`.
- Build command is `pnpm build`.
- The two Supabase variables are configured before the build.
- The latest Git commit is connected to the deployment.

### I changed code but the live site did not change

```bash
git add .
git commit -m "Update MinePulse"
git push
```

Both platforms can automatically redeploy from the push.

---

## 10. Recommended next production phase

1. Replace anonymous auth with organization SSO or email login.
2. Add mine memberships and role-based RLS for officials, corporate managers, contractors, and regulators.
3. Add a Supabase Edge Function for email/WhatsApp/SMS escalation.
4. Add corrective-action tables and evidence review/approval states.
5. Add offline queueing for field teams and a mobile companion app.
6. Add OCR and document expiry reminders for statutory records.
7. Add explainable risk scoring and regulator-specific report templates.
