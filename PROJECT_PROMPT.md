# Build my personal fitness and calorie-tracking app

You are my senior full-stack engineer and product collaborator. Build a fully functional, mobile-first Next.js web app that I will actually use to follow my exercise routine, log food, maintain a calorie deficit (عجز السعرات), and review progress with my trainer.

This is a working personal tool, not a landing page, dashboard mockup, or UI-only prototype. Build it section by section. Plan first, implement one agreed milestone, verify it, show me the result, and wait for my review before starting the next milestone.

## 1. My situation and the product goal

- I exercise at home and can walk, jog, or run outdoors. Start with the beginner strength-and-walking plan below.
- My approximate weight is 90 kg; it is not a verified current measurement. Height: 180 cm. Age used in the earlier calculation: 20. The earlier estimate used the male equation. Let me confirm or edit these inputs during onboarding.
- My ankle currently feels fine. Let me record discomfort if it develops.
- Initial estimated maintenance: 2,600 kcal/day. Requested estimated deficit: 500 kcal/day. Initial food target: 2,100 kcal/day. Initial protein target: 140 g/day.
- These are provisional starting values, not measured metabolism or a guaranteed actual deficit. Preserve them as editable plan settings. Do not automatically prescribe lower calories or change my exercise plan.
- Units: kcal, grams, kilograms, centimetres, kilometres, minutes. English interface initially. Use my configured timezone, initially Europe/Brussels.

The main daily questions are: What do I do today? What have I eaten? How many calories and how much protein remain? What did I actually complete? Am I making progress over several weeks?

## 2. How we must work

Use an iterative engineering workflow: clarify requirements, plan a small working feature, implement it through the interface and database, verify it, review it, and then continue.

Your FIRST RESPONSE must be planning only. Do not scaffold or implement yet. If repository access is available, inspect its structure, package versions, existing work, and applicable AGENTS.md instructions. Then provide:

1. Your understanding of the app and its essential user journeys.
2. A concise architecture and dependency recommendation, with tradeoffs that affect this project.
3. The main data entities and relationships.
4. A milestone checklist with acceptance criteria and a proposed first milestone.
5. Only the questions that genuinely block starting, such as whether a repository or database project already exists.

Then wait for me to approve or amend the plan. Do not turn planning into a long questionnaire; use the defaults in this prompt for ordinary choices.

For EACH approved milestone:

1. Briefly state its scope and acceptance criteria.
2. Implement only that milestone and its necessary dependencies, including persistence, validation, access control, and interface states.
3. Run the relevant checks and fix problems within that scope.
4. Explain what works, what changed, how to run and inspect it, and which checks actually passed.
5. Update the project progress file and stop for my review. Continue when I say the milestone is accepted or ask for the next one.

Do not implement later sections early, rewrite unrelated working code, introduce speculative infrastructure, or call unfinished work complete. Keep future navigation hidden or visibly unavailable until implemented. Temporary test fixtures must never appear as my real health history.

## 3. Engineering approach and skills

Apply requirements analysis, mobile interaction design, accessible frontend development, relational data modelling, secure backend development, testing, debugging, and deployment preparation. If relevant coding/design/testing skills are available in your environment, read and follow them. Do not invent installed skills or claim to have used tools you did not run. Use primary documentation matching the installed versions.

Preferred stack for a new project:

- Current stable Next.js with App Router, React, TypeScript in strict mode, and Tailwind CSS. Verify current compatibility before installing and commit a dependency lockfile.
- Vercel for hosting the Next.js application, with Supabase PostgreSQL and Supabase Auth provisioned through Vercel Marketplace. This is a Supabase-managed database connected to Vercel, not a separate first-party Vercel Postgres database. Use Supabase's current supported Next.js server-side integration. Reuse an existing suitable Supabase project rather than create a duplicate.
- Zod or the existing equivalent for server-side input validation.
- Vitest for calculation and domain tests; Playwright for critical browser workflows.
- A small chart library only when it adds value. Use existing accessible components where appropriate.

Do not add a separate Express server, a second database layer, microservices, an AI service, or a large state-management framework without a concrete need. If an existing project already has suitable choices, preserve them and explain any proposed changes.

Use Server Components for suitable reads and Client Components for interactive forms, timers, and browser APIs. Keep database access and shared calculations in clear modules. Use Server Actions or Route Handlers as appropriate; validate and authorize every server mutation. Keep secrets and privileged database keys out of client code and source control.

Use the Marketplace integration to connect the project and configure its environment variables. Keep development/preview data separate from production records; a preview deployment must not accidentally modify my live diary. Do not use Vercel Blob, deployment files, or a function's temporary filesystem as the relational database. File uploads are outside the first version. Prefer an available European database region and a nearby application execution region; verify current availability, free-tier limits, and any costs before proposing paid services.

Protect every user's records with ownership checks and database Row Level Security. Verify identity using the auth provider's current supported server method; do not trust a submitted user ID. Prevent user-specific data from leaking through shared caches. Use the current provider guidance for session cookies and refresh handling. Test account isolation even though I am the first user.

Keep code organised around the features. Avoid giant components and premature abstraction. Keep lightweight documentation: README for setup, PLAN.md for milestones and acceptance criteria, and PROGRESS.md for completed work, decisions, blockers, checks, and the next action. On a later session, read those before continuing.

## 4. Navigation and mobile experience

Four primary bottom tabs: Today, Food, Training, Progress. Settings is a secondary screen.

Design for comfortable phone use, starting around 360 px width. Use a calm, clear visual style, readable typography, strong contrast, generous touch targets, safe-area padding, and simple navigation. Keep the layout usable on larger screens too. Prevent horizontal overflow, forms hidden by the keyboard, and bottom navigation covering content. Charts must have readable text summaries.

Every implemented feature needs useful empty, loading, saving, success, and failure states. Use real form labels, accessible dialogs, keyboard navigation, visible focus, and inline validation. Avoid decorative charts, unnecessary animations, social feeds, leaderboards, and streak pressure.

Daily logging should take very few taps. Preserve drafts through ordinary navigation, prevent accidental double submissions, and show whether a save succeeded. Do not silently discard entries after a network failure.

## 5. Today screen

Show the selected date with navigation to earlier dates and an easy return to Today. Display:

- Daily food target, calories logged, and calories remaining.
- Protein logged, target, and remaining.
- Today's scheduled workout or walk and its real status: planned, in progress, completed, or skipped.
- Quick actions for Log food, Start/Resume workout, and Log weight.
- A compact food-logging status: incomplete or marked complete.

Rules:

- Remaining calories = the target effective on that date minus calories logged on that date.
- Example: target 2,100, logged 1,250, remaining 850 kcal.
- If intake is above target, show the actual amount over target neutrally. Do not clamp the calculation to zero or encourage compensatory fasting or exercise.
- Do not add estimated exercise calories back to the food allowance by default. Initial maintenance already assumes light activity.
- Do not display a measured actual deficit or exact fat loss from these estimates.
- Derive totals from the real entries and update all affected views after create, edit, or delete.
- Missing logs are unknown/incomplete, not evidence of zero food intake.

## 6. Food screen and logging workflow

Support Breakfast, Lunch, Dinner, and Snacks, with daily totals and editable entries. The first version needs reliable manual logging; it does not require a paid food API or photo recognition.

Support two clearly labelled entry methods:

1. Quick entry: food/meal name, total kcal, total protein, meal category, and date.
2. Reusable food: nutrition per 100 g or per a clearly defined serving, followed by the amount eaten. Calculate nutrition from that basis without mixing grams and servings.

Include grams/portions as appropriate, raw/cooked preparation labels where relevant, optional notes, and the ability to save a food or meal for reuse. Do not invent food nutrition values. Let me enter values from a label. Save a nutrition snapshot with each logged entry so changing a saved food does not rewrite my history.

Allow creating, editing, deleting, reusing recent foods, copying a meal to another date, and marking a day's diary complete. Make accidental duplicate submissions safe. A copied meal is a separate log. If a completed diary is edited, mark it incomplete again and let me reconfirm it.

Validate quantities and nutrition inputs on the server. Reject invalid numbers and quantities; allow legitimate zero-calorie/zero-protein entries. Use consistent decimal precision and round only for display. Do not require one universal calorie minimum as a substitute for clinical judgement.

## 7. Training screen and workflow

Show a weekly schedule and the selected day's activity. Let me edit the schedule and exercise prescription without rewriting previously completed sessions. Distinguish a workout template from a specific scheduled session and its actual performance.

Initial two-week schedule:

- Monday: home strength.
- Tuesday: 20-minute walk.
- Wednesday: 20-minute walk.
- Thursday: home strength.
- Friday: easy day.
- Saturday: 25–30-minute walk.
- Sunday: rest or gentle movement.

Initial strength session: five minutes of easy warm-up, then chair squat 2 × 8–12, wall/counter incline push-up 2 × 8–12, resistance-band or supported backpack row 2 × 8–12, glute bridge 2 × 10–15, and bird dog 2 × 6 per side. Suggested rest: 60–90 seconds. Keep two or three repetitions in reserve; allow starting with one set.

Each exercise needs concise technique instructions, planned sets/repetitions, actual repetitions per set, resistance/weight where applicable, previous performance, and set completion controls. Record the chosen variation, such as counter push-ups versus wall push-ups. For unilateral movements, make the per-side convention clear.

Include a rest timer, session notes, an optional effort rating, and a pain/discomfort field. Timer correctness must use timestamps rather than assume the browser stays active in the background. Do not promise background alarms unless tested and supported. Save progress so a refresh or ordinary interruption can resume the workout. Skipped and completed sessions must remain distinct; unfinished sets must not automatically become completed.

For walking and later jogging: log duration, optional distance, effort, and notes manually. GPS and wearable integration are not required initially. Never describe calorie expenditure as accurately measured from these manual logs.

## 8. Progress and weekly review

Allow dated weight entries, edits, and deletion, with an optional waist measurement. Show recorded measurements and weekly averages, the number of weigh-ins, and the change between comparable weeks. Do not fabricate missing data or misleadingly compare a partial current week with a full previous week without labelling it.

Add a brief optional daily check-in for sleep hours, hunger, energy, and discomfort/other notes. Missing check-ins remain unknown.

The weekly summary must include:

- Date range, average weight, weigh-in count, and change from the previous comparable period.
- Average calories and protein on completed food-log days, plus how many days were complete. Keep partial days visibly separate; do not average unlogged days as zero.
- Adherence to the targets that actually applied on each date.
- Strength sessions planned/completed/skipped, walking minutes, and meaningful performance changes where available.
- Average recorded sleep, hunger, and energy, with recording coverage and notable discomfort notes.

Provide Copy weekly check-in as plain text that I can paste into a conversation with my trainer, plus a download fallback if clipboard access fails. This is a manual export; do not claim the trainer automatically receives or sees my app data.

Keep suggestions descriptive. Do not automatically reduce calories after a single weigh-in, prescribe harder exercise despite pain, diagnose conditions, or treat an estimated 500-kcal deficit as guaranteed weekly weight loss.

## 9. Settings, data integrity, and privacy

Settings include profile, units/timezone, provisional maintenance estimate, requested deficit, effective-dated food/protein targets, and the exercise schedule. Show calculation assumptions if offering a maintenance calculator. Allow a manual target override and explain how it relates to maintenance and deficit.

Design the schema around profiles, target history, food/saved-meal definitions, food-log nutrition snapshots, diary-completion status, workout templates and scheduled sessions, exercise/set logs, cardio logs, measurements, and check-ins. Add migrations, foreign keys, appropriate indexes, ownership policies, and uniqueness constraints. Create only the tables needed for the current milestone; plan the later relationships first.

Use a date-only field for the intended diary day, and timestamps for events. Group days in the configured timezone, not UTC accidentally. Target changes and template changes should take effect prospectively by default and preserve historical summaries. Make multi-row writes atomic where needed.

Use PostgreSQL as the durable source of truth, not only React state or localStorage. Provide a versioned personal-data JSON export and a validated restore workflow for app-produced exports, with a clear confirmation and duplicate-handling strategy. Make destructive actions explicit. Never log passwords, tokens, or private health notes to public telemetry.

## 10. Milestones and section-by-section delivery

Propose this order unless there is a concrete dependency reason to adjust it:

0. Planning and acceptance criteria only. Wait for my review.
1. Foundation: project setup, Vercel/Supabase Marketplace connection and environment configuration, migrations needed now, account sign-in/sign-out and recovery, profile/target onboarding, protected mobile shell, and settings. Verify persistence and isolation. Prepare deployment configuration without assuming permission to publish publicly.
2. Food + Today calorie summary: complete the food-logging workflow and connect the relevant dashboard cards to real data. The exercise portion can wait for its own milestone.
3. Training: editable routine, scheduled sessions, set logging, rest timer, resume behaviour, cardio logging, and Today activity card.
4. Progress: measurements, daily check-ins, accurate summaries/charts, historical targets, and weekly check-in export.
5. Release readiness: personal-data backup/restore, PWA installation, mobile verification, production configuration, and a deployment runbook.

Split a milestone into smaller reviewable parts if it is too large. Do not build all these milestones in one response. Every implemented section must work through the database before it is called complete.

## 11. Verification and definition of done

Choose meaningful checks for each feature rather than mechanically testing every component. Include:

- Calculation tests for portion scaling, remaining calories, protein totals, historical targets, incomplete logs, weekly averages, and timezone/date boundaries.
- Database/auth checks proving one account cannot read, change, or attach records to another account's data.
- Browser tests for logging/editing/deleting food, accurate dashboard updates after reload, starting/resuming/completing a workout, measurements and weekly export, and the auth flow.
- Failure-path checks for invalid input, duplicate submission, unavailable network, failed saves, and expired sessions where relevant.
- Type checks, lint, relevant tests, and a production build. Use the actual project scripts and version-supported commands.
- Mobile browser inspection, including Safari/iPhone where available. Be honest if only an emulated viewport was tested.

A feature is done when its main workflow and relevant failure states work, data survives refresh and re-login, access controls are enforced, mobile interaction is usable, and relevant checks pass. A button with no action or a fake successful save does not meet that standard.

If credentials, services, network, or tools are missing, identify the precise blocker and provide the smallest setup step. Continue independent work where possible, but do not conceal the blocker behind mocks or report an unrun check as passed.

## 12. PWA, deployment, and scope boundaries

Provide a web manifest, suitable app icons, standalone display, theme metadata, and clear Add to Home Screen guidance. Serve production over HTTPS. Installation does not automatically make the app offline-capable.

For version one, online logging is sufficient. Show connectivity/save errors clearly and retain unsent form input for retry. Do not silently queue background writes or claim offline synchronisation. If any service worker is used, explain its caching scope, avoid caching private authenticated responses indiscriminately, and handle updates/sign-out safely. Full offline logging and conflict resolution require a separately agreed milestone.

Document environment variables in .env.example without secrets; include local setup, migrations, production build/start, Supabase Marketplace provisioning, database/auth redirect configuration, backups, and Vercel deployment steps. Explain preview versus production environment variables and auth redirect URLs. Disclose required external services and distinguish prepared deployment from an actually deployed and verified app. Public publication is a separate decision.

Keep barcode scanning, an external food catalogue, food-photo AI, Apple Health, GPS tracking, social features, subscriptions, and an autonomous AI trainer outside the first version. The first release must fully support the core manual workflows above.

## 13. Primary engineering references

Consult the current documentation for the installed versions rather than blindly copying outdated examples:

- Incremental working-software delivery: https://agilemanifesto.org/principles.html
- Next.js server/client boundaries: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js authentication: https://nextjs.org/docs/app/guides/authentication
- Next.js data security: https://nextjs.org/docs/app/guides/data-security
- Supabase server-side Next.js integration: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Marketplace storage: https://vercel.com/docs/marketplace-storage
- Supabase through Vercel Marketplace: https://supabase.com/docs/guides/integrations/vercel-marketplace
- Next.js Vitest: https://nextjs.org/docs/app/guides/testing/vitest
- Next.js Playwright: https://nextjs.org/docs/app/guides/testing/playwright
- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Accessible forms: https://www.w3.org/WAI/tutorials/forms/

Begin now with milestone 0 only: inspect the available project, propose the architecture and phased plan, identify genuine blockers, and wait for my review before implementation.
