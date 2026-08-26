# Crew Dispatch

Crew and admin dispatch for scheduling jobs, assigning crews, tracking responses, and managing work. Features a protected admin panel and crew member portal.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
- [Supabase](https://supabase.com/) (Postgres for all data)
- [NextAuth.js](https://next-auth.js.org/) v5 (unified Google SSO for admin & crew)
- [Sonner](https://sonner.emilkowal.ski/) toasts
- Web Push notifications

## Key Features

### Admin Panel (`/admin`)
- **SSO Login**: Google sign-in (allowlisted emails only)
- **Job Management**: Create, edit, and delete jobs directly in the app
- **Crew Assignment**: Assign crew members to jobs when creating them
- **Job Board View**: Same familiar board layout with rough/trim/service color coding
- **Crew Management**: Track crew roster and contact info
- **Payment Tracking**: Record payments in/out
- **Push Notifications**: Get notified of crew responses

### Crew Portal (`/crew`)
- **SSO Login**: Google authentication
- **Job Dashboard**: View assigned jobs for tomorrow and upcoming dates
- **Accept/Decline**: Respond to job assignments
- **Push Notifications**: Receive alerts when assigned to new jobs
- **Mobile-Friendly**: Optimized for phone use in the field

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in:
# - Supabase credentials
# - ADMIN_EMAILS (allowlisted admin emails)
# - Google OAuth client ID + secret
# - VAPID keys for push notifications
# - NextAuth secret
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
- Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)
- Crew portal: [http://localhost:3000/crew](http://localhost:3000/crew)

## Database Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Run all migration files in order:
   - [`supabase/migrations/001_job_board_sync.sql`](supabase/migrations/001_job_board_sync.sql) (optional, for Google Sheets sync)
   - [`supabase/migrations/002_invoice_sync.sql`](supabase/migrations/002_invoice_sync.sql) (optional, for invoice sync)
   - [`supabase/migrations/003_push_subscriptions.sql`](supabase/migrations/003_push_subscriptions.sql)
   - [`supabase/migrations/004_crew_dispatch.sql`](supabase/migrations/004_crew_dispatch.sql) (**required** for dispatch features)
4. Set environment variables from [`.env.example`](.env.example)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required — admin APIs use service role after SSO)
   - `ADMIN_EMAILS` — comma-separated emails allowed in `/admin`
   - `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally, your live site URL in production
5. **Google SSO (admin + crew)** — create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: **Web application**
   - Redirect URI: `http://localhost:3000/api/auth/callback/google` (and production URL)
   - Set `CREW_GOOGLE_CLIENT_ID` / `CREW_GOOGLE_CLIENT_SECRET`
   - Add admin emails to `ADMIN_EMAILS`

Admins open `/admin/login` and sign in with Google. Only allowlisted emails can enter the admin panel.

## Crew Workflow

1. **Admin creates a job** and assigns crew members
2. **Crew receives push notification** (if enabled) when assigned
3. **Crew opens `/crew`** to view tomorrow's jobs
4. **Crew accepts or declines** each job assignment
5. **Admin sees responses** in the job details

Jobs are typically assigned the day before (e.g., Tuesday afternoon for Wednesday work).

Admins can enable phone banners when a Lantana job is added to the board.

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Add to Netlify / `.env.local`:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT=mailto:noreply@crew-dispatch.com`
3. Run [`supabase/migrations/003_push_subscriptions.sql`](supabase/migrations/003_push_subscriptions.sql) in Supabase.
4. Redeploy (public VAPID key is baked into the client build).
5. On each admin device:
On each admin device:
   - Open `https://crew-dispatch.com/admin` while signed in
   - Tap **Enable notifications** and allow permission
   - **iPhone:** Share → **Add to Home Screen**, open the home-screen icon, then enable (Safari in a tab cannot receive Web Push)

When Sheets sync inserts a new Lantana job, subscribed devices get a notification; tapping it opens that job.

### Crew Notifications (Job Assignments)

Crew members automatically receive push notifications when assigned to new jobs (if they've granted permission). The notification includes the job title and date.

Crew can enable/disable notifications in their portal settings (coming soon) or by managing browser permissions.

## Google Sheets Integration (Optional)

The system now works standalone without Google Sheets. However, you can optionally sync from Sheets for backward compatibility.

### Job Board Sync

1. In [Google Cloud Console](https://console.cloud.google.com/): create a project → enable **Google Sheets API** → create a **service account** → download a JSON key.
2. Share the job board spreadsheet with the service account email (**Viewer**).
3. Add to `.env.local` / Netlify:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (the `private_key` from the JSON)
   - `GOOGLE_JOB_BOARD_SPREADSHEET_ID` (default board id is in `.env.example`)
   - `SHEETS_SYNC_SECRET` (random string for the Netlify cron)
4. Run [`supabase/migrations/001_job_board_sync.sql`](supabase/migrations/001_job_board_sync.sql) in the Supabase SQL editor (or re-run the full schema on a fresh project).
5. In `/admin`, click **Sync from Sheets**. Use **Backfill all weeks** on the Jobs page once to import archived week tabs.
6. **Automatic updates**
   - **Live (recommended):** add [`docs/sheets-live-sync.gs`](docs/sheets-live-sync.gs) as `sync.gs` in the job board Apps Script.
     1. Set Script properties `SHEETS_SYNC_URL` (your **deployed** HTTPS site + `/api/admin/sheets/sync`) and `SHEETS_SYNC_SECRET`.
     2. Run **`installLantanaSyncTrigger`** once (required — simple `onEdit` cannot call the web).
     3. After one Google permission approval, Lantana assigns/clears update the dashboard automatically.
     - `localhost` will not work; Google must reach a public Netlify URL.
   - **Backup cron:** Netlify runs `sync-job-board` **hourly**.
   - Local `npm run dev`: use **Sync from Sheets** (Apps Script cannot hit your laptop).

## Lantana invoices (Gross / Profit)

Your [Lantana invoices](https://docs.google.com/spreadsheets/d/1TvXUr9-G82P6b1ZPsuJWOYa2tNFwoXN8DAUhkMKklVU) sheet is the durable payout ledger.

Admin **Sync invoices** reads **DRAW** (live prices) plus **InvoiceTemplate** for older weeks.

1. Share that spreadsheet with the **same** service account (**Viewer**).
2. Add `GOOGLE_INVOICE_SPREADSHEET_ID=1TvXUr9-G82P6b1ZPsuJWOYa2tNFwoXN8DAUhkMKklVU` to `.env.local` / Netlify.
3. Run [`supabase/migrations/002_invoice_sync.sql`](supabase/migrations/002_invoice_sync.sql) in Supabase.
4. Keep the local DRAW tab updated via [`docs/draw-import.gs`](docs/draw-import.gs), then in `/admin` click **Sync invoices** (or **Sync all**).

| What | Where |
|------|--------|
| Contact email & phone | `src/components/Contact.tsx` |
| Admin allowlist | `ADMIN_EMAILS` env |
| DB schema | `supabase/schema.sql` |

## Deploy (Netlify)

Git push to `main`. Ensure the env vars above are set in Netlify → Site settings → Environment variables.

```bash
npm run build
```
