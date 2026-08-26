# wildcard-pulse — AGENTS.md

This repository is StuyPulse's (FRC Team 694) competition scouting platform, **wildcard-pulse**. It ships in three phases — an online-first web app, then offline support for that same web app, then a native mobile app with full offline + QR relay — all sharing one Supabase database and one submission format. Read the phase you're working in before writing code; do not pull forward work from a later phase into an earlier one (e.g. do not make QR/offline reliability a Phase 1 requirement), and do not make a Phase 1 decision that would force a data-model change later.

- **GitHub:** `wildcard-pulse`
- **Supabase project:** `wildcard`
- **Web hosting:** Vercel

## Why this exists

Two people rely on this system at a competition: the **scout**, entering data live in the stands during a match, and the **strategist**, using that data to build picklists and match strategy in the minutes between matches. Every phase of this build should make those two roles faster and more accurate. Everything else — admin tooling, master/QR relay, sync status UIs — exists in service of that.

## FRC domain primer

- **Team, event, match.** Teams compete at events. An event runs **qualification matches** (ranked, round-robin-style) followed by a **playoff** bracket among top-ranked alliances.
- **Alliance.** Each match is 2 alliances (red/blue) of multiple teams. After quals, top-ranked teams captain alliances and pick partners in **alliance selection** — this is what picklists and comparison views support.
- **Match structure.** Autonomous period (~15-20s, pre-programmed) → teleop (driver control) → an endgame window in the match's final seconds. Match scouting forms should mirror this structure.
- **Ranking points (RP).** Qualification ranking is by RP average (match points plus bonus RPs for thresholds), not raw score.
- **2026 game (REBUILT presented by Haas), current-season reference only, not schema:** 20s auto, then teleop with alternating active/inactive alliance **HUB** windows ("alliance shifts"). Scoring element is **FUEL**, scored into the **HUB**, sourced from a preload, the human player **OUTPOST/CHUTE**, a **DEPOT** (24-fuel capacity), or the floor. Field crossings: a low **BUMP** and a **TRENCH**. Endgame: climbing a **TOWER**'s three **RUNGS**. Season-specific fields like these belong in `form_definitions.schema_json`, never hardcoded into shared types or table columns — the game changes completely every January and this codebase should outlive the season.
- **TBA (The Blue Alliance).** `https://www.thebluealliance.com/api/v3`, auth via `X-TBA-Auth-Key`. Use it to import event/team/match-schedule data rather than hand-entering it; respect ETags to avoid over-fetching. No Statbotics integration, by team decision — TBA is the only external competition data source.

## Non-negotiable constraints

- **Speed and low error over completeness** in every scout-facing form. Every extra tap costs a data point.
- **No reprinting sheets.** Scouting form fields must be editable by admins between events without a redeploy — this is what `form_definitions` (versioned, JSON schema) is for.
- **Adaptable to many games.** Keep season-specific scoring fields out of the core schema; see the game-agnostic config note above.
- **One permanent submission ID, local-first saving, idempotent cloud uploads** — this principle governs every phase, including Phase 1. A `match_submissions.id` UUID is generated client-side at creation and never changes, whether it's edited locally, uploaded directly, exported as a QR code (Phase 3), scanned by a master device (Phase 3), or retried after an error.
- **Never expose the Supabase `service_role` key** in GitHub, Vercel client-side env vars, or browser code. Only the anon/publishable key is used in the browser.
- **Roles live in the database, never in editable user metadata.** Authorize every write with Supabase Row Level Security against `organization_members.role`, not a client-trusted claim.

---

## Phase 1 — Web app

### Goal

A usable web app for admins, strategists, and scouts while devices have internet. This phase establishes the database, roles, forms, dashboard, and submission format the native app will reuse later. Build the online experience cleanly first; do not let offline/QR concerns drive Phase 1 design decisions.

### Stack

| Area | Choice |
|---|---|
| Website | Next.js + TypeScript |
| Hosting | Vercel |
| Styling | Tailwind CSS + component library |
| Database | Supabase Postgres |
| Login | Supabase Auth |
| Photos | Supabase Storage |
| Live updates | Supabase Realtime |
| Validation | Zod |
| Shared types | A TypeScript package/folder shared by web and the future mobile app |

### Roles

| Role | Can do |
|---|---|
| Admin | Create events, teams, matches, forms, users, and assignments |
| Scout | Complete assigned match forms and review their own submissions |
| Strategist | View match data, teams, photos, and dashboard information |

Enforce all of this with Supabase RLS against `organization_members`, not editable client-side user metadata.

### Pages

Minimum Phase 1 screens: login, event selector, match schedule, scout assignment list, match scouting form, submission confirmation, team details page, admin event/match/team management, strategist dashboard, basic submission review page.

```
/auth/login
/dashboard
/events
/events/[eventId]/matches
/events/[eventId]/teams
/scout/assignments
/scout/match/[matchId]
/submissions
/teams/[teamId]
/admin/users
/admin/forms
/admin/sync
```

The strategist dashboard is where the picklist, tiering, side-by-side team comparison, event summary table, and reliability/PulseCrew stats live — these were part of the original scouting requirements and belong here even though they're not separately itemized above. Build them as strategist-dashboard features backed by `match_submissions` and `event_teams`, not as a separate app.

### Core database model

```
profiles
  id                  → auth.users ID
  display_name
  created_at

organizations
  id
  name

organization_members
  organization_id
  user_id
  role                → admin | scout | strategist | master | developer

events
  id
  organization_id
  name
  event_key           → TBA event key, used to import schedule/teams
  starts_at
  ends_at
  status

teams
  id
  organization_id
  team_number
  name

event_teams
  event_id
  team_id

matches
  id
  event_id
  match_number
  match_type          → qualification | playoff | practice
  red_teams
  blue_teams
  scheduled_at
  status

scouting_assignments
  id
  match_id
  scout_user_id
  team_id
  assignment_type     → objective | subjective | pit | strategist
  status

form_definitions
  id
  organization_id
  name
  version
  schema_json          → season-specific field definitions (see game-agnostic config note)

match_submissions
  id                  → UUID created on the client
  event_id
  match_id
  team_id
  scout_user_id
  assignment_id
  form_version
  payload             → JSONB
  status              → draft | submitted | corrected | invalid
  revision
  created_at
  updated_at
  submitted_at

submission_photos
  id
  submission_id
  storage_path
  captured_at
  uploaded_at
```

### Submission ID design (applies from Phase 1 onward)

Every match submission gets a UUID on the device/browser at creation time — e.g. `submission_id = 550e8400-e29b-41d4-a716-446655440000`. That UUID never changes across local edits, direct upload, QR export (Phase 3), master scan (Phase 3), or retry after an error.

`match_submissions.id` is a unique constraint. Upload behavior is always an upsert-by-ID, never a check-then-insert:

```
Try to insert submission ID
  → new ID: save it
  → existing ID: return "already received"
```

This is safer than "check database, then upload," since two devices could otherwise race and create duplicates.

### Security requirements

- Enable Row Level Security on every public table.
- A scout can view only events/assignments they belong to.
- A scout can create only their own submissions and cannot alter another scout's submission.
- Strategists can read event data but cannot alter raw submissions unless explicitly granted.
- Admins can manage event setup.
- Use only the Supabase anon/publishable key in the browser; never the `service_role` key.
- Keep robot/pit photos in a **private** Supabase Storage bucket and load them via signed URLs.

### Web submission flow

```
Scout opens assigned match
  → completes form
  → browser validates fields with Zod
  → submission saved to Supabase
  → dashboard updates through Supabase Realtime
  → scout sees "Submitted" confirmation
```

### Repo structure

```
wildcard-pulse/
  apps/
    web/                 # Next.js application
  packages/
    shared/              # TypeScript types + Zod schemas
  supabase/
    migrations/          # database schema migrations
    seed.sql              # sample event/team data
  docs/
    architecture.md
    data-model.md
    roles-and-security.md
  .env.example
  README.md
```

`.env.example` shows only variable names, never real values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Real values live in each developer's `.env.local` and, for deployment, in Vercel's environment variable settings — never committed.

---

## Phase 2 — Web offline support

Only start this once the normal online flow is stable. Turn the existing web app into a basic PWA without changing the Phase 1 data model:

```
Website loaded online once
  → service worker caches app files
  → IndexedDB stores unsent drafts/submissions
  → website can reopen offline
  → pending items upload after internet returns
```

This is a useful browser-based backup layer — it should not become the only critical competition workflow; that's what Phase 3 is for. Add:

- "Offline ready" indicator
- Local draft saving
- Pending-sync page
- Retry sync button
- Last successful sync time
- Download/export backup option
- An offline test checklist to run before every event

---

## Phase 3 — Native scouting app

This is the reliable competition app, once built.

### Mobile stack

| Area | Choice |
|---|---|
| Cross-platform app | React Native + Expo + TypeScript |
| iOS distribution | Apple Developer nonprofit organization account |
| Android distribution | Google Play / internal distribution later |
| Local database | SQLite |
| Camera/QR | Expo Camera / barcode scanning |
| Secure tokens | Secure device storage |
| Backend | Same Supabase project (`wildcard`) |
| Shared types/forms | Same `packages/shared` code as the website |

### Native app roles

One app supports two modes:

```
Scout mode
  → fill out a match form
  → save locally in SQLite
  → upload directly when online
  → display a QR code if offline

Master mode
  → scan scouts' QR codes
  → save received submissions locally
  → show upload queue
  → upload all pending submissions when online
```

### Native local database

```
local_submissions
  id
  payload_json
  revision
  sync_status          → local | pending | synced | failed
  qr_exported_at
  master_received_at
  last_sync_error
  created_at
  updated_at

local_photos
  id
  submission_id
  local_file_uri
  upload_status
  remote_storage_path
```

The app always writes to SQLite before attempting any network activity.

### Full offline flow

```
Scout completes Match 18
  → save submission in SQLite
  → internet available?
      yes: upload to Supabase
      no: generate QR code

Master phone scans QR
  → verifies checksum/version
  → saves same submission UUID in its SQLite database
  → internet available?
      yes: upload to Supabase
      no: retain in its queue

Later, either device gets internet
  → upload by submission UUID
  → database accepts it once
  → both devices eventually display Synced
```

### QR payload

Compact and versioned:

```json
{
  "v": 1,
  "submissionId": "UUID",
  "eventKey": "2027example",
  "match": 18,
  "team": 1678,
  "scoutId": "UUID",
  "revision": 1,
  "payload": { "...scouting fields..." },
  "checksum": "hash"
}
```

The QR needs no internet connection. The master device verifies the checksum, rejects duplicate/corrupted data, and can save multiple scanned submissions. For larger forms or photos: the QR carries match data only; photos stay on the scout device until a direct internet sync, and the app clearly indicates when photos are still pending.

### Native app screens

Login/device setup, event download, scout assignments, match form, saved matches, submission details, QR display, master scanner, master upload queue, sync status, settings/offline readiness.

### Competition-readiness checklist (run before every event)

- [ ] Publish a tested app version through TestFlight/internal Android testing.
- [ ] Log every device in while online.
- [ ] Download that event's teams, forms, schedules, and assignments.
- [ ] Confirm every device reports "Offline ready."
- [ ] Put every device in Airplane Mode.
- [ ] Complete a test submission.
- [ ] Generate and scan its QR.
- [ ] Re-enable internet.
- [ ] Verify there is exactly one synced database record.
- [ ] Confirm dashboard data matches the submitted record.

---

## Recommended build order

1. Create the GitHub repository structure.
2. Create Supabase tables, roles, RLS policies, and migrations.
3. Build login, event/team/match management.
4. Build the web match form and normal online submission flow.
5. Build dashboard/review pages (including picklist, comparison, and summary views for the strategist).
6. Add shared TypeScript types and Zod form schemas.
7. Add web local drafts and basic PWA behavior (Phase 2).
8. Build the native app using the same shared schemas (Phase 3).
9. Add SQLite local storage.
10. Add QR generation/scanning and master mode.
11. Add reliable sync queue, deduplication, and event-device testing.

The core principle throughout every phase: **one permanent submission ID, local-first saving, idempotent cloud uploads.**