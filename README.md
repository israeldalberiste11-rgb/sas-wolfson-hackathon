# SAS Wolfson Hackathon Club Portal

A React + Supabase web application for the School for Advanced Studies (SAS) Wolfson Campus Hackathon Club — team formation, event registration, travel compliance, budget tracking, and a public project showcase.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 8, `vite-plugin-pwa` (service worker + manifest), `idb` (IndexedDB), `qrcode.react`, `lucide-react`
- **Backend:** Supabase — PostgreSQL (RLS on every table), Auth (Google OAuth with `@students.dadeschools.net` domain restriction), Storage, Realtime
- **Schema & seed:** `supabase/schema.sql`, `supabase/seed.sql`

## Roles

| Role | Access |
|---|---|
| `student` | Own profile, consent upload, team builder (max 4/event), event registration, QR pass, receipt submission |
| `officer` | Event creation, QR check-in scanner, equipment ledger, Lu.ma ticket verification, showcase moderation |
| `faculty_advisor` | Travel clearance sign-off, chaperone ratio (1:10), medical roster export, stipend/reimbursement approval |

## Key Business Rules (enforced in SQL + UI)

- One active team per student per event (trigger on `team_members`)
- Max 4 members per team (configurable per event via `events.max_team_size`)
- Bus capacity 40 seats, first-come-first-served with automated waitlist promotion
- Travel requires: active membership + approved parent consent + GPA clearance
- Chaperone ratio 1:10 blocks travel approval if short
- Excuse deadline = event start − 48h; unexcused no-shows forfeit $20 deposit
- Check-in blocked if student has overdue/missing equipment
- Stipend cap $500/student/event (configurable)
- Public showcase exposes first names only — no last names, emails, or student IDs (`v_public_showcases` view)

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → run `supabase/schema.sql`, then `supabase/seed.sql`
3. Authentication → Providers → Google: enable, add client ID/secret, and restrict the allowed domain to `students.dadeschools.net` (staff `@dadeschools.net` accounts use the magic-link path verified against the `admin_whitelist` table)
4. Storage → create private buckets `consent-forms` and `receipts`, public bucket `showcase-screenshots`
5. Copy Project URL + anon key into `.env.local`

## Notes

- With no `.env.local`, the app runs in a signed-out demo mode (auth settles immediately, data lists are empty).
- `npm install` needs `--legacy-peer-deps` on this toolchain (npm/arborist peer-resolution bug).
- Node 20.19 is installed at `~/local/node/bin` on this machine if `node` isn't on PATH.

## Deployment (Vercel)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project environment; the PWA service worker is scoped to `/` and generated at build time. The production build is `npm run build` (TypeScript check + Vite build).
