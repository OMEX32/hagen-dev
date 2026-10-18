# Hagen implementation plan

Status: milestone 1 core flows accepted by user review; provider automation/ownership acceptance remains unverified. The user explicitly authorized milestone 2 on 2026-10-18 at 17:19 Europe/Brussels. Food source is prepared; its new migration, SQL ownership suite, and browser verification are pending.
Authoritative product requirements: PROJECT_PROMPT.md. Read this file and PROGRESS.md before resuming.

## Product and user journeys

Hagen is a personal mobile fitness diary with durable private records. It answers what to do today, what has been eaten, what calories/protein remain, what training was actually completed, and how progress changes across comparable weeks.

1. Sign in, recover account access if necessary, and confirm profile, timezone, and provisional targets.
2. Open Today for the selected diary date; log food quickly, reuse labelled nutrition, and confirm diary completion.
3. Open a scheduled workout, record actual sets or walking, resume after interruption, and explicitly complete or skip the activity.
4. Record weight and optional check-ins; inspect coverage-aware weekly summaries and manually export a trainer check-in.
5. Edit future targets and routines without rewriting history; export and restore personal records with explicit confirmation.

## Proposed architecture

- One Next.js App Router application with React, strict TypeScript, Tailwind CSS, and npm lockfile. Installed versions and the npm lockfile are present; verify compatibility before future upgrades. Current official Next.js installation documentation displays v16.4.2 and requires Node >=20.9. Local Node is v24.13.1; npm is 11.8.0.
- Supabase Auth for email/password registration, verification, sign-in, recovery, and sign-out. Use @supabase/ssr and @supabase/supabase-js, cookie-based sessions, the supported server identity verification method, and version-appropriate session refresh integration.
- Supabase PostgreSQL for durable records, SQL migrations, generated TypeScript database types, and Row Level Security. Use the authenticated user's Supabase client for routine access; privileged credentials are unnecessary in ordinary diary requests.
- Vercel application hosting plus Supabase through its Marketplace integration. Reuse suitable existing projects. Separate development/preview data from production. Check current regions, limits, and costs before choosing/provisioning services; no paid service is proposed at this stage.
- Server Components for authenticated reads; Server Actions for validated and authorized form mutations. Route Handlers only where callbacks or file responses need them. Never share-cache private diary responses or session cookies.
- Zod for server input validation. Shared pure domain functions for date handling, target resolution, portion scaling, and summaries; PostgreSQL numeric columns for nutrition precision with display-only rounding.
- Vitest for calculation/domain checks and Playwright for critical browser flows. Test database policies directly using separate accounts and unauthenticated requests, including cross-owner foreign key attachment attempts.
- Start without a chart library; choose one in milestone 4 only if required. Use accessible controls and readable summary text.

Tradeoffs: managed Auth/PostgreSQL reduces account and database operations but requires external setup and online access. SQL migrations and Supabase clients avoid a second ORM/data layer; database policy and transactional SQL need explicit tests. Server-rendered reads reduce client complexity; forms and workout timers still need small interactive client components. No separate Express service or general state framework is justified.

Proposed structure after approval: src/app for routes, src/features for feature UI/actions/validation, src/lib for Supabase and shared domain helpers, supabase/migrations for SQL, and tests for appropriate unit/integration/browser checks. Add only folders needed by each approved milestone.

## Data model and relationships

All private tables belong to an authenticated user. Enforce ownership with RLS, server authorization, and owner-consistent foreign keys for parent/child records. Derive identity from verified authentication, never a submitted owner ID. Use date columns for intended diary days and timezone-aware timestamps for events.

| Entity group | Relationships and invariants | First needed |
| --- | --- | --- |
| Auth user and profile | One profile per auth user; editable confirmed inputs, units, Europe/Brussels default, onboarding state. Approximate 90 kg is not a measurement entry. | 1 |
| Target history | One user has many effective-dated target versions; unique user/effective date. Resolve the last effective target for each diary date. Keep provisional maintenance, requested deficit, food/protein targets, override and assumptions. | 1 |
| Food definitions | A user owns reusable foods with explicitly typed per-100-g or per-serving nutrition, preparation, and serving description. | 2 |
| Saved meals and items | A user owns reusable meal definitions containing food items or explicit quick-entry nutrition; maintain owner-consistent references. | 2 |
| Food logs | User/date/category entries with immutable-at-log-time nutrition basis, quantity/unit, preparation and calculated snapshot; optional reusable-definition source. Editing a definition never rewrites a log. | 2 |
| Food diary days | Unique user/date completion status. An entry mutation atomically invalidates that day's completion. Idempotency keys prevent duplicate submissions; intentional copies get fresh identities. | 2 |
| Workout templates and template exercises | A user owns exercise prescriptions and variations, including unilateral conventions. Preserve revision/snapshot information for past scheduled sessions. | 3 |
| Schedule versions and scheduled sessions | Effective-dated schedule rules generate date-specific sessions idempotently. Sessions retain prescription snapshots and planned/in-progress/completed/skipped status. Past sessions remain unchanged when routines change. | 3 |
| Exercise performances and set logs | A session contains exercise performances, each containing actual reps, resistance, variation and explicit set completion. Persist rest-timer deadlines and in-progress work. | 3 |
| Cardio logs | User/date actual duration, optional distance, effort, notes, and optional owned scheduled-session reference. Avoid double counting a cardio session. | 3 |
| Measurements | User/date measured weight and optional waist; one daily record in v1, editable/deletable. Never seed approximate starting weight as an actual weigh-in. | 4 |
| Daily check-ins | Unique user/date optional sleep, hunger, energy, discomfort/notes; missing fields and days remain unknown. | 4 |

Create only the tables needed by the approved milestone. Use transactions/database functions for onboarding target writes, meal copies, diary completion invalidation, session creation, and restore where a partial write would be misleading. Validate ownership inside those operations as well as at the caller. Version export payloads; validate restores before an explicit conflict-handling confirmation.

## Milestones and acceptance criteria

- [x] 0 — Planning and review: preserve the complete brief; inspect existing work and tooling; propose stack, relationships, review gates and blockers. User reviews before scaffolding.
- [ ] 1 — Foundation (user-reviewed core flows; automated provider acceptance pending): project setup, suitable Supabase/Vercel connection, environment documentation, profile/target migrations, protected mobile shell, auth/recovery, onboarding and settings.
  - Auth redirects and session refresh work; sign-out removes access and recovery changes the password through the provider flow.
  - Confirmed onboarding inputs and editable provisional targets survive refresh and re-login. Target updates are prospective and historical target resolution is tested.
  - Two real test accounts cannot read, modify, delete, or attach to each other's records; unauthenticated requests are blocked.
  - Phone layout works from 360 px with labelled forms, focus states, safe-area spacing and useful saving/failure states. Later tabs remain unavailable.
  - Type check, lint, foundation tests, auth browser checks, and production build pass. Record checks actually run; real provider access is required for full acceptance.
- [ ] 2 — Food and Today (authorized; source prepared, integration verification pending): quick entry and reusable nutrition, saved meals, create/edit/delete/copy/recent workflows, diary completion, and real daily nutrition cards.
  - Label-based scaling is correct; nutrition snapshots preserve history; zero values are accepted while invalid quantities/numbers are rejected.
  - Totals update across views and after reload. Above-target intake displays the real amount over; incomplete or missing logs are clearly distinguished.
  - Duplicate submissions are safe. Editing a completed diary marks it incomplete atomically; copies are independent records.
  - Historical target/date-boundary tests, cross-account tests, food browser flows, failed-save/input-retention checks and standard project checks pass.
- [ ] 3 — Training: initial editable two-week routine, prescription snapshots, sessions, set logging, rest timer, resume, cardio and Today activity.
  - Start/resume/complete/skip statuses remain distinct across reload; unfinished sets stay unfinished. Variations, per-side reps and previous performance are clear.
  - A backgrounded timer calculates from its persisted deadline; do not claim a background alarm. Routine changes preserve previous sessions.
  - Manual walking records and discomfort notes persist. Browser workflows, ownership and duplicate-session checks, timer/domain tests and project checks pass.
- [ ] 4 — Progress: dated measurements, optional check-ins, readable charts/text, comparable weekly summaries, historical targets, and plain-text trainer export.
  - Summaries state weigh-in/check-in coverage and completed diary day counts; missing days are never zero intake. Partial periods are labelled and compared appropriately.
  - Calories/protein averages use completed diary days; adherence uses the target effective on each day. Training totals count actual completed work.
  - Copy and download fallback work. Measurement CRUD, export, summaries/timezone tests, ownership and browser checks pass.
- [ ] 5 — Release readiness: validated JSON backup/restore, installable PWA metadata/icons, mobile verification and production runbook.
  - Versioned exports can be restored under a documented duplicate strategy after confirmation. Malformed/cross-owner data is rejected; multi-row changes are atomic where required.
  - HTTPS production configuration, redirects, environment separation, backups and deployment instructions are documented. No automatic offline writes or private-response caching.
  - Verify installation and online save errors; distinguish actual Safari/iPhone checks from emulation. Full relevant checks and production build pass before release is called ready.

Milestone 1 is the proposed first implementation milestone. Split it into a smaller reviewed slice if provider setup or auth scope prevents a coherent review. Every milestone ends with a PROGRESS.md update and user review; no automatic advancement.

## Blockers and next action

1. The authorized working directory is `/Users/hassanainaljazzar/Documents/ChatGPT/Hagen`, now GitHub-backed by the user's `OMEX32/hagen-dev` repository. Planning files were copied here from the staged Codex workspace. No further Desktop move is needed.
2. User has deployed to Vercel, connected Supabase, applied the foundation migration, configured the app/email redirect origins, and confirmed onboarding, persistence, sign-out/re-login, and password recovery. These are user-observed results; automated provider/session-expiry and two-account foundation checks remain outstanding.
3. Milestone 2 implementation is prepared. Apply **only** `supabase/migrations/202610180002_food.sql` to the existing development project, then publish the source update through the user's GitHub/Vercel workflow. No food migration, commit, push, or deployment has been executed by the agent.
4. Type check, lint, 42 Vitest cases, 5 native-domain cases, and the supported webpack production build pass. Browser scenario discovery passes; actual browser execution is blocked by `listen EPERM 127.0.0.1:3100`. No real food database or physical phone check ran.
5. Run `supabase/tests/food.sql` against a disposable test project with both migrations, and run the provider-backed Playwright flows with disposable accounts. The local Docker engine is stopped and test provider credentials are not configured in this workspace.
6. Known development-only braces advisory and unsupported ESLint 9 remain documented in PROGRESS.md/README.md. Do not apply npm's forced downgrade or hide findings.
7. Record provider/browser/user review results and keep milestone 2 open until its acceptance criteria pass. Milestone 3 training is not approved. Do not run `.next` type generation concurrently with a build.

## Official references checked on 2026-10-18

- https://nextjs.org/docs/app/getting-started/installation
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/integrations/vercel-marketplace
- https://supabase.com/docs/guides/database/postgres/row-level-security

Pin and verify actual dependencies at installation; this planning document does not claim that packages, provider integration, RLS policies, tests or a deployment already exist.
