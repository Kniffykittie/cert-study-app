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

## Section Identity Colors (Life Hub)
Each Life Hub section has a dedicated accent color applied via the `SECTION_COLORS` constant in `LifeHubSidebar.js`. Use these for active nav states, section headers, card accent borders, and page-level color theming.
```
Overview    #a78bfa   (accent-purple — consistent with existing brand)
Goals       #06b6d4   (cyan/teal)
Health      #22c55e   (green)
Nutrition   #f97316   (orange)
Workouts    #3b82f6   (blue)
```

---

## Key Rules
- **Inline styles only** in JSX — never Tailwind classes
- **No comments** unless the WHY is non-obvious
- **Security:** `ANTHROPIC_API_KEY` is secret, never share. Only `NEXT_PUBLIC_` Supabase keys are safe.
- Mobile responsive via `@media (max-width: 768px)` CSS
- **Every AI route must use `getUser()` not `getSession()`** — and check `is_disabled` on the profiles table before proceeding
- **Every new DB table must have RLS in the same migration** — no exceptions; pattern: `user_id = auth.uid()`
- **All user-supplied free text injected into AI prompts must be wrapped in `<user_input>` tags** with a note telling Claude to treat it as data only
- **Every new loggable feature ships with a reset row in Settings** in the same build session

---

## Session Rules

### Pull Command (always give this after every push — as a code block so it's copyable)
```
git pull origin claude/adoring-shannon-sTxW8
```

### MD Notes — Enforced by Pre-Push Hook
A git hook at `.githooks/pre-push` **blocks the push** if code files changed but `CLAUDE.md` and `build-notes.md` were not updated in the same commit. After cloning, run `npm run setup-hooks` once to activate it.

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
      reset/route.js                   POST — scoped data reset; uses getUser() + is_disabled check
      bookmarks/route.js               CRUD for bookmarked questions
      generate-questions/route.js      Template-only question serving (spaced repetition weighting, no AI calls); uses getUser() + is_disabled check
      generate-templates/route.js      AI template generation (batch of 5, dedup); owner-only; uses getUser()
      generate-flashcards/route.js     AI flashcard generation; owner-only; uses getUser()
      test-chat/route.js               Tutor chat during practice tests; uses getUser()
      chat/route.js                    General study chat (FloatingChat component); uses getUser() + is_disabled check
      wrong-answers/route.js           GET wrong answers by cert (deduped by question text)
      lab-doc-feedback/route.js        AI feedback on step documentation; uses getUser() + is_disabled check; prompt injection protected
      owner/
        verify-pin/route.js            POST — verifies owner PIN against OWNER_PIN_HASH env var; 3-attempt lockout for 1 hour; owner email check; module-level brute-force state
        generate-invite/route.js       POST — owner only; generates random XXXX-XXXX invite code; inserts to invite_codes table
        admin/
          users/route.js               GET — owner only; lists all auth users + profile data (display_name, is_disabled, has_pin) via admin client
          toggle-disable/route.js      POST — owner only; flips is_disabled on profiles; cannot self-disable
          force-logout/route.js        POST — owner only; invalidates all sessions for a user via admin client
          send-reset/route.js          POST — owner only; sends password reset email via admin client
          clear-pin/route.js           POST — owner only; nulls out settings_pin_hash on profiles
          reset-2fa/route.js           POST — owner only; deletes all TOTP factors for a user via admin client + clears their recovery codes
      invite/
        validate/route.js              GET ?code= — public; checks if code exists and unused; IP-based brute force protection (5 failed attempts/hr blocks IP); records attempts in join_attempts table
        redeem/route.js                POST — authenticated; marks invite code used_by + used_at
      lab-summary/route.js             AI lab completion summary (3 sections); uses getUser() + is_disabled check; prompt injection protected
      delete-account/route.js          POST — full cascade delete across all tables + supabase admin auth user removal; uses getUser()
      2fa/
        generate-recovery/route.js    POST — generates 10 bcrypt-hashed recovery codes, stores in recovery_codes table, returns plain codes once; uses getUser()
        use-recovery/route.js         POST — verifies recovery code against hashes, marks used, unenrolls all TOTP factors via admin client; uses getUser()
      settings-pin/
        set/route.js                   POST — bcrypt hash PIN and save to profiles.settings_pin_hash; uses getUser()
        verify/route.js                POST — bcrypt compare PIN against stored hash; uses getUser()
        remove/route.js                POST — verify current PIN then null out hash; uses getUser()
      goals/
        generate-overview/route.js     POST — AI overview from goals_profiles; uses getUser() + is_disabled check; prompt injection protected; only called from handleFinish() on setup page
        progress-photos/route.js       GET list with signed URLs (1hr); POST upload with magic byte validation + Supabase Storage; DELETE removes from Storage + DB; uses getUser() + is_disabled check
      supplements/
        generate-profile/route.js      POST — AI supplement info card (Sonnet); cached in supplement_profiles by normalized name (shared across users); uses getUser() + is_disabled check; supplement name wrapped in user_input tags
      nutrition/
        search/route.js                GET ?q= or ?barcode= — checks food_cache + my_foods first; falls back to Open Food Facts API; caches OFF results permanently (ODbL allows); uses getUser()
        log/route.js                   GET ?date= today's entries; POST add entry (multiplies macros by servings); DELETE by id; uses getUser()
        my-foods/route.js              GET user's saved food library; POST save new food; DELETE by id; uses getUser()
        tdee-check/route.js            GET pending tdee_suggestion; POST calculates implied TDEE from food logs + weight measurements (needs 14+ days + 2+ measurements); PATCH accept (writes custom_tdee) or dismiss; uses getUser()
        encyclopedia/route.js          GET aggregates user context (30d food avgs, supplement coverage, check-in energy signal, workout frequency, meal plan avgs, goals); used by encyclopedia page
        encyclopedia/[nutrient]/route.js  GET cached AI profile from nutrient_profiles; POST generates via Claude and caches; uses getUser() + is_disabled check
      health/
        connect/route.js               Initiates Google Health OAuth (any authenticated user; add friend's Gmail as test user in Google Cloud Console)
        manual-steps/route.js          GET today's manual step count; POST to upsert — shown on workouts page when Google Health not connected
        callback/route.js              Handles OAuth callback, saves tokens
        status/route.js                Checks if Google Health is connected
        sync/route.js                  GET = read cache; POST = fetch from Google + write cache
        disconnect/route.js            Removes stored tokens
      workouts/
        generate-plan/route.js         AI workout plan generator; uses getUser() + is_disabled check; prompt injection protected on limitations + dumbbell_note fields
        exercise-chat/route.js         POST — mid-workout trainer chatbot (Haiku); exercise context in system prompt; user message wrapped in user_input tags; uses getUser() + is_disabled check
      life-hub/
        daily-brief/route.js           GET returns cached brief for today; POST gathers 10+ tables, calls Claude, caches; uses getUser() + is_disabled check
        monthly-wrap/route.js          GET cached wrap for ?month=YYYY-MM; POST generates (6-table gather + Claude narrative), caches forever; uses getUser() + is_disabled check
    life-hub/
      layout.js                        Life Hub layout with LifeHubSidebar
      page.js                          Life Hub landing — Daily Brief (AI paragraph, cached daily), Recovery Score (5-component composite 0–100: sleep/hydration/protein/energy/workout load), Smart Contextual Check-In (adaptive question labels + micro-insight after save), 28-day heatmap, live stats strip (water includes food water_g), hub navigation cards (includes Monthly Wrap card)
      monthly-wrap/page.js             Monthly Wrap — month picker, AI narrative card, stat grid (workouts/energy/mood/weight/calories/water); Generate button on first visit; cached forever per month; grouped under Overview in sidebar
      health/
        page.js                        Health Overview — steps today, avg heart rate, sleep last night
        steps/page.js                  Step Tracker — hourly/weekly bar charts, goal progress, fixed tooltip
        sleep/page.js                  Sleep Tracker — stage breakdown bar, timeline chart, no-data state
        water/page.js                  Drinks & Hydration — stacked hydration ring (water blue, beverages purple), quick-add water buttons (8/12/16/20/32 oz + custom), drink search (logs to food_log_entries meal_slot='drink'), saved drinks chips (my_foods is_drink=true) with Manage mode (edit name/nutrition/delete), combined today's log with ✏️ edit button on drink entries, caffeine tracker, hydration timing chart (18-bar hourly), 7-day bar chart; goal synced to goals_profiles.water_goal_oz; listed under Nutrition in sidebar (not Health)
      goals/
        page.js                        Goals overview — AI overview panel, active goals chips, body metrics card (BMI + disclaimer + build label), lifestyle card (activity + daily steps + timeline), notes; Edit Goals button
        measurements/page.js           Body Measurements — how-to guide, log form (9 fields: weight/waist/hips/chest/neck/arms/thighs), history table with delta indicators, weight-over-time SVG chart; Progress Photos section (private Supabase Storage, lightbox, delete)
        supplements/page.js            Supplement Stack — add/edit/remove supplements (name, dose, timing, optional nutrient content from label); 🤖 Info button fetches AI-generated card per supplement (cached in supplement_profiles); nutrient chips shown on each card; empty state with explainer; listed under Nutrition in sidebar (not Goals)
        setup/page.js                  5-step goals onboarding; supports ?redirect= param
      workouts/
        page.js                        My Workout Plan — weekly plan cards sorted Mon-Sun, day reassignment, add/remove exercises with AI check-in, add/change cardio on rest days; Start Workout / ▶ Resume Workout / ✓ Done Today button logic per day; Add Exercise modal grouped by muscle group with ? detail popup; gates on goals profile
        setup/page.js                  7-step onboarding: experience, goals (multi-select), days, schedule, fitness check, cardio preferences, equipment; gates on goals profile
        exercises/page.js              Exercise Library — sticky muscle-group nav, scrollable grouped sections, image cards, detail modal with form cues, Cardio section
        log/page.js                    Active workout logger — live timer, exercise cards with set rows (type badge cycles warmup/working/dropset, weight+reps inputs, ✓ complete, × remove), ? button opens exercise detail modal with trainer chatbot (Haiku, multi-turn), drop set contextual explanation per exercise type, add set/drop set, prev session hints, rest timer bar (auto-starts 90s on working set complete, 30s/60s/90s/2m quick buttons, dismissable), Pause (saves partial to DB + localStorage), fixed "Finish Workout" → post-workout check-in (difficulty/energy/note) → completion screen with stats + overload suggestions
        history/page.js                Workout history — all sessions expandable, PR section (heaviest working set per exercise ever), set chips colored by type
      nutrition/
        page.js                        Nutrition dashboard — TDEE + macro targets from goals_profiles, calorie ring, food log by meal slot (breakfast/lunch/dinner/snack/other), food search via Open Food Facts + My Foods library, manual entry with save-to-library, Supplements tab; TDEE calibration card (pending suggestion from tdee_suggestions); gates on goals profile
        meal-plan/page.js              Weekly Meal Plan — Mon–Sun grid, meal slot rows, food search, AI insight analysis (typed callouts citing specific days and foods)
    join/
      page.js                          Invite-only signup — requires valid invite code + email + password; validates code, creates Supabase auth user, redeems code
    update-password/
      page.js                          Password reset landing — listens for PASSWORD_RECOVERY auth event; strength bar, match indicator, show/hide toggles; invalid/expired state if no token; redirects to /login on success
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
    LifeHubSidebar.js                  Life Hub nav — section color system (overview=purple, health=green, nutrition=orange, workouts=blue, goals=teal); Overview section (Dashboard + Monthly Wrap), Goals dropdown (Overview + Measurements + Setup), Health dropdown (Overview + Steps + Sleep), Nutrition dropdown (Food Log + Meal Plan + Encyclopedia + Hydration + Supplements), Workouts dropdown (My Plan + History + Exercise Library); Hydration and Supplements live under Nutrition group; auto-opens on active routes; SECTION_COLORS constant defines all section accent colors
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
| `profiles` | User display name, exam_dates JSONB, daily_goal INT, default_cert TEXT, is_disabled BOOLEAN (owner ban flag, checked in every AI route), settings_pin_hash TEXT (bcrypt hash for Settings page Privacy PIN), authenticator_name TEXT (e.g. "Google Authenticator" — shown on 2FA login screen) |
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
| `goals_profiles` | User's health goals profile — goals TEXT[], height_inches, weight_lbs, age, sex, body_composition, activity_level, activity_level_note TEXT, daily_steps, target_weight_lbs, timeline, notes, ai_overview, biggest_obstacles TEXT[], biggest_obstacles_other, primary_motivations TEXT[], primary_motivations_other, why_goals, dietary_preferences TEXT[], dietary_preferences_other, sleep_hours NUMERIC; UNIQUE on user_id |
| `body_measurements` | Per-user dated body measurements — weight_lbs, waist_in, hips_in, chest_in, left/right arm/thigh, neck_in; UNIQUE on user_id + date; RLS enabled |
| `daily_checkins` | Energy + mood check-ins per day — energy_level SMALLINT(1–5), mood_level SMALLINT(1–5), note TEXT; UNIQUE on user_id + date; RLS enabled |
| `api_rate_limits` | Per-user per-route per-hour call counts; incremented atomically via `increment_rate_limit` Postgres function |
| `recovery_codes` | 2FA recovery codes — user_id, code_hash TEXT (bcrypt), used_at TIMESTAMPTZ (null = unused); generated on 2FA enrollment, displayed once; RLS: user SELECT/UPDATE own rows |
| `invite_codes` | Owner-generated one-time signup codes — code (unique), created_by, used_by (nullable), used_at; RLS: SELECT=public, INSERT=owner, UPDATE=authenticated |
| `join_attempts` | IP-based brute force tracking for /join — ip TEXT, attempted_at, success BOOLEAN; `check_join_rate_limit(ip)` Postgres function counts fails in last hour |
| `manual_steps_daily` | Manual step count per user per day — user_id, date, steps; unique(user_id, date); shown on workouts page when Google Health not connected |
| `water_logs` | Plain water intake entries — user_id, date, amount_oz NUMERIC(6,1), created_at; RLS enabled; one row per tap |
| `supplement_stack` | User's active supplements — name, dose, timing (morning/afternoon/evening/with_meals/pre_workout/post_workout), nutrients JSONB (nutrient→"amount unit"), is_active; RLS enabled |
| `supplement_profiles` | Cached AI supplement info cards — supplement_name (unique, normalized lowercase), ai_profile JSONB, generated_at; shared across all users; SELECT/INSERT/UPDATE open to all authenticated users |
| `food_cache` | Shared cached food lookup results — barcode (unique), search_name, full nutrition fields (macros + 14 micronutrients), source ('off'); Open Food Facts results cached permanently per ODbL license; no RLS (shared read) |
| `my_foods` | User's personal saved food library — name, brand, serving_size_label, full macro + micronutrient fields; RLS user-scoped |
| `food_log_entries` | Individual food log entries per user/date/meal_slot — name, brand, serving_size_label, servings, all macro + micronutrient fields (already multiplied by servings), source, food_cache_id, my_food_id; RLS user-scoped |
| `workout_logs` | One row per completed workout session — user_id, plan_id (nullable), day_of_week, day_label, duration_seconds, created_at; RLS enabled |
| `workout_log_sets` | Individual sets per session — log_id, user_id, exercise_id (nullable), exercise_name, set_number, set_type (warmup/working/dropset), weight_lbs, reps, rep_range, created_at; RLS enabled |
| `daily_briefs` | Cached AI daily brief — brief_text, data_snapshot JSONB; UNIQUE on user_id + date; generated once per day on first Life Hub visit; never regenerates same day automatically; RLS user-scoped |
| `meal_plans` | Weekly meal plan headers — week_start DATE (always a Monday); UNIQUE on user_id + week_start; RLS user-scoped |
| `meal_plan_entries` | Individual planned foods per day/slot — plan_id, day_of_week SMALLINT (0=Mon…6=Sun), meal_slot, name, servings, macros + iron/calcium/vitamin_d/magnesium/potassium; completely separate from food_log_entries (planning only); RLS user-scoped |
| `progress_photos` | User progress photo gallery — storage_path TEXT (Supabase Storage key), taken_date DATE, note TEXT; private bucket `progress-photos`; signed URLs (1hr expiry); magic byte validation (JPEG/PNG/WebP) on upload; RLS user-scoped |
| `monthly_wraps` | Cached monthly AI wrap-up — month TEXT (YYYY-MM), report_data JSONB (aggregated stats), ai_narrative TEXT; generated once per month, never regenerates; UNIQUE on user_id+month; RLS user-scoped |
| `tdee_suggestions` | TDEE calibration queue — suggested_tdee, current_tdee, implied_tdee, avg_calories_logged, weight_change_lbs, data_days, reason, status (pending/accepted/dismissed); RLS user-scoped |

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
- Templates are **shared** — `question_templates` has open SELECT RLS for all authenticated users; generation locked to owner only at API level (403 for non-owner)
- Generate Templates panel and all retire/restore buttons in the UI only render for the owner; coverage table and browsing are visible to all users
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
- **Shared deck** — cards are generated once by the owner and readable by all users; `flashcards` RLS SELECT policy is `true` for all authenticated users; write operations still require `user_id = auth.uid()`
- Landing page: per-cert deck stats (mastered / learning / unlearned counts, mastery progress bar)
- Generate Deck, Add 40 More Cards, and + Add Card (in StudySession) buttons only visible to owner (`sethproper40@yahoo.com`); non-owners see "check back soon" when deck is empty
- Per-cert study sessions at `/study-hub/flashcards/[cert]` via `StudySession.js`
- Progress tracked per-user in `flashcard_progress`: `mastered` flag, `consecutive_correct` count
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

### Goals & Body Metrics
- Setup flow: 3 steps — Goals (multi-select 8 options), Body Metrics (height/weight/age/sex/body composition/target weight), Starting Point (activity level + daily steps + timeline + notes)
- Body composition selector: sex-dependent options with plain-language labels + body fat % ranges; Male-only "💀 Holy Sh*t" (50%+) option triggers a meme modal that remaps to 'obese' before saving
- Upserts to `goals_profiles` table on finish, then calls `/api/goals/generate-overview` for a personalized 3-paragraph AI overview
- Overview stored in `goals_profiles.ai_overview`, displayed on the Goals page with a 🤖 header
- Goals page shows: AI overview panel, active goals chips, body metrics (with BMI + disclaimer + build label), lifestyle summary, notes
- BMI labels: Underweight (<18.5), Normal (18.5–25), Overweight (25–30), Obese (≥30); BMI disclaimer shown below weight noting it doesn't account for muscle mass
- **Gating**: `/life-hub/workouts`, `/life-hub/workouts/setup`, and `/life-hub/nutrition` show a centered gate overlay (dimmed, "Complete your Goals Setup first" + "Take me there →" button) instead of a hard redirect
- Setup page `?redirect=<path>` param causes `handleFinish()` to route back to the intended destination
- **Workout plan context**: `generate-plan/route.js` fetches `goals_profiles` at generation time and injects body/lifestyle context into the AI prompt
- API: `/api/goals/generate-overview` — POST, any authenticated user, updates `ai_overview` column on their own row
- **Phase 31 built:** Step 3 "Your Context" added to goals setup — Biggest Obstacles, Primary Motivations, Why These Goals (free text), Dietary Preferences, Sleep Hours; all saved to `goals_profiles` and injected into AI overview prompt
- **Phase 32 built:** Body Measurements page at `/life-hub/goals/measurements` — how-to guide, log form (9 fields), history with delta indicators, weight-over-time SVG chart; reset row in Settings
- **Phase 33 built:** Daily Check-In widget on Life Hub home (`/life-hub`) — energy + mood 1–5 ratings, optional note, 28-day heatmap (green/blue/yellow/grey); reset row in Settings
- **Phase 34 built:** Water Tracker at `/life-hub/health/water` — progress ring, quick-add (8/12/16/20/32 oz + custom), today's log with remove, 7-day bar chart; goal persisted to localStorage; reset row in Settings
- **Phase 35 built:** Supplement Stack at `/life-hub/goals/supplements` — add/edit/remove supplements with name, dose, timing, optional nutrient content from label; 🤖 Info button generates and caches AI card per supplement (what it does, cool facts, deficiency signs, too much, food sources, timing, synergies, interactions); nutrient chips on each stack card; reset row in Settings
- **Phase 36 built:** 7 cross-feature improvements — exercise chatbot knows workout profile (experience/goal/limitations); Goals AI overview has Regenerate button + supplement context; Body Measurements shows BMI chip per weight entry; Life Hub home has live stats strip (water/workouts/supplements); Nutrition page shows actual supplement stack with nutrients; Settings Goals section has consistent styling + "Health Tracking" sub-header; workout completion screen shows post-workout nutrition window tip
- **Phase 37 built:** Fatigue signal on Workout Plan page (yellow callout when today's check-in energy ≤ 2); hydration reminder on Workout Log page (dismissible banner when water today < 50% of goal)
- **Phase 45b built:** Supplement caffeine feeds into Drinks & Hydration caffeine total; Daily Brief upgraded with total hydration oz (water + beverages) and caffeine mention; Monthly Wrap includes beverage water in hydration avg + avg_caffeine_mg; Weight chart rebuilt with 7-day rolling average line and smart scale-context callout for big day-to-day jumps
- **Phase 41 built:** Daily Brief (AI paragraph synthesizing all data, cached daily in `daily_briefs` table) + Smart Contextual Check-In (questions adapt based on yesterday: leg day/calorie deficit/short sleep/low-energy streak) + Micro-Insight after saving (rule-based, instant, connects answer to actual data patterns)
- **Phase 40 built:** Goals Setup rebuilt to 5 steps — new "Activity & Exercise" step replaces vague dropdown with specific questions (job type, exercise days/type/duration, consistency, calorie history); new "What Happens Now" closer shows live TDEE breakdown (BMR + NEAT + EAT + adaptation discount) and calibration system explanation; `src/lib/tdee.js` created as shared utility using Katch-McArdle formula; nutrition page updated to import from shared lib; `tdee_suggestions` table created for transparent calorie target updates
- **Phase 42 built:** Daily Brief fix (never regenerates same day); Weekly Meal Plan at `/life-hub/nutrition/meal-plan` — Mon–Sun grid, food search, AI insight analysis (per-day macros + micronutrients vs FDA DV, Claude returns 4–6 typed callouts); `meal_plans` + `meal_plan_entries` tables with RLS
- **Phase 43 built:** TDEE calibration card (checks food logs + weight measurements, queues suggestion if implied TDEE diverges >150 cal, Accept applies custom_tdee override); Progress Photos (private Supabase Storage, JPEG/PNG/WebP magic byte validation, photo grid + lightbox on Measurements page, Reset in Settings); Monthly Wrap AI summary page (`/life-hub/monthly-wrap`) with month picker, stat cards, and cached AI narrative; all three in Life Hub home grid + sidebar
- **Phase 43c built:** Monthly Wrap: auto-generates on 1st of month (background, LifeHubSidebar); history sidebar of all past wraps; current month blocked with "still in progress" state; GET without ?month= returns all months list
- **Phase 43e built:** Nutrition sidebar dropdown — "Nutrition" is now a collapsible dropdown with "Food Log", "Meal Plan", and "Encyclopedia" children; auto-opens on active nutrition routes
- **Phase 44 built:** Nutrient Encyclopedia at `/life-hub/nutrition/encyclopedia` — 13 tracked nutrients, AI profiles cached in `nutrient_profiles` (shared), Gap Report card, Low Energy banner from check-in data, color-coded status grid (food + supplement split bar), right-drawer detail panel (intake, meal plan coverage, workout note, goal chips, AI profile, synergies/competitors)
- **Phase 45b built:** Supplement caffeine feeds into Drinks & Hydration caffeine total; Daily Brief upgraded with total hydration oz (water + beverages) and caffeine mention; Monthly Wrap includes beverage water in hydration avg + avg_caffeine_mg; Weight chart rebuilt with 7-day rolling average line and smart scale-context callout for big day-to-day jumps
- **Phase 48 built:** Nutrition UX overhaul — new `AddFoodModal` for meal-slot logging opens on "My Favorites" tab (saved foods with inline Log → servings → slot confirm); "Find Food" tab has OFFs search capped at 8 results with "Save to Favorites" defaulting on; `SavedFoodsTab` component allows direct logging (Log button → servings input + slot chips → done without extra modal); renamed "Saved Foods" → "My Favorites" throughout
- **Phase 48b built:** AddFoodModal rewritten with 3 equal tabs (⭐ My Favorites | ✏️ Enter Manually | 🔍 Search Database) — manual entry is now first-class; "🍳 Build a Meal" moved into AddFoodModal as footer link on Favorites tab; tabs moved above calorie ring with 📅 Weekly Meal Plan as a proper tab; drinks filtered from meal favorites (`is_drink` flag); SavedFoodsTab and Food Log header cleaned up (Create Meal button removed); MealBuilderModal custom ingredient button styled prominently in purple
- **Phase 46 built:** 3 new nutrients added to Encyclopedia (Omega-3, Vitamin K, Choline) — DB columns added to food_cache/my_foods/food_log_entries/meal_plan_entries, OFF extraction updated, food log routes updated; Recovery Score widget on Life Hub home — 5-component composite (sleep/hydration/protein/energy/workout load = 0–100), renders between Daily Brief and Check-In; Life Hub home water stat now includes beverage water_g from food entries
- **Phase 47 built:** Stack Interactions card on Supplements page — rule-based timing warnings and synergy tips (Iron+Calcium clash, Iron+Vitamin C synergy, Caffeine+Iron morning conflict, Zinc high-dose copper depletion, Vitamin D fat absorption tip, Magnesium evening affirmation); Drink Timing chart on Hydration page — 18-bar hourly chart (5am–11pm) with smart callout when hydration is back-loaded or has a midday gap; Daily Brief upgraded with deep/REM sleep minutes from health_sleep_sessions.stages, and supplement interaction warnings injected into Claude's context
- **Phase 49 (in progress):** Life Hub navigation restructure + visual identity system — section color theming (Overview=purple, Goals=teal, Health=green, Nutrition=orange, Workouts=blue); sidebar rebuilt with colored section headers, section-aware active states, and new grouping (Supplements + Hydration now under Nutrition, Monthly Wrap now under Overview); Sprint 2 (planned): AI Food Intelligence (ai_food_intel_cache table, Haiku-powered food lookup with cached profiles, servings-per-container, AI micronutrient autofill for OFFs gaps, AI fallback search, %DV↔amount toggle, weight-to-servings input, recency-sorted favorites)

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
- Goals profile reset: deletes `goals_profiles` row — user returns to goals setup on next visit; triggers re-gating of workouts/nutrition
- Workout log history reset: deletes `workout_logs` + `workout_log_sets` — PRs and session history gone
- All resets gated behind a confirmation modal (⚠️ warning, explicit "Yes, Reset" button); cannot be triggered by accident
- Success/error message shown inline after completion
- API route: `POST /api/reset` with `{ scope: 'cert'|'all_study'|'workout_plan'|'workout_profile'|'goals_profile'|'workout_logs', cert? }`
- **Pattern for new sections:** as new Life Hub features are built, add their reset row here with the same button style

### Exercise Library
- Sticky left muscle-group nav with counts; scrollable grouped sections; Cardio section at bottom
- Cards: image thumbnail (140px) or 🏋️ placeholder; click opens detail modal
- Detail modal: full-width image, muscle tags, numbered instructions, green "WHERE YOU SHOULD FEEL IT", red "DO NOT"
- 52 strength exercises (dumbbell + bodyweight) + 9 cardio exercises in Supabase `exercises` table; 18 added in Phase 52b await gif_url images
- Images stored in `public/exercises/` as static assets
- To add exercises: save image to `public/exercises/`, push, insert row into `exercises` table
- To add images to the 18 Phase 52b exercises (or any exercise with `gif_url = NULL`): save the image file to `public/exercises/`, push, then run this in the Supabase dashboard SQL editor:
  ```sql
  UPDATE exercises SET gif_url = '/exercises/your-filename.gif' WHERE id = 'the-exercise-id';
  ```
  Example: `UPDATE exercises SET gif_url = '/exercises/dead-bug.gif' WHERE id = 'core-bw-dead-bug';`
  The 18 IDs awaiting images: `arm-db-incline-curl`, `arm-db-zottman-curl`, `arm-db-preacher-curl`, `back-db-reverse-fly`, `back-bw-inverted-row`, `core-bw-crunch`, `core-db-side-bend`, `core-bw-leg-raise`, `core-bw-mountain-climber`, `core-bw-dead-bug`, `core-bw-hollow-hold`, `leg-db-goblet-squat`, `leg-db-step-up`, `leg-db-sumo-squat`, `leg-bw-hip-thrust`, `leg-bw-single-leg-dl`, `sho-db-rear-delt-fly`, `sho-db-push-press`

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
