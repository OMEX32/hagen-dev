# Hagen

Private, mobile-first fitness diary built with Next.js App Router, React, strict TypeScript, Tailwind, and Supabase Auth/PostgreSQL.

Milestones 1 and 2 passed user review on the deployed app. Milestone 3 training source, migration, and tests are prepared after explicit approval; its database update and provider review are pending. Independent automated provider acceptance remains outstanding. Both Vercel and Supabase projects were created from scratch. Read `PROJECT_PROMPT.md`, `PLAN.md`, and `PROGRESS.md` before continuing. Later milestones require review before implementation.

## Run locally

Use Node 24 and npm 11. From this folder:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase values, Hagen shows a setup page and makes no pretend saves. Fill in `.env.local` using your project's Connect dialog and restart the development server. Do not paste credentials into chat.

The user completed `npm install` on 2026-10-18, generating `package-lock.json`. Dependency installation is no longer blocked. Subsequent installs can use `npm ci`. The user supplied the audit report on 2026-10-18: one unpatched braces stack-exhaustion vulnerability (GHSA-vfj7-8cjw-p6xm) propagates through micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next, producing five high-severity findings. All five installed packages are marked development-only; `npm ls braces micromatch fast-glob --omit=dev` returns an empty tree. GitHub’s advisory currently lists no patched braces version. Keep the finding visible and reassess upstream releases; no remediation is claimed. Do not apply the suggested forced downgrade to eslint-config-next 14.2.35, remove lint checks, or suppress audit output just to obtain a clean count. The agent session still cannot contact the audit endpoint, so a fresh online audit must run in the user terminal after any dependency changes. ESLint 9 is deprecated; the currently installed React/import/accessibility plugins declare ESLint 9 compatibility, so a major upgrade needs a compatible plugin set and verification. The unrs-resolver native binding loaded successfully without approving its optional fallback postinstall script. Do not use `npm audit fix --force` to resolve installation issues blindly. Core framework versions were checked against official npm metadata on 2026-10-18: Next 16.4.2, React 19.3.1, Supabase JS 2.118.0; SSR 0.12.7 was checked against Supabase's official releases. The conservative TypeScript 5.9 line is selected pending compatibility checks, rather than adopting the newer compiler without verification.

## Fresh Vercel and Supabase setup

This prepares infrastructure; it does not require deploying the application now.

1. Create/sign in to your Vercel account. Open [Supabase in Vercel Marketplace](https://vercel.com/marketplace/supabase/supabase) and install the integration for your personal team.
2. Create a Supabase resource named `hagen-dev`. Choose an available European database region, preferably Frankfurt if offered. Review the plan and checkout first; use a free offering if available and do not select paid compute/add-ons by default. Availability, limits, and billing must be confirmed in your account. No paid commitment has been made by this code.
3. Open that resource in Supabase. In **SQL Editor**, run `supabase/migrations/202610180001_foundation.sql` once on the empty development database. It is transactional. Do not rerun it over an existing schema. This creates profiles, target history, private request receipts, ownership policies, and authenticated write functions. It creates no user or measurement records.
4. In **Connect**, copy the project URL and **publishable** key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`. No service-role/secret key or database password is needed by Hagen's runtime.
5. In **Authentication → URL Configuration**, set Site URL to `http://localhost:3000` for development. Add these exact allowed redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/update-password`
   - For browser tests, also add `http://127.0.0.1:3100/auth/callback` and `http://127.0.0.1:3100/auth/callback?next=/update-password`.
6. Keep email/password sign-in and email confirmation enabled. The default PKCE confirmation/recovery emails should use Supabase's verification link and the callback redirect provided by the app. Open verification and recovery links in the same browser that requested them. Custom email templates must preserve the provider verification flow. Test email delivery: Supabase's default email service restricts recipients/rate and may require organization-authorized addresses or custom SMTP. Configure SMTP before relying on general delivery.
7. Restart `npm run dev`, create your account, confirm the email, and complete onboarding. Check that refresh and sign-out/sign-in preserve settings. Verify recovery end to end before acceptance.
8. When the Vercel app project is needed, run `npx vercel link` from this checkout and create/link `hagen` without running `vercel` or `vercel --prod`. In Vercel Storage, connect `hagen-dev` to this app's **Development** environment. Add **Preview** only when it is explicitly using disposable development data. Confirm that the integration's variable names match `.env.example`. No public deployment is authorized by milestone 1.

See [Supabase's current Marketplace guide](https://supabase.com/docs/guides/integrations/vercel-marketplace), [SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs), and [SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp). Marketplace projects are created through Vercel's dashboard; the integration synchronizes connection variables to connected app projects.

### Development, preview, and production

| Environment | Database | App origin |
| --- | --- | --- |
| Local development | `hagen-dev` | `http://localhost:3000` |
| Browser test process | Dedicated disposable test project | `http://127.0.0.1:3100` |
| Preview, when introduced | Dedicated development/preview data | Exact preview HTTPS origin |
| Production, later | Separate `hagen-prod` project | Exact production HTTPS origin |

Never attach the production resource to Preview or Development. Set `NEXT_PUBLIC_APP_URL` separately for each deployment and allowlist its callback URLs in the corresponding Supabase project. Do not use a production callback in development or a broad wildcard to unrelated domains. Public variables are in the built browser bundle; redeploy after changing them. This app deliberately requires its own configured origin rather than trusting arbitrary incoming host headers.

Vercel's Next.js framework detection needs no custom adapter or static export. Future build: `npm run build`; start locally with `npm run start`. Select a supported application region near the chosen database during deployment preparation. Production deployment, backup/recovery runbook, and PWA installability belong to milestone 5. No service worker or offline write queue is present. Arrange a Supabase-supported database backup/export before any real production use; a paid automatic-backup entitlement has not been assumed.

## Foundation behavior

- `/login`: email/password registration and sign-in; `/forgot-password` and `/update-password`: provider password recovery through `/auth/callback`.
- `/onboarding`: explicit confirmation of profile and provisional targets, saved in one database transaction. The approximate starting weight remains an assumption, never a weigh-in.
- `/today`: protected mobile shell and real saved targets for the selected diary date. No intake totals, remaining calories, or completed workouts are fabricated. Training is enabled by milestone 3; Progress remains unavailable.
- `/settings`: editable profile, future targets, dated target history, and sign-out. Changing profile inputs does not recalculate targets.
- Initial target values: 2,600 kcal estimated maintenance, 500 kcal requested deficit, 2,100 kcal food, 140 g protein. All are editable; manual food overrides are labelled. These are assumptions, not a measured deficit or a clinical prescription.
- Targets resolve by the latest effective date on or before the requested day in the configured timezone. Updates start tomorrow or later. A second save for the same future date replaces that scheduled target, preserving historical days. Successful requests retain private receipts so delayed retries cannot undo later edits.
- Form values remain on screen after failed requests. Pending submissions are disabled and double submissions are guarded. No localStorage health database, sample history, or fake success state is used.

## Access model and schema types

RLS restricts reads to `auth.uid() = user_id`. Authenticated clients have no direct table write grants; atomic, authenticated RPCs are the only write path. RPCs derive identity from `auth.uid()`, accept no owner parameter, use a fixed empty `search_path`, and validate date/ownership constraints in PostgreSQL. Private idempotency receipts are outside exposed schemas. No privileged runtime key is used. Private routes/actions independently verify the user; Proxy refreshes cookies. Responses are not shared-cacheable.

`src/lib/supabase/database.types.ts` is a hand-authored migration contract, not a claim of generated types. Once the schema is applied, generate actual types using the Supabase CLI, review differences, and update feature-only type imports as needed:

```sh
npx supabase login
npx supabase gen types typescript --project-id YOUR_DEV_PROJECT_REF --schema public > /tmp/hagen-database.types.ts
```

Keep `Profile` as an alias of `Database['public']['Tables']['profiles']['Row']` if replacing the contract with generated output. Never point schema operations or test scripts at production.

## Verification

```sh
npm run test:domain
npm run typecheck
npm run lint
npm test
npm run build
```

The dependency-free `test:domain` runs on Node 24 and covers local dates, DST, leap days, historical target resolution, and manual overrides. Vitest adds input/target-validation tests. A source syntax parse does not substitute for the full type check or build.

### Real database isolation

Use a **dedicated disposable project** with the migration applied and two **fresh confirmed** test accounts. Copy `.env.test.example` to `.env.test`, enter only their credentials, and set `HAGEN_ALLOW_TEST_WRITES=true`. Never commit `.env.test`. The script refuses pre-existing profiles and leaves test records under these disposable accounts for inspection.

```sh
npm run test:db
```

It checks atomic rollback, onboarding, anonymous denial, cross-account reads/updates/deletes/inserts, owner-ID injection, rejection of backdated targets, historical preservation, and delayed duplicate requests. Delete the disposable test accounts after inspection. Use two fresh accounts again on a rerun. Tests use no admin key and cannot delete Auth accounts themselves.

### Browser flows

```sh
npx playwright install chromium webkit
npm run test:e2e
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

Without test provider values, the first run checks the setup screen, protected-route behavior, and 360 px overflow. With `.env.test`, the second run checks real sign-in, onboarding if necessary, profile persistence, failed-save input retention, sign-out, protected access, and re-login. Foundation/Food write to disposable account A; Training also uses B, as described below. Use the database-tested account or another disposable account; the browser flow accepts an existing test profile. Test account credentials are never embedded in source, screenshots, traces, or videos.

Email confirmation/recovery, auth expiry/refresh, target scheduling in the browser, and a real Safari/iPhone check still require explicit verification; existing browser scenarios do not prove those paths. WebKit phone emulation is not a physical iPhone test. Full milestone 1 acceptance requires the provider-backed checks and `npm run check` to pass.

## Project layout

```text
src/app/                 Routes, global styles, loading and failure states
src/features/auth/       Server auth actions and verified-session guards
src/features/profile/    Profile/target forms, validation, and server actions
src/features/forms/      Pending, validation, and failed-save form handling
src/lib/                 Diary dates, target selection, Supabase configuration
supabase/migrations/     Versioned SQL foundation
tests/                   Domain, validation, database, and browser checks
```

Food/Today passed user review. Training source is prepared below; database/browser acceptance is pending. Progress, backup/restore, and PWA features remain unimplemented.


## Milestone 2: food diary and nutrition summaries

The user authorized milestone 2 on 2026-10-18 after confirming foundation save/re-login and password recovery. The user reports Food/Today works after the migration and deployment instructions. The following setup steps remain for fresh checkouts; independent provider/browser checks remain pending. Training was subsequently authorized explicitly.

### Apply the food database update

Apply **only** `supabase/migrations/202610180002_food.sql` to the existing Hagen development Supabase project in SQL Editor. The foundation migration must already be present. This update adds new food tables/functions and preserves existing profiles, targets, and Auth accounts. Run the whole migration once; it is transactional and deliberately does not drop/recreate existing tables. Do not rerun the foundation migration.

On the Mac, copy the new SQL:

```sh
pbcopy < /Users/hassanainaljazzar/Documents/ChatGPT/Hagen/supabase/migrations/202610180002_food.sql
```

Paste into **Supabase → SQL Editor → New query** and Run. If it errors, inspect the error before retrying. The migration notifies PostgREST to refresh its schema. Refresh the app after success. The Food routes and Today show a setup notice when the food tables are absent rather than presenting invented zero totals.

### Publish the source update

No commit, push, or deployment was performed by the agent. This workspace now belongs to the user's GitHub-backed project. Inspect `git status`, then from this folder:

```sh
git add src tests supabase README.md PLAN.md PROGRESS.md
git commit -m "Add food diary and daily nutrition summaries"
git push
```

This also includes the previously uncommitted auth configuration diagnostics and their regression tests. The generated next-env.d.ts may differ after Next type generation; inspect it separately. The GitHub-linked Vercel deployment must finish before the new UI appears online. Do not commit .env.local/.env.test or service keys. Deployment configuration and remote access remain managed by the user.

### What is implemented in source

- `/food`: date navigation, Breakfast/Lunch/Dinner/Snacks, individual entries, explicit delete confirmation, meal-category copy to another date, recent-entry reuse, and diary completion/reopening.
- `/food/entry`: quick total or per-100-g/per-serving entry; date/category, quantity, serving description, preparation, notes, and editing of the entry's saved snapshot.
- `/food/library`: own saved food labels and editable saved meals. Saved meals support 1–50 nutrition items. A diary meal category can be turned into a template, then adjusted before saving.
- `/food/library/log`: log a labelled amount or a fraction/multiple of a saved meal. Database-calculated numeric snapshots retain the values effective at logging time. Changing or removing a definition does not rewrite logged food.
- `/today`: the same real diary totals and historically effective food/protein targets. Remaining values can be negative and are labelled neutrally as amounts over target. Empty incomplete days show unknown intake; explicitly completed empty days are recorded as zero totals.
- Nutrition inputs accept zero, reject blank/negative/non-finite values, and retain up to three label decimal places. Quantity snapshots preserve additional precision when scaling meals. Display formatting does not rewrite stored values.
- Every food write derives ownership from auth.uid(), checks the verified session at the server action, and uses the same per-user transaction lock. Direct client writes are denied. Composite owner foreign keys protect saved-food/saved-meal references.
- Successful requests have idempotency receipts. Same-payload retries return the original result; changed payloads using an already-applied key produce an explicit refresh instruction. Multi-item meal expansion, completion invalidation, and receipts commit together.
- Editing/moving/deleting/inserting diary entries reopens the affected dates atomically. Completion requires a user confirmation and cannot be set for future dates. Account cascade deletion does not recreate diary records.
- Account-scoped unsent food-form drafts use sessionStorage in the current browser tab, when available, and clear on save or when the sign-in screen opens. This is draft retention, not an offline write queue or database. Failure states keep form values and do not claim successful saves.

### Verify food database behavior

`supabase/tests/food.sql` is a complete rollback-only SQL test script for a **disposable test project** with both migrations applied. It creates two synthetic accounts inside one transaction, switches to authenticated and anonymous roles, tests calculations, retry behavior, immutable snapshots, completion/moving/deletion, copies, atomic meal failure, cross-account read/write/attachment denial, anonymous denial, and account-deletion cascades, then rolls back. It sends no email and is not a live-data test. Run the complete script in that test project's SQL Editor. With psql, use `psql -v ON_ERROR_STOP=1 -f supabase/tests/food.sql` against the disposable test database. The success row is emitted only inside the healthy test transaction, before rollback.

This SQL suite has **not been executed** in the authoring session: no test database is configured and the local Docker engine is stopped. Do not treat source inspection as a passing database isolation test. Reconcile generated database types after applying both migrations; the checked-in contract remains hand-authored.

### Verify browser behavior

The Playwright food scenario covers create/edit/delete, reload, draft retention across navigation, failed-network retention/retry, diary completion invalidation, meal-category copying, saved-food scaling, immutable logged snapshots, and phone-width overflow. It requires the disposable `.env.test` provider and the food migration. Synthetic food records remain only in disposable account A for inspection; delete the test account afterward. The existing foundation database suite still requires fresh accounts for reruns.

```sh
npm run typecheck
npm run lint
npm test
npm run test:domain
npm run build -- --webpack
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

At the milestone 2 handoff, the authoring session passed type checking, lint, 42 Vitest cases, 5 native-domain cases, and the supported webpack production build. Playwright discovers all 6 configured browser scenarios, but execution is blocked by `listen EPERM 127.0.0.1:3100` before opening a browser. No mobile layout, physical iPhone, real food database write, or two-account SQL result was verified by the agent. Default Turbopack is separately blocked by the same session port restriction. Do not run type generation and build concurrently because both write `.next`.

For user review after deployment: log a real label/quick entry, compare Food and Today, refresh, mark a diary complete, edit one entry and confirm it reopens, reuse/copy a meal, edit a saved definition and confirm previous logs stay unchanged. Milestone 2 user review subsequently passed; automated provider checks remain pending. Record additional results in PROGRESS.md.

## Milestone 3: training

Training was authorized by the user’s “lets start” on 2026-10-18. Source is prepared for review, with no agent-applied hosted migration, commit, push, or deployment. Full acceptance requires working database flows and user review.

### Enable Training in your existing app

1. Keep the existing foundation and food migrations. Apply **only** the new migration once, as a complete script, in your existing development Supabase project’s **SQL Editor → New query → Run**:

   ```sh
   pbcopy < /Users/hassanainaljazzar/Documents/ChatGPT/Hagen/supabase/migrations/202610180003_training.sql
   ```

   This adds training tables/functions and preserves existing Auth, profile, target and food data. If it errors, inspect the error before retrying. Do not rerun either earlier migration.

2. Review and publish through your existing GitHub/Vercel workflow:

   ```sh
   git add src tests supabase README.md PLAN.md PROGRESS.md
   git commit -m "Add training routines and workout logging"
   git push
   ```

   Inspect generated next-env.d.ts changes separately. No new environment variable or service is required. Wait for Vercel deployment success, then reload.

3. Open **Training → Set up your routine**, review the prefilled week/exercises, and save. The first version can begin today; further revisions begin tomorrow or later. Routine creation never invents completed exercise records.

### Behavior and data decisions

- Training shows a selected day and two-week schedule preview. The initial week repeats: Monday/Thursday strength; Tuesday/Wednesday 20-minute walks; Friday easy; Saturday 25-minute walk (editable to 30); Sunday rest/gentle movement.
- Strength keeps the five prescribed exercises, five-minute warm-up, 60–90-second rest, two or three reps in reserve and starting with one set. Edit names, instructions, planned sets/reps, starting variations and per-side convention, as well as weekday activities/minutes.
- Immutable effective-dated routine versions contain ordered JSON prescriptions. A later revision on the same effective date wins for unopened sessions. A revision scheduled for a later date still takes over then. The editor identifies the latest saved version; date/fortnight views resolve the version effective on each date.
- Explicitly opening creates one unique owner/date session and materializes independent exercise/set snapshots. GET requests create no records. Future dates are preview-only; dates before the first routine have no plan. Opened sessions retain their prescription when later versions change.
- Start, finish, skip and confirmed reopen are explicit transitions. Save actual reps, optional weight, resistance description, performed variation and per-side convention. Completed per-side sets require both counts. Unknown reps remain null; zero is explicit. Finishing never marks unfinished sets done.
- Previous performance is labelled as the previous completed strength session, showing actually recorded variation, reps by side, weights and completion. Missing performance is stated.
- Notes, optional effort and discomfort persist. Closed sessions require confirmed reopening before edits. Optimistic revisions reject conflicting exercise/note/status/cardio edits. Stale tab drafts require review/discard before saving.
- A server-generated rest deadline persists. The visible timer recalculates from timestamps on ticks, visibility changes, refresh and page return. No background alarm is promised. Duplicate timer retries retain the original deadline. Finish/skip clears rest.
- Walking/jogging logs have actual minutes, optional distance/effort, notes/discomfort and edit/delete. A scheduled walk requires saved actual duration before completion. Its one linked cardio record is counted once; planned minutes are never added. Additional unlinked movement is explicitly separate. No GPS/wearables or calorie-burn estimates.
- Today shows the same dated activity status and recorded movement. Settings links to future-routine editing. Food works while the training migration is absent; Training shows a migration notice.
- Writes derive ownership from verified authentication and auth.uid(), serialize per owner, and atomically commit changes with payload-bound receipts. Public tables allow owner-only reads and no direct authenticated writes. Composite owner foreign keys protect routine/session/exercise/cardio links. No admin key is used.
- Unsent inputs stay in this tab’s account/form-scoped sessionStorage and clear after save or on login. Save each form explicitly; finishing does not submit other forms. Tab input is neither an offline write queue nor a saved diary record.

### Training verification

Run standard checks sequentially; type generation and build both write .next:

```sh
npm run typecheck
npm run lint
npm test
npm run test:domain
npm run build -- --webpack
npm run test:e2e -- --list
```

Current results: type check, lint, 62 Vitest tests, 5 native domain tests and the webpack production build pass. Playwright discovers 10 scenarios across mobile Chromium/WebKit. Actual execution is blocked before browser launch by listen EPERM on 127.0.0.1:3100; no rendered mobile or physical-iPhone verification is claimed.

Apply all three migrations in a **disposable Supabase test project**, then run the entire supabase/tests/training.sql there. With psql, use the command below against that test database:

```sh
psql -v ON_ERROR_STOP=1 -f supabase/tests/training.sql
```

It uses synthetic accounts in one rollback transaction to test retries, changed-payload rejection, unique sessions, atomic partial-set saves, per-side validation, stale revisions, timer deadlines/retries, complete/skip/reopen, unchanged snapshots, walking CRUD and linked-log uniqueness, account read/write/attachment isolation, owner FKs, anonymous denial and account deletion. This SQL suite has **not run** here: no test provider or local PostgreSQL service is available. Generate and reconcile actual database types after migration; the checked-in contract remains hand-authored.

Provider browser tests:

```sh
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

Use all migrations, HAGEN_ALLOW_TEST_WRITES=true and confirmed disposable A/B credentials. Training seeds an all-strength routine for A and all-walk routine for B when each has no routine. Existing profiles are accepted; unrelated existing routines are unsuitable. Use fresh accounts for a new test date; same-date reruns can reuse the seeded accounts. Browser records remain for inspection; delete the disposable Auth accounts afterward. The foundation database script independently requires fresh accounts and refuses existing profiles.

Training scenarios cover save/retry/input retention, per-side set persistence after reload, Today resume, persisted timer refresh/simulated elapsed time, notes/discomfort, complete/reopen/skip, sign-out/re-login, walking duration, routine changes preserving a session, extra movement CRUD and phone-width overflow. These are prepared tests, not passing provider results.

User review: save the routine; start strength; save reps and a variation; refresh/resume; start a timer and background/return; finish with an unchecked set and verify it remains unfinished; reopen/skip and check Today; log walking/discomfort and verify after re-login; edit tomorrow’s routine and verify today’s prescription is unchanged. Stop for milestone 3 review before Progress.
