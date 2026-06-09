# Cert Study App — Build Notes

## Project Overview
A personal command center combining a study platform for CCNA, CompTIA Network+, and Security+ certifications with a life tracking hub for health, fitness, and wellness.

## Tech Stack
- **Frontend:** Next.js 16.2.7 (App Router, `src/` directory, Turbopack)
- **Backend:** Supabase (PostgreSQL + RLS)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Hosting:** Vercel
- **Version Control:** GitHub
- **Styling:** Inline styles only — no Tailwind classes in JSX

## Architecture
- **Home Page** — morning brief snapshot, two-door navigation into Study Hub and Life Hub
- **Study Hub** — all cert studying features
- **Life Hub** — health, fitness, and nutrition tracking
- **Correlation Engine** — AI-powered insights connecting both hubs (planned)

## Color Theme — Villainous Dark
- Background: #0D0D0D
- Surface/Cards: #1A1A1A
- Border/Dividers: #2A2A2A
- Primary Accent: #0080FF — Electric Blue
- Secondary Accent: #7B2FBE — Dark Purple
- Text Primary: #E8E8E8
- Text Secondary: #888888
- Success: #2ECC71 — Green
- Error/Weak: #CC0000 — Crimson Red
- Warning/Average: #F1C40F — Gold

---

## Session Rules
- **After every commit/push:** give the user the pull command in a code block:
  ```
  git pull origin claude/adoring-shannon-sTxW8
  ```
- **Update both CLAUDE.md and build-notes.md** in the same commit as any feature or fix — not just at the end of a session
- **After every change or fix, provide a brief summary covering:**
  1. What the problem was (or what was requested)
  2. What was changed (files/logic updated)
  3. What to test to confirm it works correctly
- **Phase log format:** newest phase at the top, each phase labeled `### Phase N - Complete`, bullet points only — no sub-headers inside a phase entry

---

## Active Branch
`claude/adoring-shannon-sTxW8`

---

## Database Tables
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question — cert, topic, correct flag, timestamp, question_snapshot (JSONB for wrong answers), learned_at |
| `topic_performance` | Aggregated accuracy per cert+topic — drives spaced repetition and weak domain features |
| `test_sessions` | Completed test records — cert, mode, score_pct, correct, total_questions, duration_seconds, completed_at |
| `paused_tests` | In-progress tests saved as JSON with full state for resume |
| `question_templates` | Template library with variable_sets and is_retired flag |
| `bookmarked_questions` | Bookmarks with reason, notes, and full question snapshot |
| `flagged_questions` | User-reported question issues |
| `profiles` | User display name, exam_dates JSONB, daily_goal INT, default_cert TEXT |
| `lab_progress` | Completed lab steps per user (user_id, lab_set_id, lab_id, step_id, completed_at) |
| `lab_notes` | Per-lab freeform notes per user (user_id, lab_set_id, lab_id, notes, updated_at) |
| `lab_timers` | Per-lab timer state — elapsed_seconds, is_running, last_started_at; unique per user+lab |
| `flashcards` | Generated flashcard decks — saved permanently per cert |
| `flashcard_progress` | Per-card mastery state: mastered flag, consecutive_correct count |
| `google_health_tokens` | OAuth tokens for Google Health API — access_token, refresh_token, expires_at, last_synced_at; one row per user |
| `health_steps_hourly` | Cached step counts — one row per user/date/hour (EST) |
| `health_heart_rate_daily` | Cached daily HR — avg_bpm, min_bpm, max_bpm per user/date |
| `health_sleep_sessions` | Cached sleep sessions — stages JSONB, timeline JSONB, is_nap; keyed by Google session_id |
| `exercises` | Exercise library — name, body_part, equipment, target, secondary_muscles[], instructions[], gif_url (nullable) |
| `workout_profiles` | User's fitness profile — experience, goal, days_per_week, fitness stats, equipment, limitations, available_weights |
| `workout_plans` | AI-generated weekly plans — plan JSONB (7 day objects), plan_notes, progression_notes, schedule JSONB, is_active |

---

## Future Features

### Security
- Two-factor authentication (placeholder exists in Settings → Security section)
- Password change from within the app

### Study Hub
- More concept cards in Study Mode
- Exam countdown timer with target date
- Advanced CCNA lab set (spanning tree deep dive, advanced OSPF, BGP intro)
- PWA conversion (add to home screen, offline support)

### Life Hub — Health
- **Heart Rate Tracker page** — hourly HR chart, resting HR, peak HR, zone breakdown (Rest/Fat Burn/Cardio/Peak)
- **Vercel Cron Job auto-sync** — scheduled server-side job syncing Google Health data every 30–60 min without user loading the page
- **Health Overview wiring** — connect landing page cards with live Supabase data
- **Weekly/monthly sleep trends** — avg sleep per night over 7/30 days, trend line, goal line (8h)

### Life Hub — Nutrition
- **Food logging** — calories, macros, micronutrients (B12, magnesium, potassium, vitamin D, iron, zinc, calcium, omega-3, fiber, sodium) tracked against RDVs
- **Barcode scanner** — scan packaging via phone camera, auto-populate from Open Food Facts; preview before saving
- **Manual food entry** — full nutrition fields form when no barcode available
- **My Foods library** — personal library of frequently eaten foods, organized by category, one-tap logging
- **Daily nutrition dashboard** — calories vs goal, macro ring charts, meal history, micronutrient progress bars
- **Nutrition history** — past days/weeks, average macros, trend charts
- **Supplement tracker** — log daily supplements, mark taken/skipped, streak and calendar heatmap
- **Supplement encyclopedia** — AI-generated profiles: benefits, dose, timing, interactions, food sources
- **Vitamin/nutrient encyclopedia** — searchable AI-generated reference per nutrient

### Life Hub — Workouts
- **Post-workout logging** — "Start Workout" → log sets/reps/weight per exercise → "Complete Workout" triggers AI check-in
- **Workout history** — past sessions, volume over time, PRs per exercise
- **Yoga & stretching planner** — AI-generated weekly yoga/stretching plan with poses and form tips
- **Stretching library** — organized by muscle group; click to open popup with photo, hold duration, form tips

### Goals & Body Metrics
- **Goals page** — input personal goals (build muscle / lose weight / improve sleep / etc.); AI guidance and actionable recommendations
- **Body metrics profile** — height, weight, sex, body type, age; used to calculate personalized calorie targets and macro ratios
- **Goal progress tracking** — track body weight over time, compare against goal, show trend

### Correlation Engine
- **Daily snapshots** — background job saves combined study + health data to Supabase daily
- **AI insights** — Claude surfaces patterns (e.g. "test scores 12% higher after 7+ hours sleep")
- **Correlation charts** — scatter plots / trend lines: study score vs sleep, steps, protein, HR
- **Morning brief page** — daily summary: yesterday's health snapshot + today's study recommendation

---

## Phase Log
*(Newest phase first)*

### Phase 29 - Complete
Shared flashcard decks + owner-only generation:
- Flashcard decks are now shared across all users — cards are stored once (by the owner) and readable by everyone
- Supabase RLS updated: `flashcards` SELECT policy changed to `true` (all authenticated users); write operations still require `auth.uid() = user_id`
- `generate-flashcards/route.js`: owner-only gate (403 for non-owner); dedup check now queries all cards for that cert, not just owner's
- `generate-templates/route.js`: owner-only gate (403 for non-owner)
- `flashcards/page.js`: Generate Deck and Add 40 More buttons only render for the owner; non-owners see "No cards yet — check back soon" when deck is empty
- `templates/page.js`: Generate Templates panel only renders for the owner; coverage table still visible to all
- Reset route updated: per-cert and all_study resets now only delete `flashcard_progress` (user's own progress), never touch the shared `flashcards` table
- Settings descriptions updated to say "flashcard progress" instead of "flashcards"

### Phase 28 - Complete
Settings — Data & Reset section:
- New section in Settings page between Connected Apps and Security
- Per-cert reset (CCNA / Network+ / Security+): deletes question_answers, topic_performance, test_sessions, paused_tests, flashcards, flashcard_progress for that cert
- All study data reset: all of the above across all certs + bookmarked_questions + flagged_questions
- Workout plan reset: deletes workout_plans — keeps fitness profile so the user can regenerate a plan without redoing setup
- Full workout reset: deletes workout_plans + workout_profiles — returns user to the 7-step setup on next visit
- All resets require a confirmation modal (⚠️) with explicit "Yes, Reset" button — cannot be triggered accidentally
- Success/error message displayed inline after completion
- New API route: POST /api/reset with { scope, cert? }
- Pattern established: as new Life Hub sections are added, their reset row gets added here with the same button style

### Phase 27 - Complete
AI Workout Plan Generator + Cardio System:
- 7-step onboarding: experience, goals (multi-select), days per week, schedule (pick actual days), fitness check ("please try"), cardio preferences, equipment + limitations
- Multi-select goals: muscle, weight_loss, fitness, endurance — stored as comma-separated string
- Cardio preferences step: walk, jump_rope, bike, stair_climb, hiit, shadow_boxing, none (none is mutually exclusive)
- `generate-plan/route.js` — EXERCISE_LIST with pullup_bar/ab_roller equipment flags, filters by available equipment, cardioNote uses only user-selected cardio options
- Plan stored as JSONB in `workout_plans.plan` — array of 7 day objects with day_of_week, exercises[], cardio
- `schedule` JSONB column on `workout_plans` stores workout_days array
- Plan page shows actual days (Mon–Sun) sorted by DAYS_OF_WEEK index
- Day reassignment: dropdown per card, auto-swaps conflicting days, saves to Supabase
- Add Exercise: picker modal → AI check-in (permanent vs one-time) → saves if permanent
- Remove Exercise: × button → AI check-in → removes if permanent
- Add/Change Cardio on rest day cards: picker shows cardio exercises from DB; Remove Cardio option if already set
- 9 cardio exercises in `exercises` table with body_part='cardio'
- Cardio section added to Exercise Library page

### Phase 26 - Complete
Exercise Library (fully rebuilt — ExerciseDB removed):
- `exercises` Supabase table — id, name, body_part, equipment, target, secondary_muscles[], instructions[], gif_url (nullable)
- ExerciseDB/RapidAPI removed — all exercises manually curated
- 34 strength exercises: Arms (12), Back (10), Chest (9), Core (11), Legs (9), Shoulders (8) — dumbbell + bodyweight only
- Exercise images stored in `public/exercises/` as .jfif files served as static assets
- Layout: sticky left muscle-group nav with counts, scrollable grouped sections
- Cards show image thumbnail (140px) or 🏋️ placeholder; click opens detail modal
- Detail modal: full-width image, muscle tags, secondary muscles, numbered instructions, green "WHERE YOU SHOULD FEEL IT" callout, red "DO NOT" callout
- Workouts dropdown in LifeHubSidebar: My Plan + Exercise Library; auto-opens on active routes
- To add new exercises: save image to `public/exercises/`, push, then insert row into `exercises` table via Supabase

### Phase 25 - Complete
Google Health data caching layer:
- 3 new Supabase tables: `health_steps_hourly`, `health_heart_rate_daily`, `health_sleep_sessions`
- `last_synced_at` added to `google_health_tokens`
- GET `/api/health/sync` reads from Supabase cache only — sub-100ms page loads
- POST `/api/health/sync` fetches from Google API and writes to cache (incremental: only since last sync - 1hr overlap; first sync = 30 days back)
- All three health pages load cache instantly on mount, then auto-background-sync if data is >15 min stale
- Refresh button calls POST then re-fetches GET
- Sleep stages parsed from `sleep.stages[]` array and `sleep.summary.stagesSummary`; longest session selected as main sleep
- Steps pagination fixed: early-exit once data older than needed range

### Phase 24 - Complete
Step Tracker and Sleep Tracker pages:
- Step Tracker (`/life-hub/health/steps`): Today / Yesterday / Week tabs, hourly bar chart (24 bars EST), goal progress bar, summary cards (Total Steps, Peak Hour, Progress %), week view with 7-day chart; hover tooltips use `position: fixed` — no layout shift
- Sleep Tracker (`/life-hub/health/sleep`): summary cards (Total/Deep/REM/Light), stage breakdown proportional bar, full timeline chart, correct "no sleep data" (😴) state
- Health sidebar dropdown: "Health" nav item now toggles sub-items (Overview / Step Tracker / Sleep Tracker), auto-opens on any `/life-hub/health` path

### Phase 23 - Complete
Google Health API integration (Life Hub):
- Google Cloud project created, Google Health API enabled, OAuth 2.0 credentials configured
- Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`, `googlehealth.sleep.readonly`
- API routes: `/api/health/connect`, `/api/health/callback`, `/api/health/status`, `/api/health/disconnect`, `/api/health/sync`
- Connect flow restricted to owner account only (`sethproper40@yahoo.com`) — 403 for all others
- Settings → Connected Apps section: shows connection status, Connect/Disconnect buttons
- Life Hub → Health page: shows live steps today (goal bar), avg heart rate, sleep last night; Refresh button; sleep shows `—` when watch not worn

### Phase 22 - Complete
Settings Study Preferences + live home page:
- Settings → Study Preferences: target exam date per cert (date picker, color-coded days-remaining preview), daily question goal (10/20/30/50), default cert selector — all saved to `profiles` table (new columns: `exam_dates JSONB`, `daily_goal INT`, `default_cert TEXT`)
- Home page: cert score cards pull real predicted scores from `topic_performance`; exam countdown chips (color-coded by urgency); today's question count chip; hardcoded placeholder scores removed

### Phase 21 - Complete
Mark as Learned, Lab Completion Summary, and AI Documentation Feedback:
- Mark as Learned: `learned_at TIMESTAMPTZ` column on `question_answers`; purple "✓ Mark as Learned" button in practice mode for wrong-answer-review questions; one click sets learned_at via PATCH; button turns green + disabled; question never appears in future reviews
- Lab Completion Summary: "Complete Lab — Get Summary" button enabled only when all steps checked AND all document textarea fields filled; calls POST `/api/lab-summary`; returns 3-section AI summary (What You Built / Key Concepts Practiced / Keep Practicing) in a modal
- AI Documentation Feedback: Save button on DOCUMENT YOUR WORK textarea calls POST `/api/lab-doc-feedback`; returns 1–3 sentences of specific feedback shown inline with 🤖 icon; onBlur no longer auto-saves (explicit save only)

### Phase 20 - Complete
Wrong Answer Review + Per-Lab Timer:
- Wrong Answer Review: `question_snapshot` JSONB column (nullable) added to `question_answers` — populated only for incorrect answers; `/api/wrong-answers?cert=X` deduplicates by question text; card on Take a Test setup lets user select cert, see count, and start a practice session from their wrong answers; tutor chat, bookmarks, and explanations all active
- Per-Lab Timer: `lab_timers` Supabase table; `LabTimer.js` component in lab page header with Start/Pause/Reset; persistent across page refresh using `last_started_at` trick; green when running

### Phase 19 - Complete
Multi-feature expansion — contextual panels, new lab sets, and smart study tools:
- IOS Command Reference: `/study-hub/labs/commands` — ~90 commands, 10 categories, search + filter; exports `IOS_COMMANDS`; `FloatingCommandPanel.js` on every individual lab page
- Floating Reference Panel: `FloatingReferencePanel.js` on test page, practice mode only, cert-filtered (CCNA: subnetting; N+: ports/OSI; S+: attacks/encryption)
- Flashcard Weak Domain Section: below cert cards on flashcards landing — up to 6 domains <65% accuracy, accuracy bar, cert badge, direct session link
- Labs landing: per-lab completion dots + completion count per set; lab set overview highlights weak-domain labs with yellow border + "🎯 Weak Area" badge
- Network+ Fundamentals lab set (5 labs): Topology Docs, VLAN + Inter-VLAN Routing, Wireless WPA2, Troubleshooting (OSI 7-layer method), Port Security
- Security+ Network Labs (4 labs): ACL Firewall, DMZ Three-Zone Design, Device Hardening (SSH v2/encrypted passwords/rate limiting), Network Segmentation (VLANs by trust level)
- Network+ Lab 4 (Troubleshooting) rewritten: explicit 7-step build-then-break-then-fix format
- Topology rendering: auto-computes `viewBox`; accepts old (`connections`) and new (`links`) formats; dark pill label backgrounds; IP/DG in green; labels at 33%/67% along lines with 20px offset
- Lab set overview domain tags: accuracy % + color-coded strength indicators (▼ red weak / ◆ yellow avg / ▲ green strong)

### Phase 18 - Complete
Per-step documentation + Small Office Network lab set:
- Every lab step has a `document` array — 2–3 prompts teaching real-world documentation habits; textarea auto-saves to localStorage on blur; storage key: `lab_step_doc_${setId}_${labId}_${stepId}`
- Small Office Network Series (5 labs, 27 steps): Labs 1–4 share base topology (1 router, 3 switches, 9 PCs) — VLANs → DHCP → STP redundancy → ACLs; Lab 5 full-office build capstone
- Packet Tracer Tips & Tricks page at `/study-hub/labs/tips` — 50+ tips, 8 categories, expandable cards

### Phase 17 - Complete
Packet Tracer Labs section:
- Labs landing, lab set overview, and individual lab pages built
- SVG topology renderer (`LabTopology.js`): router, switch, PC, server, cloud icons; trunk/access/redundant line styles
- Step cards: IOS command blocks with copy button, verification commands, expected output, progressive hint reveal, pro tips, notes textarea
- Step completion → `lab_progress` table; notes → `lab_notes` table; Prev/Next navigation
- Data-driven: one JS file per lab set in `src/data/labs/` — zero UI changes to add new sets
- First lab set: CCNA Fundamentals — 8 labs (VLANs/Router-on-a-Stick, DHCP, STP, ACLs, SSH, OSPF, NAT/PAT, Capstone), 49 steps

### Phase 16 - Complete
Floating Claude chat bubble:
- 💬 bubble fixed bottom-right on every Study Hub page (mounted in `study-hub/layout.js`)
- Opens 360×520px panel — full conversation history, Clear button, starter suggestions
- Light markdown rendering: bold, inline code, code blocks, bullets
- API route `/api/chat` — multi-turn, system prompt tuned for cert study help; session-only history

### Phase 15 - Complete
Mixed — All Certs test mode:
- "Mixed — All Certs" option in cert selector; domains locked to shared overlap topics across all 3 certs
- 3 parallel API calls, shuffled results; Real Exam mode disabled; saved as `cert = 'mixed'`
- Progress page and Results page include Mixed as a 4th cert (green)

### Phase 14 - Complete
Cert Guide page — 5-tab reference hub:
- Overview (cert cards + domain weight bars), Overlap (shared topics + study tips), Exam Details (logistics per cert), Career & Value (job roles, salary, DoD 8570/8140), Study Roadmap (3 paths, time estimates)

### Phase 13 - Complete
Flashcards feature:
- Landing page with per-cert deck stats (mastered / learning / unlearned, mastery bar)
- Generate Deck (60 cards) and Add 40 More Cards via `/api/generate-flashcards`
- Per-cert study session pages via `StudySession.js`; mastery tracked in `flashcards` + `flashcard_progress` tables

### Phase 12 - Complete
Progress page analytics + study tools:
- Total Study Time stat on Progress page — sums `duration_seconds` from `test_sessions`
- Predicted Exam Score on each cert page — weighted average by official domain percentages, requires ≥5 questions per domain
- Fix My Weaknesses mode — auto-selects cert + domains with most <65% accuracy
- Discard button on Return to Test banner
- `duration_seconds` column added to `test_sessions`

### Phase 11 - Complete
Progress page fully built:
- Top stats: total questions, avg score, best score, day streak
- Score Over Time SVG chart: color-coded lines per cert, 82.5% dashed threshold
- Questions Per Day bar chart: last 30 days, green ≥30, blue 1–29, grey 0
- Domain Accuracy Heatmap: all domains across all certs, filterable by cert tab, weakest→strongest

### Phase 10 - Complete
Results page improvements:
- Mode badge per result row: Practice (blue), Simulation (yellow), Real Exam (red)

### Phase 9 - Complete
Pause/resume reliability fixes:
- Sidebar confirm dialog intercepts link clicks during active test
- localStorage snapshot written on every state change; cleared on complete/pause/resume/"Take Another Test"
- Fixed race condition with snapshot deletion on mount; fixed stale banner state

### Phase 8 - Complete
Progress, analytics, and study tools:
- Daily streak tracker — 30q/day goal, 28-day calendar heatmap
- Per-domain score trend — SVG line chart, 80% threshold, ▲/▼ indicator
- Recommended Focus panel on each cert page
- Study Mode — concept card → per-domain practice question, bookmark support
- Reference Sheets — subnetting, IOS commands, port numbers, OSI, attack types, encryption, compliance frameworks
- Bookmarks — save with reason (🔥/🤔/📢/⭐) and notes; bookmarks page with cert tabs, reason badges, expandable view

### Phase 7 - Complete
Template system and library management:
- AI template generation with `{{placeholder}}` variables and `variable_sets`
- Hybrid generation: template pool first, AI supplements remainder; count bar in test header
- Generate 5 per batch (locked at 5 — higher counts caused API/JSON truncation crashes)
- Pre-made Templates page: Browse / Duplicates / Approved Similar / Retired tabs
- Duplicate detection via Jaccard word-overlap ≥50%; approved pairs stored in localStorage

### Phase 6 - Complete
Core study features:
- AI question generation per cert, domain, difficulty via `/api/generate-questions`
- Three test modes: Practice (immediate feedback), Simulation (submit at end), Real Exam (timed)
- Real exam timer: CCNA 120min/110q, N+/S+ 90min/90q
- Pause/resume via `paused_tests` table; navigate-away confirm dialog; `beforeunload` warning
- In-context tutor chat per question (practice mode only)
- Keyboard shortcuts: 1–4 select answers, Enter submit/advance
- Performance tracking to `question_answers` and `topic_performance`; spaced repetition via accuracy multipliers
- Flagged questions — report bad/incorrect questions

### Phase 5 - Complete
Authentication: login, signup, protected routes, user sessions via Supabase Auth.

### Phase 4 - Complete
Villainous dark theme + app shell:
- globals.css with CSS variables, sidebar (CSA logo, nav links, user avatar), cert detail pages with domain topic buckets
- Full architecture shell: Study Hub shells (Take a Test, Study Mode, Progress, Results, Settings), Home page two-door morning brief, Life Hub shells (Health, Nutrition, Workouts, Sleep)

### Phase 3 - Complete
Supabase project created (US West), `.env.local` with URL and anon key, connection via `src/lib/supabase.js`.

### Phase 2 - Complete
Next.js initialized (Tailwind, App Router, src/ directory), running at localhost:3000, pushed to private GitHub.

### Phase 1 - Complete
Node.js v24.16.0, NPM v11.13.0, VS Code installed. GitHub, Supabase, Vercel, and Anthropic API accounts created. Anthropic API funded with $20.
