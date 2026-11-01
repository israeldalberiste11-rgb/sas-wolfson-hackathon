# SAS Wolfson Hackathon Club — Manual Testing Checklist

For your personal review before inviting real users. All data in the app is fictional
(`@example.com` accounts, `555-01xx` phones, placeholder screenshots).

## Setup

1. Run the migration (if not done yet): paste `supabase/migration_combined.sql`
   into https://supabase.com/dashboard/project/cjfcmekdvmorrmttxcet/sql → Run.
   Expect "Success. No rows returned".
2. Verify seed: Table Editor should show 12 tables, `events` = 5 rows,
   `profiles` = 8 rows (6 students + 1 advisor + 1 officer).
3. Start the app: `npm run dev` → http://localhost:5173

---

## 1. Public Home Page — no login

| # | Action | Expected result |
|---|--------|-----------------|
| 1.1 | Open `/` | Hero banner (White Tigers / SAS Wolfson), Get Started + View Portfolio buttons |
| 1.2 | Metrics bar | Competitions Attended, Awards Won, Prize Money, Active Members show real numbers from DB (e.g. $4,000 prize money) |
| 1.3 | Next-event countdown | Ticks down to the second toward the next upcoming event |
| 1.4 | Portfolio gallery | Filter tabs All / Award Winners filter published showcase cards (StudyBuddy AI, CampusSafe Live, EcoRoute Miami) |
| 1.5 | Showcase privacy | Cards show first names only — no last names, emails, or student IDs anywhere |
| 1.6 | Resize to 320px wide | Everything stacks; no horizontal scroll; hero text still readable |

## 2. Student login (OAuth needs Google setup — see blockers)

| # | Action | Expected result |
|---|--------|-----------------|
| 2.1 | Open `/login` | SAS logo, "Welcome Back", Google sign-in, Staff/Mentor Login toggle |
| 2.2 | Enter non-district email in staff field | Magic-link send rejected or ignored for non-whitelisted (staff path requires `@dadeschools.net` whitelist entry) |
| 2.3 | Staff magic link with `dr.patel@example.com` | OTP email sent (needs Email provider enabled); sign-in lands on advisor console |

> **Note:** Google OAuth requires one-time dashboard setup (Authentication → Providers →
> Google, restrict to hosted domain). Until then, buttons show a clear
> "Supabase is not configured" message rather than failing silently.

## 3. Student dashboard (requires signed-in student)

| # | Action | Expected result |
|---|--------|-----------------|
| 3.1 | Sign in as a student → `/student/dashboard` | Name shown; travel eligibility card with 3 checks (Membership, Parent Consent, GPA) |
| 3.2 | Eligibility example (Riley Garcia) | Consent = Pending, GPA = Pending → card amber, "not cleared" |
| 3.3 | Registered events list | Status badges (`registered`, `waitlisted`, `approved_to_travel`) |
| 3.4 | Excuse deadline countdown | Ticks to the second at event start minus 48h; shows deposit amount |
| 3.5 | Quick actions | QR Event Pass, Profile, Team, Receipt links all navigate |

## 4. Event registration + waitlist

| # | Action | Expected result |
|---|--------|-----------------|
| 4.1 | `/events` | Upcoming / My Registrations / Past tabs; events grouped correctly (ShellHacks 2025 = registration_open) |
| 4.2 | Each event card | Dual countdowns: registration close + event start (live, to the second) |
| 4.3 | Register button (eligible event) | Insert succeeds → badge flips to `registered`, list refreshes |
| 4.4 | Register when bus full (40 seats) | Student gets `waitlisted` with position N+1 |
| 4.5 | Officer cancels a registered attendee | DB trigger auto-promotes first waitlisted student to `registered` |
| 4.6 | Register twice | Second attempt blocked (UNIQUE event_id+user_id) |

## 5. Team management

| # | Action | Expected result |
|---|--------|-----------------|
| 5.1 | `/student/team` | Create team form; existing team shown if any |
| 5.2 | Create team | Team created with you as leader, max size = event's `max_team_size` (default 4) |
| 5.3 | Invite by email or student ID | Peer found → invite row `pending` |
| 5.4 | Invite a 5th member when roster is 4 | Blocked with explicit max-members error |
| 5.5 | Invitee accepts | Status → `accepted`; count updates for everyone |
| 5.6 | Join a 2nd team for the same event | DB trigger rejects: "Student is already on a team for this event" |
| 5.7 | Lock roster (leader, all accepted) | Team → `locked`; invite form disabled; can now submit |

## 6. QR pass + offline (PWA)

| # | Action | Expected result |
|---|--------|-----------------|
| 6.1 | `/student/qr-pass` | Unique QR rendered from profile + event + timestamp |
| 6.2 | DevTools → Network → Offline, reload pass page | Pass still renders (cached) |
| 6.3 | Offline reload `/student/dashboard` or `/events` | Static schedule/contacts served from IndexedDB cache |
| 6.4 | Reconnect | Queued updates sync; cache refreshes |

## 7. Officer console

| # | Action | Expected result |
|---|--------|-----------------|
| 7.1 | Sign in as `sam.reyes@example.com` → `/officer/console` | Tabs: Check-in, Equipment, Lu.ma, Showcase, Registrations |
| 7.2 | Check-in tab, manual check-in | Student flips to `checked_in`; overdue-equipment student is **blocked** by trigger |
| 7.3 | Equipment tab | Inventory summary + checkout table; filters by status work |
| 7.4 | Lu.ma verifier | Manual ticket reference entry returns simulated verification result |
| 7.5 | Showcase moderation | Drafts listed; publish/archive actions allowed |
| 7.6 | Staff page resize to mobile | Data tables collapse to card stacks |

## 8. Faculty advisor suite

| # | Action | Expected result |
|---|--------|-----------------|
| 8.1 | Sign in as `dr.patel@example.com` → `/advisor/compliance` | Tabs: Chaperones, Clearance, Medical, Budget, Stipends |
| 8.2 | Chaperone calculator | Ratio shows N students : M chaperones; below 1:10 → red block on travel approval |
| 8.3 | Clearance toggles | GPA / consent / membership toggles update student rows (staff UPDATE policy) |
| 8.4 | Medical view | Severe allergies highlighted; export button produces contact sheet (restricted to advisor role) |
| 8.5 | Budget tab | Allocations vs expenses per event; balance calculated from ledger |
| 8.6 | Stipend approval | Cap $500/event enforced; approve/reject requires feedback note |

## 9. Role security (negative tests)

| # | Action | Expected result |
|---|--------|-----------------|
| 9.1 | Student opens `/advisor/compliance` URL | Redirected — role gate rejects |
| 9.2 | Student opens `/officer/console` URL | Redirected |
| 9.3 | Student queries another student's profile (DB) | 0 rows (RLS) |
| 9.4 | Student queries `admin_whitelist` (DB) | 0 rows |
| 9.5 | Student tries `UPDATE profiles SET role='officer'` on self (SQL) | Rejected: "Users cannot modify their own role" |
| 9.6 | Student queries `budget_ledger` (DB) | Only their own submitted rows |
| 9.7 | Signed-out browser opens `/student/dashboard` | Redirect to `/login` |

## 10. Responsive breakpoints

| # | Viewport | Expected result |
|---|----------|-----------------|
| 10.1 | 320–767px (mobile) | Fixed bottom nav with 4 items, ≥48px touch targets; tables → card stacks |
| 10.2 | 768–1023px (tablet) | Two-column layouts where designed; nav adapts |
| 10.3 | 1024px+ (desktop) | Full sortable tables for rosters, equipment, budget |

---

## Known blockers (need your one-time action)

1. **Run `migration_combined.sql`** in the Supabase SQL editor (if not yet done).
2. **Google OAuth**: Dashboard → Authentication → Providers → Google → add
   client ID/secret; set hosted domain restriction to `@students.dadeschools.net`.
3. **Auth callback URL**: add `http://localhost:5173/auth/callback` to
   Authentication → URL Configuration → Redirect URLs.
4. **Email provider** (for staff magic links): enable in Authentication → Providers → Email.

## Test results from automation (last run)

- `npm test -- --run`: **22/22 tests pass** (2 files: utils + supabase domain logic)
- `npm run build`: **green** (tsc + vite, ~1943 modules, PWA service worker generated)
- Migration validated: 12 tables, 43 RLS policies, 11 triggers, 10 functions,
  0 destructive ops, 0 real emails, FK-safe seed order, balanced `$$`.
