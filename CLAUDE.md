# Cert Study App — CLAUDE.md

## Project Overview
A personal certification study app for CCNA, Network+, and Security+ exam prep. Built with Next.js App Router, Supabase, and the Anthropic Claude API.

**Active branch:** `claude/adoring-shannon-sTxW8`

---

## Tech Stack
- **Framework:** Next.js (App Router, `src/` directory, Turbopack)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Styling:** Inline styles only — no Tailwind. CSS variables throughout (see below)

## CSS Variables
```
var(--accent-blue)        primary brand blue
var(--surface)            card/panel background
var(--background)         page background
var(--border)             border color
var(--text-primary)       main text
var(--text-secondary)     muted text
var(--success)            green
var(--warning)            yellow/orange
var(--error)              red
var(--error-border)       red border variant
var(--accent-purple)      #a78bfa
```

---

## Key Rules
- **Inline styles only** in JSX — never Tailwind classes
- **No comments** unless the WHY is non-obvious
- **Security:** `ANTHROPIC_API_KEY` is secret, never share. Only `NEXT_PUBLIC_` Supabase keys are safe.
- Mobile responsive via `@media (max-width: 768px)` CSS

---

## Session Rules

### Pull Command (always give this after every push — as a code block so it's copyable)
```
git pull origin claude/adoring-shannon-sTxW8
```

### MD Notes — Required Before Every Push
Both `CLAUDE.md` and `build-notes.md` must be updated in the **same commit** as any feature or fix. Specifically:
- **CLAUDE.md:** update directory structure if files added/removed, update relevant feature section, update lab set counts/step counts if labs changed
- **build-notes.md:** add new phase entry at the top of the Phase Log, update Database Tables if schema changed, remove completed items from Future Features

### After Every Change or Fix
Always provide a brief summary covering:
1. **What the problem was** (or what was requested)
2. **What was changed** (files/logic updated)
3. **What to test** to confirm it works correctly

---

## Directory Structure
```
src/
  app/
    api/
      reset/route.js                   POST — scoped data reset (cert, all_study, workout_plan, workout_profile)
      bookmarks/route.js               CRUD for bookmarked questions
      generate-questions/route.js      AI question generation (spaced repetition weighting)
      generate-templates/route.js      AI template generation (batch of 5, dedup)
      test-chat/route.js               Tutor chat during practice tests
      chat/route.js                    General study chat (FloatingChat component)
      wrong-answers/route.js           GET wrong answers by cert (deduped by question text)
      lab-doc-feedback/route.js        AI feedback on step documentation textarea
      lab-summary/route.js             AI lab completion summary (3 sections)
      health/
        connect/route.js               Initiates Google Health OAuth (owner account only)
        callback/route.js              Handles OAuth callback, saves tokens
        status/route.js                Checks if Google Health is connected
        sync/route.js                  GET = read cache; POST = fetch from Google + write cache
        disconnect/route.js            Removes stored tokens
      workouts/
        generate-plan/route.js         AI workout plan generator — filters by equipment, cardio from user-selected options only
    life-hub/
      layout.js                        Life Hub layout with LifeHubSidebar
      page.js                          Life Hub landing
      health/
        page.js                        Health Overview — steps today, avg heart rate, sleep last night
        steps/page.js                  Step Tracker — hourly/weekly bar charts, goal progress, fixed tooltip
        sleep/page.js                  Sleep Tracker — stage breakdown bar, timeline chart, no-data state
      workouts/
        page.js                        My Workout Plan — weekly plan cards sorted Mon-Sun, day reassignment, add/remove exercises with AI check-in, add/change cardio on rest days
        setup/page.js                  7-step onboarding: experience, goals (multi-select), days, schedule, fitness check, cardio preferences, equipment
        exercises/page.js              Exercise Library — sticky muscle-group nav, scrollable grouped sections, image cards, detail modal with form cues, Cardio section
      nutrition/
        page.js                        Nutrition (placeholder)
    study-hub/
      layout.js                        Study Hub layout with StudyHubSidebar + FloatingChat
      page.js                          Overview (DailyStreak component)
      ccna/page.js                     CCNA cert page (DomainTrend + Recommended Focus + Predicted Score)
      network-plus/page.js             Network+ cert page
      security-plus/page.js            Security+ cert page
      test/page.js                     Take a Test (practice / simulation / real exam)
      study/page.js                    Study Mode (concept cards + per-domain question)
      bookmarks/page.js                Saved bookmarks with cert tabs + reason badges
      flashcards/page.js               Flashcard landing — per-cert deck stats + weak domain section
      flashcards/[cert]/page.js        Per-cert flashcard study session (StudySession component)
      cert-guide/page.js               5-tab cert reference hub (Overview, Overlap, Exam Details, Career, Roadmap)
      progress/page.js                 Progress tracking — stats, Score Over Time, Questions Per Day, Domain Heatmap
      results/page.js                  Past test results with mode badges, Discard button
      reference/page.js                Reference sheets (subnetting, ports, OSI, etc.)
      flagged/page.js                  Flagged/reported questions
      templates/page.js                Generate AI templates (5 per batch)
      premade-templates/page.js        Browse/manage template library (duplicates, retired)
      labs/page.js                     Packet Tracer Labs landing — all lab sets, per-lab progress dots
      labs/commands/page.js            IOS Command Reference — exports IOS_COMMANDS for FloatingCommandPanel
      labs/tips/page.js                Packet Tracer Tips & Tricks (50+ tips, 8 categories)
      labs/[setId]/page.js             Lab set overview — weak domain labs highlighted in yellow
      labs/[setId]/[labId]/page.js     Individual lab — FloatingCommandPanel mounted here
  data/
    labs/
      index.js                         Exports LAB_SETS, getLabSet(), getLab() helpers
      ccna-fundamentals.js             CCNA lab set — 8 labs, 49 steps — all steps have document arrays
      small-office-network.js          Small Office series — 5 labs, 27 steps — all steps have document arrays
      network-plus-fundamentals.js     Network+ lab set — 5 labs, 25 steps — all steps have document arrays
      security-plus-labs.js            Security+ lab set — 4 labs, 20 steps — all steps have document arrays
  components/
    StudyHubSidebar.js                 Nav sidebar with test-in-progress guard
    LifeHubSidebar.js                  Life Hub nav — Health dropdown, Workouts dropdown, auto-opens on active routes
    BookmarkModal.js                   Bookmark reason + notes modal
    DailyStreak.js                     30q/day streak tracker with 28-day calendar heatmap
    DomainTrend.js                     Per-domain score trend SVG chart (no library)
    ScoreChart.js                      Overall score chart
    LabTopology.js                     SVG topology renderer (router/switch/PC/server/cloud; trunk/access/redundant lines)
    FloatingCommandPanel.js            Fixed bottom-right on lab pages — searchable IOS command reference
    FloatingReferencePanel.js          Fixed on test page (practice mode only) — cert-filtered quick reference
    FloatingChat.js                    Fixed chat bubble on all Study Hub pages — session-only tutor chat
    LabTimer.js                        Per-lab persistent timer — Start/Pause/Reset, survives navigation
```

---

## Database Tables (Supabase)
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question — cert, topic, correct flag, timestamp, question_snapshot JSONB (wrong answers only), learned_at |
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

## Features

### Test Modes
- **Practice** — answer one at a time, immediate feedback, tutor chat, bookmark button
- **Simulation** — answer all then submit, no feedback until end
- **Real Exam** — timed (per cert), no feedback, matches real exam question counts

### Pause / Resume
- Explicit **Pause** button saves to Supabase `paused_tests`
- Navigating away via sidebar triggers a confirm dialog; test state saved to `localStorage` on every answer
- `beforeunload` warns on browser refresh/close during active test
- On return: checks `localStorage` first (interrupted tests), falls back to Supabase (manually paused)
- localStorage snapshot cleared on: test complete, pause, resume, "Take Another Test"
- "Return to Test" banner on test setup screen; also resumable via `?resume=<id>` URL

### Bookmarks
- Save any question with a reason: 🔥 Super Hard / 🤔 Confusing / 📢 Show Others / ⭐ Important
- Optional notes field
- Bookmarks page has cert tabs (All / CCNA / Network+ / Security+), reason badges, expandable full question view

### Template System
- Templates use `{{placeholder}}` variables filled from `variable_sets` JSON
- Generate 5 at a time — **count is intentionally locked at 5** (higher counts caused API/JSON truncation crashes)
- Pre-made Templates page: Browse / Duplicates / Approved Similar / Retired tabs
- Duplicate detection: Jaccard word-overlap ≥50%, same cert/domain/difficulty
- Approved duplicate pairs stored in `localStorage`

### Spaced Repetition
- Domain weights multiplied by accuracy-based multipliers before question distribution:
  - < 40% accuracy → 2.5× weight
  - 40–60% → 1.8×
  - 60–75% → 1.3×
  - ≥ 90% → 0.6×

### Daily Streak
- Goal: 30 questions/day
- 28-day calendar heatmap (green = met, blue = partial, grey = none)
- Today outlined in accent-blue

### Domain Trend
- SVG line chart (no library) per cert, per topic
- 80% dashed threshold line
- Trend indicator ▲/▼ vs earliest data point

### Reference Sheets
- CCNA: subnetting /8–/30, IOS commands, OSPF/STP states, private IP ranges
- Network+: 28 port numbers, OSI 7 layers, wireless standards, cable types
- Security+: attack types, encryption algorithms, MFA factors, 8 compliance frameworks
- Available in practice mode only (not simulation or real exam)

### Cert Guide
- 5-tab reference hub: Overview, Overlap, Exam Details, Career & Value, Study Roadmap
- Overview: cert cards with domain weight bars, quick comparison table
- Overlap: expandable shared topic rows with per-cert depth and study tips, overlap % summary
- Exam Details: logistics (questions, time, cost, passing score, retake policy), test day tips
- Career & Value: job roles, salary ranges, DoD 8570/8140 compliance levels, employer value
- Study Roadmap: 3 study paths, time estimates from zero, combined study strategy

### Flashcards
- Landing page: per-cert deck stats (mastered / learning / unlearned counts, mastery progress bar)
- Generate Deck (60 cards) on first visit; Add 40 More Cards once a deck exists
- Per-cert study sessions at `/study-hub/flashcards/[cert]` via `StudySession.js`
- Progress tracked in `flashcard_progress`: `mastered` flag, `consecutive_correct` count
- Weak Domain Section below cert cards — queries `topic_performance` for domains <65% accuracy (≥5 seen), up to 6 cards with accuracy bar and direct link

### Study Mode
- Cert selection → concept card (domain + bullets) → "I'm ready" loads a question for that domain
- Bookmark button available on questions

### Mixed — All Certs Mode
- "Mixed — All Certs" option in the cert selector on Take a Test
- Domains locked to shared overlap topics across all 3 certs
- Generates questions via 3 parallel API calls, shuffles together; Real Exam mode disabled
- Saved as `cert = 'mixed'` — does NOT update individual cert `topic_performance`
- Progress page and Results page include Mixed as a 4th cert (green, `var(--success)`)

### Mark as Learned (Wrong Answer Review)
- In practice mode, when a wrong-answer-review question is revealed, a purple "✓ Mark as Learned" button appears
- One click PATCHes `/api/wrong-answers` → sets `learned_at`; button turns green + disabled
- Wrong-answers GET route filters `learned_at IS NULL` so marked questions never reappear

### AI Documentation Feedback
- Save button on DOCUMENT YOUR WORK textarea calls POST `/api/lab-doc-feedback`
- Returns 1–3 sentences of specific feedback displayed inline with 🤖 icon
- Save button shows "Analyzing..." while waiting; onBlur no longer auto-saves

### Lab Completion Summary
- "Complete Lab — Get Summary" button enabled only when all steps checked AND all document fields filled
- Calls POST `/api/lab-summary` → AI returns 3-section summary: What You Built / Key Concepts Practiced / Keep Practicing
- Modal has Close, Next Lab →, or View Lab Set buttons depending on lab position

### Wrong Answer Review
- Card on Take a Test setup (below Fix My Weaknesses)
- Select cert → shows count of stored wrong answers → "Start Review" loads them as a practice session
- Wrong answers stored as `question_snapshot` JSONB in `question_answers` (nullable, only for incorrect answers)
- API route `/api/wrong-answers?cert=X` deduplicates by question text

### Per-Lab Timer
- `LabTimer.js` mounted in lab page header alongside step completion percentage
- Persistent via `lab_timers` table — survives page refresh, navigation, browser close
- Uses `last_started_at` trick: elapsed = stored_seconds + (now - last_started_at) when running
- Controls: ▶ Start / ⏸ Pause / ↺ Reset; displays MM:SS or HH:MM:SS, green when running

### Fix My Weaknesses
- Button on Take a Test setup; queries `topic_performance`, finds cert with most domains <65% accuracy (≥5 seen)
- Auto-selects cert and those domains in practice mode with a summary panel of targeted domains

### Predicted Exam Score
- Shown on each cert page once ≥1 domain has ≥5 questions answered
- Weighted average of domain accuracy using official exam domain percentages
- Formula: `sum(domainWeight × accuracy) / sum(coveredWeights) × 100`
- Domain breakdown chips shown color-coded by score

### Total Study Time
- Shown on Progress page as 5th stat card
- Sums `duration_seconds` from `test_sessions`; displayed as "Xh Ym" or "Xm"

### Test History (Results page)
- Mode badge per result: Practice (blue), Simulation (yellow), Real Exam (red)
- Discard button removes test session and its `question_answers` from DB
- Discard also available on Return to Test resume banner

### Study Time Tracking
- `duration_seconds` column on `test_sessions` — measured from first question to submit
- `startTimeRef` set in `generateTest()` and both `resumeTest()` paths

### Floating Chat
- 💬 bubble fixed bottom-right on every Study Hub page (mounted in `study-hub/layout.js`)
- Opens 360×520 panel — full conversation, Clear button, starter suggestions
- Light markdown rendering: bold, inline code, code blocks, bullets
- API route `/api/chat` — multi-turn, system prompt tuned for cert study help; session-only history

### Packet Tracer Labs
- Landing page: all lab sets with cert badge, difficulty breakdown, estimated total time
- Set overview: ordered labs with difficulty dots, step count, domain tags; weak-domain labs highlighted yellow
- Individual lab: topology SVG, collapsible step cards, IOS command blocks with copy, verification commands, expected output, progressive hint reveal, pro tips, notes textarea
- Step completion → `lab_progress` table; notes → `lab_notes` table; Prev/Next navigation
- Data-driven: add a new lab set by creating one file in `src/data/labs/` — zero UI changes needed
- `LabTopology.js`: router/switch/PC/server/cloud icons; trunk=blue, redundant=purple, access=grey lines
- Interface labels: dark pill backgrounds, IP/DG in green, labels at 33%/67% along lines with 20px offset
- Accepts two formats: old (`connections` with `fromLabel`/`toLabel`) and new (`links` with single `label` split on `\n`); auto-computes `viewBox` if not provided

### Per-Step Documentation
- Every step has a `document` array — 2–3 prompts teaching real-world documentation habits
- `StepCard` renders "📝 DOCUMENT YOUR WORK" section after hints when `step.document` exists
- Textarea auto-saves to `localStorage` on blur; manual Save button triggers AI feedback
- Storage key: `lab_step_doc_${setId}_${labId}_${stepId}`
- **All steps in all four lab set files have document arrays — do NOT add a step without one**

### Lab Sets
- **CCNA Fundamentals** (`ccna-fundamentals.js`): 8 labs, 49 steps — VLANs/Router-on-a-Stick, DHCP, STP, ACLs, SSH hardening, OSPF, NAT/PAT, Capstone
- **Small Office Network Series** (`small-office-network.js`): 5 labs, 27 steps — Labs 1–4 build VLANs → DHCP → STP redundancy → ACLs on shared topology; Lab 5 full-office capstone
- **Network+ Fundamentals** (`network-plus-fundamentals.js`): 5 labs, 25 steps — Topology docs, VLAN + inter-VLAN routing, wireless WPA2, troubleshooting (explicit 7-step build-then-break-then-fix), port security
- **Security+ Network Labs** (`security-plus-labs.js`): 4 labs, 20 steps — ACL firewall, DMZ three-zone design, device hardening (SSH v2/encrypted passwords/rate limiting), network segmentation (VLANs by trust level)

### Google Health Integration
- OAuth flow restricted to owner account only (`sethproper40@yahoo.com`) — 403 for all others
- Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`, `googlehealth.sleep.readonly`
- Token refresh handled automatically in `sync/route.js` — checks `expires_at`, refreshes via `oauth2.googleapis.com/token`
- API endpoint: `health.googleapis.com/v4/users/me/dataTypes/{type}/dataPoints` — `users/me` only, NOT `users/-`
- **Two-path sync**: GET reads Supabase cache (fast); POST fetches from Google and writes to cache
- **Incremental sync**: POST fetches only since `last_synced_at - 1 hour`; first sync = 30 days back
- **Auto-background-sync**: pages load cache instantly, then fire background POST if data >15 min stale

### Step Tracker (`/life-hub/health/steps`)
- Today / Yesterday / Week tabs + Refresh button
- Hourly view: 24-bar chart (Eastern time), goal progress bar (0–10k), summary cards (Total Steps, Peak Hour, Progress %)
- Week view: 7-day bar chart, Total / Daily Avg / Goal Days cards
- Hover tooltips: `position: fixed` overlay following cursor — no chart layout shift
- Peak hour green; past hours blue; future hours grey; goal = 10,000 steps/day

### Sleep Tracker (`/life-hub/health/sleep`)
- Summary cards: Total Sleep, Deep Sleep, REM, Light
- Stage breakdown proportional bar (Deep=accent-blue, REM=accent-purple, Light=success, Awake=warning)
- Full sleep timeline with proportional segments across total duration
- "No sleep data" state (😴) shown correctly when watch not worn

### AI Workout Plan Generator
- 7-step onboarding: experience, goals (multi-select), days per week, schedule (pick actual days), fitness check ("please try"), cardio preferences, equipment + limitations
- Cardio preferences: walk, jump_rope, bike, stair_climb, hiit, shadow_boxing, none (none is mutually exclusive)
- `generate-plan/route.js`: EXERCISE_LIST filtered by available equipment (has_pullup_bar, has_ab_roller flags); cardio suggestions only from user-selected options
- Plan stored as JSONB in `workout_plans.plan` — array of 7 day objects with day_of_week, exercises[], cardio
- Plan page sorts Mon–Sun; day reassignment via dropdown auto-swaps conflicts
- Add/remove exercises via picker modal with AI check-in (permanent vs one-time)
- Add/Change Cardio on rest day cards via picker from `exercises` table (body_part='cardio')

### Settings — Data & Reset
- Per-cert reset: clears `question_answers`, `topic_performance`, `test_sessions`, `paused_tests`, `flashcards`, `flashcard_progress` for that cert only
- All study data reset: same tables across all certs + `bookmarked_questions` + `flagged_questions`
- Workout plan reset: deletes all `workout_plans` rows — keeps the fitness profile intact
- Full workout reset: deletes `workout_plans` + `workout_profiles` — user returns to setup flow on next visit
- All resets gated behind a confirmation modal (⚠️ warning, explicit "Yes, Reset" button); cannot be triggered by accident
- Success/error message shown inline after completion
- API route: `POST /api/reset` with `{ scope: 'cert'|'all_study'|'workout_plan'|'workout_profile', cert? }`
- **Pattern for new sections:** as new Life Hub features are built, add their reset row here with the same button style

### Exercise Library
- Sticky left muscle-group nav with counts; scrollable grouped sections; Cardio section at bottom
- Cards: image thumbnail (140px) or 🏋️ placeholder; click opens detail modal
- Detail modal: full-width image, muscle tags, numbered instructions, green "WHERE YOU SHOULD FEEL IT", red "DO NOT"
- 34 strength exercises (dumbbell + bodyweight) + 9 cardio exercises in Supabase `exercises` table
- Images stored in `public/exercises/` as static assets
- To add exercises: save image to `public/exercises/`, push, insert row into `exercises` table

---

## Important Decisions & Constraints (Don't Re-Litigate These)
| Decision | Reason |
|----------|---------|
| Template batch size locked at 5 | Higher counts caused Anthropic API JSON truncation and crashes |
| Inline styles only — no Tailwind | Chosen early in project; Tailwind was removed. Switching now would touch every file |
| `IOS_COMMANDS` exported from `commands/page.js` | Single source of truth — floating panel imports it instead of duplicating data |
| `lab_step_doc_${setId}_${labId}_${stepId}` localStorage key | Pattern must stay consistent across all lab files or saved docs will be orphaned |
| FloatingReferencePanel practice-mode only | Intentional — simulation and real exam should not have reference aids |
| Mixed cert mode saves as `cert = 'mixed'` | Does NOT pollute individual cert `topic_performance` — required for accurate per-cert tracking |
| 82.5% threshold line on Score Over Time chart | Mirrors typical passing score for all three certs |
| Spaced repetition multipliers (<40% → 2.5×, etc.) | Tuned values — don't adjust without testing impact on question distribution |
| Workout cardio only from user-selected options | User may not have jump rope, ability to walk, etc. — never suggest unavailable cardio |

---

## Token Efficiency Rules
1. **Never use a background agent to edit a single large file.** Background agents read repeatedly and conflict with main-thread edits.
2. **Batch large data edits — don't do one Edit per item.** Read each file once and edit in groups.
3. **Do not spawn a background agent and also work on the same files.** Causes "file modified since read" failures on every Edit call.
4. **Lab data files are large (~1300+ lines each).** Use `offset` and `limit` when reading. Only do a full read when you genuinely need the whole structure.
5. **At context compaction boundaries, large file contents are dropped.** Plan for a re-read after compaction.
6. **For new lab steps, always include a `document` array.** All four lab files have complete coverage — don't create a step without one.

---

## Cost Reference (Anthropic API)
- ~$0.003–$0.005 per question generated
- ~$0.015–$0.025 per template generated (larger prompt)
- 161 active templates ≈ ~$3–4 total cost to date
- Filling all domains to 20–25 templates each ≈ ~$8–10 total

---

## Common Commands
```bash
# Pull latest changes
git pull origin claude/adoring-shannon-sTxW8

# Start dev server
npm run dev

# Stop dev server
Ctrl+C
```
