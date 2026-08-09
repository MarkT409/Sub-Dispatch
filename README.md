# Lantana

Company landing page for **Lantana Electric LLC** — electrical subcontracting (rough-in, trim, builder power) plus a protected admin panel for jobs and payments.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
- [Supabase](https://supabase.com/) (Postgres for admin data)
- [Zoho OAuth / OIDC](https://www.zoho.com/accounts/protocol/oauth/sign-in-using-zoho.html) (admin sign-in)
- [Sonner](https://sonner.emilkowal.ski/) toasts

## Getting started

```bash
npm install
cp .env.example .env.local
# fill Supabase + Zoho OAuth + ADMIN_EMAILS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: [http://localhost:3000/admin](http://localhost:3000/admin).

## Admin panel setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Set Netlify / `.env.local` vars from [`.env.example`](.env.example):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required — admin APIs use it after Zoho login)
   - `ADMIN_EMAILS` — comma-separated Zoho addresses allowed in `/admin`
   - `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally, your live site URL in production
4. **Zoho Sign-in (SSO)** — register a **Server-based** app at [Zoho API Console](https://api-console.zoho.com/):
   - Authorized redirect URI: `http://localhost:3000/api/admin/zoho/callback` (and your production URL with the same path)
   - Copy **Client ID** and **Client Secret** into `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET`
   - Set `ADMIN_SESSION_SECRET` to any long random string
   - If your Zoho org is not in the US data center, set `ZOHO_ACCOUNTS_URL` (e.g. `https://accounts.zoho.eu`)

Admins open `/admin/login` and click **Sign in with Zoho**. They enter their normal Zoho credentials on Zoho’s site. This app never stores that password — when the Zoho password changes, sign-in here uses the new one automatically. Only allowlisted emails can enter.

## Google Sheets job board sync

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

Admin **Sync invoices** currently reads **InvoiceTemplate** only (DRAW → dashboard sync is paused). The Apps Script `docs/draw-import.gs` can still keep the local DRAW tab updated for later.

1. Share that spreadsheet with the **same** service account (**Viewer**).
2. Add `GOOGLE_INVOICE_SPREADSHEET_ID=1TvXUr9-G82P6b1ZPsuJWOYa2tNFwoXN8DAUhkMKklVU` to `.env.local` / Netlify.
3. Run [`supabase/migrations/002_invoice_sync.sql`](supabase/migrations/002_invoice_sync.sql) in Supabase.
4. In `/admin`, click **Sync invoices** (or **Sync all**). Gross appears on jobs matched by address.

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
