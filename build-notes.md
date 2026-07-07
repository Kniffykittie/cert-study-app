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

## Life Hub Section Colors
- Overview: #a78bfa (accent-purple)
- Goals: #06b6d4 (cyan/teal)
- Health: #22c55e (green)
- Nutrition: #f97316 (orange)
- Workouts: #3b82f6 (blue)

---

## Session Rules

### Code & Documentation Rules (Enforced by Pre-Push Hook)
- **Pre-push hook** at `.githooks/pre-push` blocks any push that changes code files without also updating `CLAUDE.md` and `build-notes.md` in the same commit. Run `npm run setup-hooks` once after cloning.
- **Update both `CLAUDE.md` and `build-notes.md`** in the same commit as any feature or fix — never at end-of-session only.
- **After every commit/push**, give the user the pull command in a copyable code block:
  ```
  git pull origin claude/adoring-shannon-sTxW8
  ```
- **After every change or fix**, provide a brief summary:
  1. What the problem was (or what was requested)
  2. What was changed (files/logic updated)
  3. What to test to confirm it works
- **Phase log format:** newest phase at the top, labeled `### Phase N - Complete`, bullet points only — no sub-headers inside a phase entry.
- **DB table created or column added** → update the Database Tables section in the same commit.
- **Security item built** → mark it ✅ in the Security Status table in the same commit.

### Feature Tracking Rules (Enforced Every Session)
- **Any feature discussed but not built in the same session must be added to Future Features before the conversation ends.** Even a one-liner placeholder is enough. No exceptions. This is what prevents things from falling through the cracks between sessions.
- **At the start of any planning session** ("what should we build?", "what's left?", "let's make a plan") — read the Future Features section before discussing new ideas. Do not re-spec things already captured.
- **Cross-check rule (enforced before finalizing any new feature spec):** Before fully speccing a new feature, scan all existing Future Features items and ask: Does this new idea correlate with, conflict with, duplicate, or depend on anything already specced? If it correlates → update the existing spec to note the connection. If it conflicts → resolve the conflict before writing new spec. If it depends on something → note the dependency explicitly in the spec. This prevents designing features in isolation that later fight each other or unknowingly duplicate work.
- **When a feature is built**, move its entry from Future Features to the Phase Log. Never leave it in both places.
- **QA items** are removed from the Untested section once the user confirms tested and passing.
- **Future Features status tags:** 💬 Discussed (idea floated, not fully specced) | 📋 Fully Specced (design complete, ready to build) | ⏳ Pending Build (specced and queued, not started)

---

## Active Branch
`claude/adoring-shannon-sTxW8`

---

## Database Tables

### Study Hub
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question — cert, topic, correct flag, timestamp, question_snapshot JSONB (wrong answers only), learned_at |
| `topic_performance` | Aggregated accuracy per cert+topic — drives spaced repetition and weak domain features |
| `test_sessions` | Completed test records — cert, mode, score_pct, correct, total_questions, duration_seconds, completed_at |
| `paused_tests` | In-progress tests saved as JSON with full state for resume |
| `question_templates` | Template library with variable_sets and is_retired flag |
| `bookmarked_questions` | Bookmarks with reason, notes, and full question snapshot |
| `flagged_questions` | User-reported question issues |
| `lab_progress` | Completed lab steps per user (user_id, lab_set_id, lab_id, step_id, completed_at) |
| `lab_notes` | Per-lab freeform notes per user (user_id, lab_set_id, lab_id, notes, updated_at) |
| `lab_timers` | Per-lab timer state — elapsed_seconds, is_running, last_started_at; unique per user+lab |
| `flashcards` | Generated flashcard decks — saved permanently per cert |
| `flashcard_progress` | Per-card mastery state: mastered flag, consecutive_correct count |

### User & Auth
| Table | Purpose |
|-------|---------|
| `profiles` | User display name, exam_dates JSONB, daily_goal INT, default_cert TEXT, is_disabled BOOLEAN, settings_pin_hash TEXT (bcrypt), authenticator_name TEXT |
| `invite_codes` | Single-use signup codes — code TEXT UNIQUE, created_by, used_by, used_at TIMESTAMPTZ; null = unused |
| `join_attempts` | IP brute force tracking for /join — ip TEXT, attempted_at, success BOOLEAN; `check_join_rate_limit(ip)` Postgres function |
| `recovery_codes` | 2FA recovery codes — user_id, code_hash TEXT (bcrypt), used_at TIMESTAMPTZ (null = unused); RLS user-scoped |
| `api_rate_limits` | Per-user per-route per-hour call counts; incremented atomically via `increment_rate_limit` Postgres function |

### Health & Wearables
| Table | Purpose |
|-------|---------|
| `google_health_tokens` | OAuth tokens — access_token, refresh_token, expires_at, last_synced_at; one row per user |
| `health_steps_hourly` | Cached step counts — one row per user/date/hour (EST) |
| `health_heart_rate_daily` | Daily HR summary — avg_bpm, min_bpm, max_bpm, resting_bpm, hrv_rmssd per user/date |
| `health_heart_rate_intraday` | Per-hour HR — avg/min/max_bpm, sample_count; UNIQUE on user_id+date+hour; RLS enabled |
| `health_heart_rate_5min` | Per-5-minute HR — avg/min/max_bpm; minute_bucket 0–1435; UNIQUE on user_id+date+minute_bucket; RLS enabled |
| `health_sleep_sessions` | Sleep sessions — stages JSONB, timeline JSONB, is_nap; quality columns: onset_minutes, efficiency_pct, awake_count, longest_stretch_min, restlessness TEXT, sleep_score SMALLINT; keyed by Google session_id |
| `manual_steps_daily` | Manual step count per user per day — user_id, date, steps; fallback when Google Health not connected |
| `daily_checkins` | Energy (1–5), mood (1–5), sleep_hours NUMERIC, note per day; UNIQUE on user_id+date; RLS enabled |
| `water_logs` | Plain water intake — user_id, date, amount_oz NUMERIC; one row per tap; RLS enabled |

### Goals & Body
| Table | Purpose |
|-------|---------|
| `goals_profiles` | Full health goals profile — goals TEXT[], height_inches, weight_lbs, age, sex, body_composition, job_activity, exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency, activity_level, activity_level_note, daily_steps, target_weight_lbs, timeline, notes, ai_overview, biggest_obstacles TEXT[], primary_motivations TEXT[], why_goals, dietary_preferences TEXT[], sleep_hours, water_goal_oz, custom_tdee INT; UNIQUE on user_id |
| `body_measurements` | Dated measurements — weight_lbs, waist_in, hips_in, chest_in, left/right arm/thigh, neck_in; UNIQUE on user_id+date; RLS enabled |
| `progress_photos` | Progress photos — storage_path TEXT, taken_date DATE, note TEXT; private bucket `progress-photos`; signed URLs (1hr); magic byte validation on upload; RLS enabled |
| `tdee_suggestions` | TDEE calibration queue — suggested_tdee, current_tdee, implied_tdee, avg_calories_logged, weight_change_lbs, data_days, reason, status (pending/accepted/dismissed); RLS enabled |

### Nutrition
| Table | Purpose |
|-------|---------|
| `food_cache` | Shared OFFs results — barcode (unique), full macro + micro fields (39 total after Phase 60), servings_per_container, source; cached permanently (ODbL license); no RLS |
| `my_foods` | User food library — name, brand, serving_size_label, servings_per_container, all 39 nutrition fields, last_logged_at, log_count, is_pinned, is_drink; RLS user-scoped |
| `ai_food_intel_cache` | AI food intelligence — food_key (normalized name, unique), intel JSONB (GI, satiety, density, processing, timing, pairings, fun fact); shared across users; cached forever |
| `food_log_entries` | Food log — user/date/meal_slot, name, brand, servings, all nutrition fields (multiplied by servings), source, food_cache_id, my_food_id; RLS user-scoped |
| `meal_plans` | Weekly meal plan headers — week_start DATE (Monday); UNIQUE on user_id+week_start; RLS user-scoped |
| `meal_plan_entries` | Planned foods per day/slot — plan_id, day_of_week SMALLINT (0=Mon), meal_slot, name, servings, full nutrition fields; RLS user-scoped |
| `supplement_stack` | Active supplements — name, dose, timing, nutrients JSONB (nutrient→"amount unit"), is_active BOOLEAN; RLS user-scoped |
| `supplement_profiles` | Cached AI supplement info cards — supplement_name (unique normalized), ai_profile JSONB; shared across users |
| `supplement_logs` | Daily adherence log — user_id, supplement_id (FK), date, taken_at; UNIQUE on user_id+supplement_id+date; RLS user-scoped |
| `nutrient_profiles` | Cached AI nutrient encyclopedia entries — nutrient_key (unique slug), ai_profile JSONB; shared across users |

### Workouts
| Table | Purpose |
|-------|---------|
| `exercises` | Exercise library — name, body_part, equipment, target, secondary_muscles[], instructions[], gif_url (nullable) |
| `workout_profiles` | Fitness profile — experience, goals, days_per_week, fitness stats, equipment, limitations, available_weights |
| `workout_plans` | AI-generated weekly plans — plan JSONB (7 day objects), plan_notes, progression_notes, schedule JSONB, is_active |
| `workout_logs` | Completed sessions — plan_id, day_of_week, day_label, duration_seconds, hr_zones JSONB, is_partial, post_workout_difficulty/energy/note; RLS enabled |
| `workout_log_sets` | Sets per session — log_id, exercise_name, set_number, set_type (warmup/working/dropset), weight_lbs, reps, rep_range; RLS enabled |
| `stretch_logs` | Stretch session logs — user_id, date, stretch_ids TEXT[], session_type (pre_workout/post_workout/standalone), duration_seconds, logged_at; RLS user-scoped |

### Reporting
| Table | Purpose |
|-------|---------|
| `daily_briefs` | Cached daily AI paragraph — brief_text, data_snapshot JSONB; UNIQUE on user_id+date; generated once per day; RLS user-scoped |
| `monthly_wraps` | Cached monthly AI wrap-up — month TEXT (YYYY-MM), report_data JSONB, ai_narrative TEXT; UNIQUE on user_id+month; cached forever; RLS user-scoped |

---

## Security Status
All items are ✅ built. This section is reference only — not a to-do list.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Rate limiting on AI endpoints | ✅ Built | `api_rate_limits` table + `increment_rate_limit` Postgres function; all AI routes check before proceeding |
| 2 | RLS on every table | ✅ Enforced | Rule: every new table gets RLS in the same migration. Pattern: `user_id = auth.uid()` |
| 3 | Progress photos — private storage + signed URLs | ✅ Built | Magic byte validation (JPEG/PNG/WebP); private `progress-photos` bucket; 1hr signed URLs |
| 4 | `getUser()` on sensitive routes | ✅ Built | All AI routes and destructive routes use `getUser()` not `getSession()` |
| 5 | Prompt injection protection | ✅ Built | All user-supplied free text in AI prompts wrapped in `<user_input>` tags |
| 6 | Brute force on `/join` | ✅ Built | IP rate limit; `join_attempts` table; `check_join_rate_limit(ip)`; 5 fails/hr blocks IP for 60min |
| 7 | Account deletion | ✅ Built | `POST /api/delete-account` — full cascade delete + Supabase admin auth removal |
| 8 | `is_disabled` flag | ✅ Built | `profiles.is_disabled` checked at top of every AI route; owner flips via admin panel |
| 9 | Email verification | ✅ Dashboard | Enabled in Supabase Auth dashboard |
| 10 | Sign out everywhere | ✅ Built | `supabase.auth.signOut({ scope: 'global' })` in Settings |
| 11 | Email enumeration prevention | ✅ Dashboard | Enabled in Supabase Auth dashboard |
| 12 | Owner PIN for elevated actions | ✅ Built | `OWNER_PIN_HASH` env var; bcrypt compare; 3-attempt lockout 1hr; `POST /api/owner/verify-pin` |
| 13 | Privacy PIN (user-controlled) | ✅ Built | `profiles.settings_pin_hash` bcrypt; `settings-pin/set\|verify\|remove` routes |
| 14 | 2FA — TOTP via authenticator app | ✅ Built | Supabase MFA; QR enrollment; recovery codes in `recovery_codes`; TOTP login gate |
| 15 | Owner admin panel | ✅ Built | User list, disable/enable, force logout, send reset, reset 2FA, clear PIN — all in Settings |
| 16 | Invite-only signup | ✅ Built | `invite_codes` table; `/join` page; `validate` + `redeem` routes; IP brute force protection |
| 17 | OAuth CSRF protection | ✅ Built | State param stored in httpOnly cookie (10min); validated in `/api/health/callback` before code exchange |
| 18 | Barcode SSRF prevention | ✅ Built | `/^\d{8,14}$/` validation on barcode before use; `encodeURIComponent` in OFF URL; 400 on bad format |
| 19 | Chat history injection prevention | ✅ Built | Role whitelist `['user','assistant']`; last 20 messages only; 2000 char/msg limit |
| 20 | Invite code enumeration prevention | ✅ Built | `invite/redeem` rate-limited (10/hr); unified error "Invalid or already used code" |
| 21 | Recovery code brute force prevention | ✅ Built | `2fa/use-recovery` rate-limited (5/hr via `api_rate_limits`) |
| 22 | Rate limit fail-closed | ✅ Built | `checkRateLimit` returns `{ allowed: false }` on DB error — was fail-open |
| 23 | Owner PIN serverless lockout | ✅ Built | Lockout persisted in `api_rate_limits` DB — survives cold starts |

---

## Untested — Needs QA
Remove items once tested and confirmed working.

### Supplement Chip Picker Upgrade
- Open Supplements → "+ Add" → verify nutrient section shows "+ Add nutrients" dashed button instead of text input rows
- Click button → picker opens with Minerals (blue), Vitamins (purple), Other (green) chips
- Add a few nutrients → number inputs appear with correct unit labels; × removes them
- Save supplement → card shows "Magnesium: 400mg" style labels (not raw keys)
- Edit existing supplement → nutrients pre-populated from structured format; save → correct keys/values stored
- Encyclopedia page → supplement coverage aggregates correctly from new numeric format

### Phase 52 & 53 — Active Workout Logger + Trainer Chatbot + Rest Timer
- `?` button on exercise during workout → detail modal opens instantly
- Cycle set type to "Drop Set" → purple info box appears below that row
- "🏁 Finish Workout" → post-workout check-in modal (difficulty + energy + optional note) appears before saving
- Pause mid-workout → redirects to plan page, shows "▶ Resume Workout"; tap Resume → elapsed time + sets restored; finish → saves as one session
- Complete workout → same-day button shows "✓ Done Today" (not a link)
- Pause → wait until next day → "▶ Resume Workout" is gone; partial session still in history
- `?` on exercise → scroll to bottom → ask a question → trainer reply in a few seconds; follow-up confirms multi-turn works
- Complete a working set → 90s rest timer bar auto-appears; test 30s/60s/90s/2m buttons; test ✕ dismiss

### Phase 52b — Exercise Library Additions
- Open `/life-hub/workouts/exercises` → confirm all 18 new exercises appear (Incline Dumbbell Curl, Zottman Curl, Dumbbell Preacher Curl, Dumbbell Reverse Fly, Inverted Row, Crunch, Dumbbell Side Bend, Leg Raise, Mountain Climber, Dead Bug, Hollow Body Hold, Goblet Squat, Dumbbell Step Up, Dumbbell Sumo Squat, Hip Thrust, Single Leg Deadlift, Rear Delt Fly, Dumbbell Push Press)
- Click each → detail modal opens with instructions, muscle tags, 🏋️ placeholder

### Phase 35 — Supplement Stack
- Life Hub → Nutrition → Supplements → "+ Add" → name + dose + timing + nutrient row → "Add to Stack"
- Card appears with dose badge, timing badge, nutrient chip
- "🤖 Info" → loading → full AI card; close and re-open → loads instantly (cached)
- Edit → change dose → save → card updates; × → card disappears
- Settings → Supplement Stack Reset → confirm → all removed

### Phase 34 — Drinks & Hydration
- Quick-add (e.g. +16 oz) → ring fills, entry appears in log
- × on entry → ring decreases
- Custom entry with earlier time → appears sorted by time in log
- Edit goal → save → ring recalculates; refresh → goal persists
- 7-day chart: today = blue; goal met = green
- Settings → Water Log History Reset → confirm → entries deleted

---

## Master Build Plan

**The canonical build order for everything remaining. Read this before starting any session.**
**Status:** 📋 Fully Specced (ready to build) | 💬 Discussed (spec needed before building) | ✅ Built

---

### Build Order — Sequenced by Dependency

Each phase below is a discrete build session. Phases must be built in order when they have dependencies. Independent phases can be reordered but the sequence below is the recommended priority.

---

#### Phase A — Feature 13: Retroactive Log Editing ✅ Built (Phase 70)

**Why now:** Feature 12 (editing mode) is the foundation. Feature 14 depends on this. Build it while the editing mode code is fresh.

**What to build:**
- Date picker button in the nutrition page header (calendar emoji, shows current date). Tapping opens a `<input type="date">` or a simple 7-day back picker (not a full calendar — just "Today / Yesterday / [day] / [day]..." chips up to 7 days back).
- Selecting a past date: fetches that day's entries via `GET /api/nutrition/log?date=YYYY-MM-DD`, replaces `entries` state, auto-enters editing mode (`startEditing()` with the `viewingDate` set), shows "Editing: [Day, Date]" label in the bottom bar instead of "X items added".
- Add button navigates to `/life-hub/nutrition/add-food?slot=[slot]&date=[date]` — the add-food page already passes `date` to the API, this just wires the param in.
- Done / Cancel returns to today's date and reloads today's entries.
- Insight call for past-day edits: pass `is_retroactive: true` and `days_ago: N` to the meal-insight API. Haiku prompt must use past-tense framing ("with those additions, Saturday now shows...") not forward-looking tips.
- Stale brief warning: if `daily_briefs` has a row for that date, show a subtle `⚠️ Data updated after brief was generated — Refresh` note under the brief on the Life Hub overview page. Refresh button calls POST on the brief API for that date only. No auto-regeneration.

**State changes needed in nutrition/page.js:**
- Add `viewingDate` state (default: today's date string)
- `startEditing()` accepts an optional `date` param — if passed, sets `viewingDate`
- All API calls in the food log section use `viewingDate` not hardcoded `today`
- Bottom bar label: if `viewingDate !== today`, show "Editing: [formatted date]" instead of session count
- `handleFinishEditing()`: after Done, reset `viewingDate` to today and reload today's entries

**sessionStorage change:** `nutrition_editing_since` key also stores `{ since: ISO, date: YYYY-MM-DD }` as JSON instead of a bare timestamp — so remount knows both when editing started AND which date was being viewed.

**Watch out for:**
1. The `today` and `yesterday` consts are defined at component top — don't use them inside the editing flow for past dates. Always use `viewingDate`.
2. The "Copy from yesterday" button must be hidden when `viewingDate !== today` — copying-to-yesterday makes no sense for past-day editing.
3. The add-food page's back navigation (`window.location.href = '/life-hub/nutrition'`) will reload the page and restore editing state from sessionStorage — this will correctly restore `viewingDate` if it's stored in the sessionStorage JSON.
4. The meal-insight API doesn't query the DB for the past date — it just uses what the client sends. No change needed on the API side other than respecting the `is_retroactive` flag in the prompt.
5. TDEE calibration card and TDEE suggestion should be hidden when viewing a past date — they're today-only features.

---

#### Phase B — Feature 14: Morning Log Review Pop-Up ✅ Built (Phase 71)

**Why now:** Depends on Feature 13 being built (the "Let me fix something" flow navigates to retroactive editing for yesterday). Build immediately after Phase A.

**What to build:**
- New component `DailyLogReview.js` in `src/components/nutrition/`. Mounts in `LifeHubLayout` (`src/app/life-hub/layout.js`) — same pattern as the check-in widget.
- Fires once per day in the morning window (after 5am, before noon). Check `localStorage` key `log_review_YYYY-MM-DD` — if already set, skip entirely.
- Fetches yesterday's summary: `GET /api/nutrition/log?date=yesterday` + workout_logs for yesterday + supplement_logs for yesterday + water_logs for yesterday. Bundle as a lightweight fetch from the component.
- Three states based on yesterday's data:
  - **Normal** (≥3 food entries and ≥1000 cal logged): show full summary card. Buttons: "✓ Looks good" (sets localStorage flag, dismisses) + "✏️ Let me fix something" (navigates to `/life-hub/nutrition?editDate=yesterday`).
  - **Sparse** (entries exist but < 1000 cal OR < 3 entries): show "Yesterday looked light" state. Buttons: "🍽️ I forgot — let me add it" / "🚫 I was fasting" / "💤 Rest day, that's accurate" / "Skip". First button navigates to retroactive editing; others set localStorage flag.
  - **Empty** (0 entries): show "You didn't log anything yesterday" state. Buttons: "🍽️ Let me backfill" / "👍 Intentional" / "Skip". First button navigates to retroactive editing; others dismiss.
- The component renders as a bottom-sheet (slide up from bottom, semi-transparent overlay, ~40% screen height).
- Dismissing by tapping the overlay or hitting Skip sets the localStorage flag.

**Watch out for:**
1. Mount it in `life-hub/layout.js`, not in individual pages — it should fire on any Life Hub page visit in the morning window.
2. The "Let me fix something" navigation must pass `?editDate=yesterday` as a URL param, and `nutrition/page.js` must read this param on mount to auto-trigger editing mode for that date. Use `useSearchParams()` for this — wrap in Suspense per the project's pattern.
3. Don't fetch yesterday's data on every Life Hub page mount — check the localStorage flag FIRST, and only fetch if the flag isn't set. This avoids unnecessary API calls.
4. The morning window check (`after 5am, before noon`) should use the user's local time, not UTC — use `new Date().getHours()` (already local time in the browser).
5. localStorage key format: `log_review_YYYY-MM-DD` where the date is YESTERDAY's date — the review is about yesterday, keyed to yesterday's date, not today's.

---

#### Phase C — Item 19: Work/Life Schedule Context ✅ Built (Phase 72)

**Why now:** This is the highest ROI unbuilt feature with the shortest build time. One UI addition + one JSONB column + injection into existing AI prompts. Build this before the intelligence layer (Items 17/18) because it makes every existing AI feature smarter immediately.

**Spec (completing from discussed state):**

**DB:** `alter table goals_profiles add column weekly_schedule jsonb;`
Format: `{ "mon": "active_work", "tue": "active_work", "wed": "active_work", "thu": "active_work", "fri": "active_work", "sat": "day_off", "sun": "day_off" }`
Four valid values per day: `active_work` | `desk_work` | `day_off` | `travel`

**UI:** Add to the Goals Setup "Your Context" step (Step 3 of 5 — the biggest_obstacles/motivations step). Below the existing inputs, add a new section: "**My Weekly Schedule**" with a 7-column grid (Mon–Sun). Each day shows a label and a small dropdown/pill picker with the 4 options. Defaults to `desk_work` for Mon–Fri, `day_off` for Sat–Sun. The picker is compact — 4 short pills per day, selected pill fills with orange (#f97316 — nutrition section color since this affects nutrition/health context).

Also add an edit widget on the Goals Overview page (under the lifestyle card) so the user can update it without going through full setup again.

**AI prompt injection — touch all these in the same commit:**
1. `daily-brief/route.js` — add schedule reading + inject into personalContext: "User's work schedule: Mon-Fri active_work (on feet all day), Sat-Sun day_off. Today is [day] — [label]. Factor this when interpreting step counts and HR."
2. `monthly-wrap/route.js` — inject schedule summary: "User has [N] active_work days and [M] day_off days per week."
3. `workouts/generate-plan/route.js` — already uses goals_profiles; inject schedule so the AI knows which days have high baseline activity.
4. `life-hub/daily-brief/route.js` step count commentary — if today is `active_work`, prefix step count context with "occupational steps" note.

**Watch out for:**
1. `weekly_schedule` can be null (existing users who haven't set it yet). All AI prompts must handle null gracefully — skip the schedule block entirely if null, don't inject "User's schedule: null".
2. The Goals Setup step already saves to `goals_profiles` — add `weekly_schedule` to the upsert payload. Don't create a separate save.
3. Days of week: store as `mon/tue/wed/thu/fri/sat/sun` (lowercase 3-letter keys) — consistent with JavaScript's `getDay()` mapping after adjustment.
4. The standalone Goals Overview edit widget should PATCH only the `weekly_schedule` column — don't re-save the full goals_profiles row (risk of overwriting other fields with stale values from state).

---

#### Phase D — Feature 16: AI Post-Workout Coaching Response ✅ Built (Phase 73)

**Why now:** Independent of the intelligence layer — no dependencies on Items 17/18. High value, contained build. The post-workout note is the most underused piece of data in the app right now.

**What to build:**
- New API route: `POST /api/workouts/coaching-response` — Haiku, rate-limited 1/workout via `api_rate_limits` (key: `coaching-response-YYYY-MM-DD`), `getUser()` + `is_disabled` check.
- Payload (all client-sent, assembled on the workout log page after check-in form submit):
  - `user_note` (free text from post-workout check-in)
  - `difficulty` (1–5), `energy_after` (1–5)
  - `duration_seconds`, `exercises_completed[]`, `sets_completed`, `sets_skipped`
  - `hr_zones` (fat_burn_min, cardio_min, hard_min, peak_min, avg_bpm) — already computed
  - `pre_workout_calories` (today's food log total at workout start time)
  - `pre_workout_carbs_g`, `pre_workout_caffeine_mg`
  - `water_oz_today`
  - `sleep_score_last_night` (from health_sleep_sessions)
  - `morning_energy_rating` (from daily_checkins)
  - `back_to_back_days` (boolean — was yesterday also a workout day?)
  - `workouts_this_week` (count)
  - `resting_hr_today`, `resting_hr_baseline` (7-day avg)
  - `data_completeness_pct` (calories_logged / calorie_target × 100, capped at 100)
- Haiku system prompt key rule: if `data_completeness_pct < 60`, preface any nutrition-based hypothesis with "based on what you logged" — never state nutrition causes as fact when data is sparse.
- Response: `{ coaching: "2–4 sentence response" }` — conversational, specific, cites actual numbers from the payload.

**UI change in `/life-hub/workouts/log/page.js`:**
- After the post-workout check-in form submits, instead of immediately showing the completion screen, fire the coaching API call.
- Show a brief loading state ("🤖 Analyzing your workout...") where the coaching response will appear.
- Coaching response appears as the first card on the completion screen — above the stats summary. Style: dark card with left orange border, 🤖 icon, text body.
- Stats summary (sets, duration, etc.) appears below the coaching card as usual.
- If API call fails or times out (3 seconds), skip silently — show the stats-only completion screen with no coaching card.

**Data assembly on the client:**
- The log page already has `entries` state (today's food log) from a previous fetch. Compute `pre_workout_calories` by summing entries where `created_at` is before `workoutStartTime`.
- `sleep_score_last_night`: the log page doesn't currently fetch this. Add a lightweight `GET /api/health/sync` cache read for yesterday's sleep score — or just skip it and mark the field as optional. Better to build without it first and add later.
- `back_to_back_days`: query `workout_logs` for yesterday's date — if a row exists, `true`.

**Watch out for:**
1. The completion screen already exists in `log/page.js` — don't rebuild it, just prepend the coaching card.
2. `data_completeness_pct` at workout time is likely to be very low for morning workout users (they haven't logged much yet). The "based on what you logged" caveat is essential — without it, Haiku will confidently diagnose under-eating when the user just hasn't logged yet.
3. Rate limit key must be date-based (`coaching-response-YYYY-MM-DD`) not call-count-based — one response per workout per day, not one per hour.
4. The free text `note` from the check-in form is user-supplied — wrap it in `<user_input>` tags in the AI prompt per the prompt injection protection rule.
5. Don't block the UI waiting for this response indefinitely. Set a 3-second timeout client-side; if exceeded, resolve with no coaching card.

---

#### Phase E — Feature 15: Workout Logger UX Improvements ✅ Built (Phase 74)

**Why now:** Independent. Two focused UX fixes, no AI, no new tables. Build together in one session.

**Fix 1 — Auto-scroll after set completion:**
In `log/page.js`, when the user taps ✓ on a set, after updating state, find the next incomplete set for that exercise. If none, find the first incomplete set of the next exercise. `scrollIntoView({ behavior: 'smooth', block: 'center' })` on that element. Use a `ref` map keyed by `${exerciseId}-${setIndex}` to track DOM nodes for each set row.

**Fix 2 — Add exercise mid-workout FAB:**
A floating action button (purple circle, `+` icon) fixed at bottom-right of the workout page, above the rest timer bar (z-index between rest bar and any modals). Tapping opens the existing exercise picker modal (already exists on the workout plan page — import/share the component, don't rewrite it). Selected exercise is added to the current session's exercise list with an "Added mid-workout" chip/badge. Sets added to this exercise are logged normally.

**Watch out for:**
1. The FAB must not appear when the rest timer overlay is visible — either hide it during rest timer display or stack z-indices correctly so it's not accidentally behind the timer.
2. Auto-scroll should not fire on the initial render — only after a user tap. Guard with a `userInteracted` ref initialized to `false` and set to `true` on first set-complete.
3. The mid-workout added exercise should be distinguishable in the session (for the overload suggestion on the completion screen) — add an `added_mid_workout: true` flag to the exercise object in state.

---

#### Phase F — Item 17: Persistent Coach Memory ✅ Built (Phase 75)

**Why now:** This is the foundation of the intelligence layer. Items 18 and Feature B both inject coach_memory. Must be built before them.

**Spec (completing from discussed state):**

**DB migration:**
```sql
create table coach_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category text not null check (category in ('nutrition', 'sleep', 'workout', 'physical', 'lifestyle', 'goal_progress')),
  observation text not null,
  confidence smallint default 3 check (confidence between 1 and 5),
  data_points int default 1,
  first_seen_at timestamptz default now(),
  last_confirmed_at timestamptz default now(),
  is_active boolean default true
);
alter table coach_memory enable row level security;
create policy "user reads own memory" on coach_memory for select using (user_id = auth.uid());
-- Insert/update only by service role (Edge Function) — no user-facing write policy
```

**Supabase Edge Function: `supabase/functions/generate-coach-memory/index.ts`**
Scheduled via pg_cron: Sunday night at bedtime - 1hr (falls back to 9pm EST).
Logic per user:
1. Fetch 90 days of data: food_log_entries (avg macros, protein hit rate, weekend vs weekday patterns), daily_checkins (energy/mood trends, note keywords), workout_logs (frequency, difficulty, energy_after, back-to-back patterns), health_sleep_sessions (sleep score, correlations), body_measurements (weight trend, progress rate), supplement_stack (what they take), stretch_logs (frequency), water_logs (hydration patterns), goals_profiles (targets).
2. One Haiku call with a structured 90-day data dump. Return format: `[{ category, observation, confidence, data_points }]` — 5–10 observations.
3. **The generation prompt MUST include this instruction explicitly:** "For every gap or negative pattern you find, also identify at least one POSITIVE pattern — something the user does that reliably produces a good outcome. State it as a reproducible formula: 'When [condition A] + [condition B], [outcome C] consistently follows.' Without this, only deficits are noticed. The most useful coaching observations are positive formulas the user can intentionally recreate."
4. Upsert logic: for each returned observation, check if a similar observation exists (same category + similar semantic content — use pg_trgm similarity or just match on category + first 50 chars). If match: bump `confidence` + update `last_confirmed_at` + increment `data_points`. If new: insert. Mark as `is_active = false` any observation last confirmed > 60 days ago.

**Injection helper (shared across all AI routes):**
Create `src/lib/coachMemory.js`:
```js
export async function getCoachMemoryContext(supabase, userId) {
  const { data } = await supabase
    .from('coach_memory')
    .select('category, observation, confidence')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false })
    .limit(8)
  if (!data?.length) return ''
  return `WHAT I KNOW ABOUT THIS USER (treat as established facts, not assumptions):\n${data.map(m => `- [${m.category}] ${m.observation}`).join('\n')}`
}
```

**Inject into these routes in the same commit:**
1. `daily-brief/route.js` — prepend to personalContext block
2. `workouts/coaching-response/route.js` (Phase D) — prepend to system prompt
3. `checkin/insight/route.js` (Phase G) — prepend to system prompt
4. `workouts/exercise-chat/route.js` — prepend to system prompt
5. `nutrition/meal-insight/route.js` — prepend to system prompt

**Watch out for:**
1. The Edge Function runs as service role — it can read all user data. Be careful the query only fetches data for ONE user at a time when iterating. Don't accidentally cross-contaminate.
2. The Edge Function is NOT a Next.js route — it runs TypeScript in Deno. The Supabase client initialization is different from the app's `createClient()`. Use `createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))`.
3. coach_memory observations are user-generated in the sense that they're about the user — but they're AI-written. They must NOT be wrapped in `<user_input>` tags. They ARE AI-generated, curated facts, not untrusted external input.
4. The injection helper `getCoachMemoryContext()` adds a DB query to every AI route. If coach_memory is empty (new user), it returns an empty string — the AI prompt stays unchanged. Zero overhead for new users.
5. Don't add coach_memory injection to owner-only routes (`generate-templates`, `generate-flashcards`) — those aren't personal coaching routes.

---

#### Phase G — Item 18 + Feature B: Real-Time Check-In Intelligence 💬→📋

**Why now:** Depends on Phase F (coach_memory). Build together — Feature B (the check-in UI) and Item 18 (what the check-in response does with today's plan) are the same feature from two angles.

**Spec (completing from discussed state):**

**DB migration:**
```sql
alter table daily_checkins add column afternoon_energy smallint check (afternoon_energy between 1 and 5);
alter table daily_checkins add column afternoon_mood smallint check (afternoon_mood between 1 and 5);
alter table daily_checkins add column afternoon_note text;
alter table goals_profiles add column wake_time time;
alter table goals_profiles add column bedtime time;
```
`wake_time` and `bedtime` collected during Goals Setup Step 2 (body metrics step — add two time inputs). Default wake_time to 07:00, bedtime to 22:30 if not set. Also used by the push notification system and Weekly Wrap generation.

**New API route: `POST /api/checkin/insight`**
- Haiku, rate-limited 2/day (one per window), `getUser()` + `is_disabled` check
- Receives: `{ window: 'morning'|'afternoon', energy_rating, mood_rating, note, sore_spots[], todays_exercises[], sleep_score, deep_sleep_min, rem_sleep_min, yesterday_workout, today_calories_so_far, today_caffeine_mg, today_steps, rolling_7day_morning_avg, rolling_7day_afternoon_avg, coach_memory_context }`
- Response: `{ insight: "2 sentence string", proposed_actions: [] }`
- `proposed_actions` format: `[{ type: 'swap_exercise', from_exercise, to_exercise, reason }, { type: 'flag_stretch', stretch_id, session_type }]`
- The Haiku prompt must read today's exercises and check which ones conflict with mentioned sore spots. Standard conflict mappings to include in the system prompt: shoulder sore → avoid Overhead Press, Lateral Raise, Arnold Press; hip sore → avoid Lunges, Bulgarian Split Squats, Deep Squats; knee sore → avoid step-ups, leg press at deep angles; lower back sore → avoid deadlifts at max weight, bent-over rows (modify, don't skip).
- The `note` field is user-supplied — wrap in `<user_input>` tags.
- `coach_memory_context` comes from the client (already fetched or passed from layout) — do NOT re-fetch from DB in this route (respecting the context snapshot pattern).

**Check-in UI: two bottom-sheet pop-ups per day**
Location: `src/app/life-hub/layout.js` — two `useEffect`s.
- Morning window: fires within 60 min of `wake_time` (from goals_profiles). If `wake_time` null, fire at 7am.
- Afternoon window: fires at `wake_time + 7 hours`.
- localStorage keys: `checkin_morning_YYYY-MM-DD` and `checkin_afternoon_YYYY-MM-DD` (today's date).
- The layout loads `goals_profiles.wake_time` and `goals_profiles.bedtime` on mount (already has a Supabase client from existing layout code).
- Check-in sheet state: `sheetVisible` ('none' | 'morning' | 'afternoon'), 30-second delay after page load before showing.

**After save flow (key — this is where Item 18 happens):**
1. User submits morning check-in ratings + note
2. Client assembles the payload (energy, mood, note, sore_spots, today's exercises from workout plan, coach_memory from layout state, sleep data from last health sync)
3. POST to `/api/checkin/insight`
4. Response arrives: show `insight` text in the bottom sheet for 4 seconds, then close
5. Store `proposed_actions` in layout state as `pendingWorkoutSuggestions`
6. Navigate back to current page — `pendingWorkoutSuggestions` is now available in layout context

**Sore spot auto-population (stretching page integration):**
Parse the morning check-in note client-side with a simple keyword map:
```js
const SORE_SPOT_KEYWORDS = {
  shoulder: ['shoulder', 'shoulders', 'rotator'],
  hip: ['hip', 'hips', 'hip flexor'],
  knee: ['knee', 'knees'],
  lower_back: ['back', 'lower back', 'lumbar'],
  hamstring: ['hamstring', 'hamstrings'],
  calf: ['calf', 'calves', 'shin'],
}
```
Store extracted sore spots in layout state. Stretching page reads them from context and pre-checks those chips on mount.

**Watch out for:**
1. The 30-second delay before showing the check-in sheet must use `setTimeout` in a `useEffect` cleanup — clear the timeout in the cleanup function to prevent showing on unmount.
2. The layout fires the 30-second timer on EVERY page navigation within Life Hub (each page mount resets). Use a `hasShownToday` ref in the layout (not state — state resets on navigation, ref persists) to prevent showing more than once per session.
3. The context snapshot pattern: on morning check-in submit, the client fetches coach_memory once (from a lightweight endpoint or from an already-fetched layout state value) and includes it in the payload. Subsequent "Keep Talking" turns (Phase H) re-send the SAME coach_memory snapshot — no new DB queries.
4. `todays_exercises` comes from workout plan state — the layout doesn't have this. Either (a) the layout fetches today's plan on mount alongside other data, or (b) the check-in sheet receives it as a prop from wherever the workout plan is already loaded. Option (a) is simpler.
5. The `proposed_actions` from the insight response need to be available on the Workout Plan page. Store them in layout state (Context API or a simple prop-drill via `layoutData`). The Workout Plan page reads `pendingWorkoutSuggestions` from this state.

---

#### Phase H — Feature D + Feature E: Workout Suggestions + Keep Talking 💬→📋

**Why now:** Feature D requires `proposed_actions` from Phase G (the check-in insight). Feature E (Keep Talking) uses the context snapshot pattern from Phase G. Build together.

**Spec (completing from discussed state):**

**Feature D — Workout Suggestions Button:**

DB migration:
```sql
create table workout_session_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  original_exercise text not null,
  override_exercise text not null,
  reason text,
  applied_at timestamptz default now()
);
alter table workout_session_overrides enable row level security;
create policy "user manages own overrides" on workout_session_overrides for all using (user_id = auth.uid());
```

On the Workout Plan page, today's day card gets a small "Suggestions" button (top-right, subtle grey). If `pendingWorkoutSuggestions` has items relevant to today's exercises, show an orange dot on the button.

Tapping → bottom sheet with individual suggestion cards. Each card:
- Exercise being swapped (original → replacement)
- One sentence reason citing the user's actual check-in words
- "✓ Apply" button → writes to `workout_session_overrides` table, updates plan display for today only (original exercise greyed out, replacement shown with a "Modified today" chip)
- "Skip" → dismisses that suggestion, leaves plan unchanged

The workout log page reads `workout_session_overrides` for today on mount and applies them to the exercise list before displaying. The saved `workout_plans` record is NEVER modified.

**Feature E — "Keep Talking":**

After the check-in insight response is shown in the bottom sheet, add a small "💬 Keep Talking" link at the bottom.

Tapping opens a minimal chat interface (bottom-sheet expands to 70% screen height, or navigates to a dedicated `/life-hub/chat` page).

State: `messages[]`, `contextSnapshot` (the exact payload sent on turn 1 — frozen, never re-fetched), `turnCount` (starts at 1 since the initial insight was turn 1).

API route: `POST /api/checkin/chat` — Haiku, separate rate limit (8 turns/session, 3 sessions/day). Receives: `{ messages[], contextSnapshot, turn_count }`. Response: `{ message, proposed_actions[] }`.

The contextSnapshot is the SAME object sent on the initial insight call — the client just includes it on every follow-up call. The API does NOT re-fetch DB data. The snapshot becomes the AI's knowledge base for the conversation.

Rate limit enforcement: `turn_count >= 8` → replace "Keep Talking" input with "Max conversation length reached. Start a new conversation." Client enforces this client-side first (no API call on turn 9+), API also checks via rate limiter.

Proposed actions from any turn in the conversation are rendered as inline apply-cards below each AI message (see Feature E spec above).

**Watch out for:**
1. The `contextSnapshot` is assembled on the CLIENT from already-loaded state, not fetched from the DB at conversation time. If the user's data changes during the conversation (they log food, complete a workout), the snapshot is stale — this is intentional and acceptable. The conversation is anchored to the moment it started.
2. Never log the `contextSnapshot` to the console in production — it contains health data.
3. The `proposed_actions` from conversation turns (not just the initial insight) also go into `pendingWorkoutSuggestions` — append, don't replace. User might accept suggestions across multiple turns.
4. "Keep Talking" rate limit (3 sessions/day) is separate from the initial check-in insight rate limit (2/day) — use different `p_route` keys in `increment_rate_limit`.
5. If the user applies a stretch via `type: 'add_stretch'`, it should write to `stretch_logs` with today's date and `session_type: 'pre_workout'` (or whatever was suggested). The stretch shows up in Stretching page history. Don't just show it as a recommendation chip — log it for real.

---

#### Phase I — Item 20: Stretch System Overhaul 💬→📋

**Why now:** Depends on Phase G (sore spot auto-population from check-in is already built). Independent of Items 21/22.

**Spec (completing from discussed state):**

**A. Proactive "Today's Stretches" card on Workout Plan page:**
- Below today's exercise list, add a "🧘 Stretches for Today" card.
- Calls `getRecommendedStretches(bodyParts, soreSpots)` from `stretches.js` — already exists.
- Shows 3–5 stretch names with timing labels (see B below). Tap to expand inline. "Open Stretching Page" link at bottom.
- If sore spots exist (from Phase G check-in parsing), top 2 recommended stretches are flagged with "⚠️ Sore area — modified approach" and include the injury-aware copy (see C below).

**B. Timing guidance — add to `stretches.js` data:**
Each stretch already has `stretch_type: 'dynamic'|'static'|'both'`. Add `ideal_timing` field per stretch:
- Dynamic → `'pre_workout'` — display: "Do this 10–15 min BEFORE your workout. Needs blood moving first."
- Static → `'post_workout_or_bed'` — display: "Do this AFTER your workout when muscles are warm, or 10 min before sleep."
- Both → `'anytime'`

Add `timing_note` to the recommendation cards on the Stretching page (it's shown in context, not just in the library). The stretching page currently shows just the stretch name and how-to — add the timing line below the name.

**C. Injury-aware modification language:**
On the Stretching page, when a sore spot is active for a body part that this stretch targets, replace the standard instructions with a modified version. This doesn't require new stretch data — it's a rendering decision. If `soreSpots.includes(stretch.muscle_group_key)`, show this block above the normal instructions:
> "Your [body part] is sore — still do this stretch, but don't push past a 4/10 sensation. When injured, the goal is blood flow and gentle range of motion, not depth. Pushing into pain triggers the stretch reflex (muscle contracts to protect itself), making the problem worse. Ease in slowly and hold without bouncing."
This is static copy — not AI-generated. Same text every time, parameterized only by the body part name.

**D. Stretch-sleep correlation (coach_memory integration):**
The weekly coach_memory Edge Function (Phase F) already queries `stretch_logs`. Add this check to the generation prompt: "Check if nights where the user logged any stretch session correlate with higher sleep scores vs nights without. If the correlation is notable (≥5 point avg difference on ≥5 data points each), write it as a `sleep` category observation: 'User's sleep score averages X on nights with pre-sleep stretching vs Y without.'"
No new code outside the Edge Function prompt — it uses existing data.

**E. "Why this stretch" inline education:**
On the Stretching page recommendation cards (not the library — the library already has this), add a small "Why?" toggle below each stretch card. Tapping reveals 3 sentences from the stretch's existing `how_to` or a new `why` field added to `stretches.js`. The field is: what muscle/tissue, why it gets tight, what happens if it stays tight.
Add `why` field to all 38 stretches in `stretches.js` in the same commit.

**Watch out for:**
1. Adding `ideal_timing` and `why` to all 38 stretches in `stretches.js` is a large data edit — use batch Edit calls, not one per stretch.
2. The Stretching page currently fetches sore spots from `daily_checkins`. After Phase G, sore spots also come from check-in note parsing (layout state). The page should use BOTH sources: DB-saved sore spots + layout-state parsed sore spots, merged. If the same body part appears in both, de-duplicate.
3. The "Today's Stretches" card on the Workout Plan page needs `bodyParts` from today's plan (already available on that page) — pass to `getRecommendedStretches()` directly.

---

#### Phase J — Item 21: Micronutrient Daily Awareness 💬→📋

**Why now:** Independent — no dependency on the intelligence layer. Can be built alongside Phase I.

**Spec (completing from discussed state):**

**Where it renders:** New card on the Nutrition page, between the macro ring section and the Food Log section (above the tab bar). Only shown when `activeTab === 'log'` and there are logged entries for today.

**Three callout types (evaluated in priority order — show the highest-priority 2–3):**
1. **Over 150% DV:** `sodium_mg > 3450` (150% of 2300mg DV) → "Sodium is [X]% of your daily target today — drink an extra glass of water, sodium draws water from cells."
2. **Under 20% DV by time of day:** If current hour ≥ 15 (3pm) and a tracked micro is < 20% of its DV → "[Nutrient] is at [X]% by 3pm — hard to catch up before the end of the day. [Food source suggestion]."
3. **Absent 3+ consecutive days:** Check last 3 days' `food_log_entries`. If a micro is 0 in all 3 → "[Nutrient] hasn't appeared in your log in 3+ days. [One-line context about why it matters]."

**Static callout copy per nutrient (write once, hardcoded in the component):**
```js
const MICRO_CALLOUT_COPY = {
  vitamin_d_mcg: {
    absent: "Vitamin D hasn't appeared in 3+ days — few foods contain it naturally; sunlight or a supplement is usually the only reliable source.",
    low: "Vitamin D is at {pct}% by {time} — it's fat-soluble, so having it with a meal that has fat helps absorption.",
  },
  iron_mg: {
    low: "Iron is at {pct}% by {time} — pair it with something acidic (lemon, tomato, vitamin C) to roughly double absorption. Avoid coffee or tea within 30 min of iron-rich foods.",
    over: "Iron is at {pct}% today — high doses on an empty stomach cause GI discomfort; space out sources if you're supplementing.",
  },
  omega3_g: {
    absent: "Omega-3 hasn't appeared in 3+ days — without fatty fish or supplementation, inflammatory responses slow recovery.",
  },
  magnesium_mg: {
    low: "Magnesium is at {pct}% by {time} — it's involved in muscle relaxation and sleep quality; low magnesium often shows as night cramps or restless sleep.",
  },
  sodium_mg: {
    over: "Sodium is at {pct}% of your daily target — your water target has adjusted upward to compensate.",
  },
  calcium_mg: {
    low: "Calcium is at {pct}% by {time} — pair dairy or fortified foods with vitamin D for better absorption.",
  },
  // ... extend for all 15 tracked micros
}
```

**Sodium → water goal integration (the existing "wow" moment):**
This already exists conceptually. The callout should be consistent with whatever water goal adjustment logic already exists. If the sodium callout updates water goal, the callout text should say "your water target has adjusted" only if the adjustment actually happens — don't promise it if the code doesn't do it.

**The 3-day absence check:**
On page load, fetch yesterday and day-before-yesterday's entries (2 extra API calls) OR extend the existing load to pass `days: 3` to the log API and have it return the last 3 days. Comparing this against today's entries gives the 3-day picture. This is a lightweight query — no new AI call.

**Watch out for:**
1. The DVs used for callout thresholds must come from `src/data/nutrients.js` (already has `rdv` per nutrient) and `calcMicroTargets(age, sex)` from `src/lib/tdee.js` — not hardcoded magic numbers. Always use the personalized DV.
2. The card should appear only if there's something actually worth surfacing. If all micros are in the normal range and none are absent, don't show the card at all. No "everything looks good" filler.
3. The sodium callout is the gold standard — it's specific, reactive, and says what it means. Every callout must meet this bar: what the data shows + what it means for the user in one sentence. No generic "this nutrient is important."
4. The 3-day absence check runs on page load — cache it in state, don't recompute on every render.

---

#### Phase K — Item 22: Teaching Philosophy / ℹ️ Touchpoints 💬→📋

**Why now:** This is additive — it adds ℹ️ chips to existing data displays across multiple pages. Build last in the intelligence sequence because it requires all the underlying features to be stable first.

**Spec (completing from discussed state):**

**Pattern:** A small `ℹ` chip next to any data point that requires domain knowledge. Tapping shows a 150-word inline card that slides open below the chip (no modal — inline expansion, same pattern as the existing sleep education cards on the Sleep Tracker page). The card is static copy — no AI, no DB query.

**First 6 touchpoints to build (prioritized by "user will see this and not know what it means"):**

1. **Sleep score number** (Sleep Tracker page) — already has education cards for stages; add ℹ to the score number itself.
   > "Your sleep score is a composite of four things: total duration (did you get enough?), deep sleep % (did your body repair?), REM % (did your brain process?), and efficiency (time in bed vs time asleep). A score in the 50s usually means you got the duration but not the quality — you can be in bed 8 hours and get a 52 if most of it was light sleep."

2. **Recovery Score number** (Life Hub overview) — the 5-component composite.
   > "Recovery Score is a 0–100 composite of: sleep quality (0–30 pts), protein intake vs target (0–20 pts), hydration (0–20 pts), yesterday's energy check-in (0–15 pts), workout load balance (0–10 pts), and recent stretching (0–5 pts). A 100 doesn't mean you're perfect — it means all the inputs the app can measure are in good ranges."

3. **Body recomposition state** (Measurements page — when measurements go up while weight goes down)
   > "This is body recomposition — your fat-free mass (muscle, bone, glycogen, stored water) is increasing while fat is decreasing. The scale treats both the same weight. Arms and chest growing while your waist stays flat or shrinks is one of the most positive signals the data can show — it means the program is working even when the scale doesn't move."

4. **HRV number** (Heart Rate page)
   > "HRV (Heart Rate Variability) measures the variation in time between heartbeats. Higher variability = your nervous system is relaxed and adaptive. Lower variability = your body is under stress, recovering from illness, or in early overtraining. Unlike resting HR (which takes weeks to move), HRV responds within 24–48 hours — it's one of the fastest signals your body gives you."

5. **Resting HR number** (Heart Rate page)
   > "Resting Heart Rate is how many times your heart beats per minute when completely at rest. Lower is generally better — your heart is pumping more blood per beat, so it doesn't have to work as hard. RHR typically drops 5–15 bpm over months of consistent cardio. It rises temporarily with illness, alcohol, poor sleep, or overtraining — so spikes are often more informative than the baseline."

6. **Static stretching before bed recommendation** (Stretching page, when `session_type === 'standalone'` at night)
   > "Static stretching 10–15 minutes before sleep activates your parasympathetic nervous system — the 'rest and digest' mode. Slow, held stretches lower cortisol and heart rate. The breathing pattern (slow exhales during holds) directly signals your nervous system to downshift. People who stretch before sleep typically fall asleep faster and spend more time in deep sleep."

**Implementation:**
- Create `src/components/InfoChip.js` — a reusable component. Props: `text` (the education copy), `label` (optional — defaults to "ℹ"). Renders as a small chip. On tap, toggles an inline expansion div below it with the education text. No props for color/style variants — all instances are the same style (grey chip, orange on active).
- Add the chip to each of the 6 locations above in the same commit.
- No DB interaction, no AI call. Purely static, purely additive.

**Watch out for:**
1. The InfoChip must work in both light and dark theme (the app uses CSS variables for colors). Test in both.
2. Don't add ℹ chips to things that are self-explanatory (calories, protein grams, step count). Only add them where domain knowledge is required to interpret the number.
3. Keep the education copy under 150 words per chip. Longer defeats the purpose — if you need more, it means the data point needs its own dedicated page (like the Nutrient Encyclopedia).
4. The sleep education cards already on the Sleep Tracker page are the right pattern — review those before implementing to match the visual style exactly.

---

#### Phase L — Weekly Wrap Page 📋

**Why now:** Fully specced, independent of the intelligence layer. Can be built in any order relative to Phases F–K, but build after Phase D (post-workout coaching) since the Weekly Wrap benefits from that data being populated.

**What to build:**
1. DB migration: create `weekly_wraps` table with RLS (see schema in spec above).
2. API routes:
   - `GET /api/life-hub/weekly-wrap` — returns all past `week_start` dates (for history sidebar). No param → list. `?week=YYYY-MM-DD` → returns single wrap or 404.
   - `POST /api/life-hub/weekly-wrap` — generates wrap for a completed past week. Same structure as monthly-wrap generation: gather data from 8+ tables for the week, call Sonnet, cache result, never regenerate. Uses `getUser()` + `is_disabled` check. The Claude prompt must include the "Next Week Setup" section as a **required output** (see spec above — one actionable observation pointing forward based on this week's patterns).
3. Page: `/life-hub/weekly-wrap/page.js` — week picker (← → chips showing "Week of Jul 7"), stat cards, AI narrative, history sidebar. "Week in progress" placeholder for current week.
4. Sidebar: add "Weekly Wrap" under Overview group (alongside "Monthly Wrap" and "Daily Brief"), in `LifeHubSidebar.js`.
5. Monthly Wrap upgrade: once weekly_wraps table has data, update `monthly-wrap/route.js` POST handler to query weekly_wraps for the month's weeks first, use their `report_data` as the primary data source instead of raw table queries.

**Watch out for:**
1. "Week start" is always Monday. Use `getMonday(date)` helper: `const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().split('T')[0]`.
2. Current week (today's week) must show "Week in progress" — don't let users generate a wrap mid-week. Block at both the API level (return 400 if `week_start` is the current week) and UI level (hide Generate button).
3. The "Next Week Setup" section is required in every wrap narrative. Add it to the Claude system prompt as: "Your response MUST end with a section titled 'Next Week' containing exactly one actionable observation. Format: 'The one thing most likely to improve next week based on this week's patterns: [specific action tied to observed data].' This section is required — do not omit it."
4. pg_cron for automatic Sunday generation is part of Phase M (push notifications infrastructure). For now, the Generate button is manual — user triggers it for past completed weeks.
5. The CLAUDE.md directory structure and Database Tables sections must be updated in the same commit.

---

#### Phase M — Push Notifications + Three-Brief System 📋

**Why last:** Complex infrastructure. pg_cron + Edge Functions + VAPID keys + service worker changes. Build after everything else is stable. Follow the 7-step build order documented in the Push Notifications spec above exactly — don't skip steps.

**Key things that are NOT in the spec above that need to be done:**
1. `daily_briefs` table needs a `window` column added: `alter table daily_briefs add column window text default 'morning' check (window in ('morning', 'afternoon', 'evening'));` — and the UNIQUE constraint changes from `(user_id, date)` to `(user_id, date, window)`. This is a breaking migration — need to handle existing rows (set `window = 'morning'` for all existing rows before adding the constraint).
2. `goals_profiles.wake_time` and `goals_profiles.bedtime` added in Phase G — confirm they exist before building this phase.
3. The service worker (`public/sw.js`) already exists for PWA. Add push handler to it — don't replace the file, append to it.
4. VAPID keys must be generated on your local machine (`npx web-push generate-vapid-keys`), saved to a password manager, and added to BOTH Vercel env vars AND Supabase Edge Function secrets before any code is deployed.
5. The Edge Function is TypeScript/Deno, not Node.js. Import style is different: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`. Don't try to import from `@/lib/` — those are Next.js paths and don't exist in the Supabase Edge Function runtime.

---

### Dependency Map (quick reference)

```
Phase A (Feature 13 — retroactive editing)
  └── Phase B (Feature 14 — morning review popup)

Phase C (Item 19 — work/life schedule)  ← independent, build early

Phase D (Feature 16 — post-workout coaching)  ← independent

Phase E (Feature 15 — workout logger UX)  ← independent

Phase F (Item 17 — coach_memory table + Edge Function)
  └── Phase G (Item 18 + Feature B — real-time check-in intelligence)
        └── Phase H (Feature D + E — suggestions + keep talking)
              └── Phase I (Item 20 — stretch system overhaul)

Phase J (Item 21 — micro daily awareness)  ← independent (can run parallel to F-I)
Phase K (Item 22 — ℹ️ touchpoints)  ← independent (build last, needs stable features)
Phase L (Weekly Wrap)  ← mostly independent, pg_cron part waits for Phase M
Phase M (Push Notifications + Three-Brief System)  ← build last
```

**Recommended session order:**
1. Phase A → B (nutrition editing chain — context is warm)
2. Phase C (work/life schedule — quick win, high AI value)
3. Phase D (post-workout coaching — independent, high value)
4. Phase E (workout logger UX — quick polish)
5. Phase F (coach_memory — foundation of intelligence layer)
6. Phase G (check-in intelligence — requires F)
7. Phase H (suggestions + keep talking — requires G)
8. Phase J + K (micro awareness + info chips — can parallelize)
9. Phase I (stretch overhaul — requires G for sore spots)
10. Phase L (Weekly Wrap)
11. Phase M (push notifications — last, most complex)

---

## Future Features — Planned Design

**Status tags:** 💬 Discussed | 📋 Fully Specced | ⏳ Pending Build

Build order is listed within each section. The overall priority is: Goals Setup expansion → Nutrition intelligence → Stretching & Mobility → remaining Workout improvements.

---

### 🎯 Goals & Body Setup

**1. Age-Specific Framing Copy** — ✅ Partially built (age callouts in Goals Setup step 5); remaining: nutrition page showing age-adjusted targets vs FDA defaults side-by-side
- Under 18: "You're still growing — bone density builds during these years. We've kept your deficit conservative to protect this window." Deficit capped at 300 cal/day for teens.
- 18–25: "Your body is in its peak building window — this is the best time to establish a strong base."
- 25–35: "Your metabolism is beginning a gradual slowdown — the numbers reflect a small adjustment."
- 35–50: "After 35, muscle is harder to maintain — your protein target is slightly higher to compensate."
- 50+: "After 50, protein and calcium needs actually increase. Your targets are higher than the generic FDA averages on purpose."

**2. `gain_weight` Goal Option** — ✅ Built (Phase 51)

**3. Dietary Preferences Wired Downstream** — ✅ Built (Phase 50)

**4. Orphaned Inputs — Wire Up Remaining** — ✅ Built (Phase 55 + Phase 68)
- `biggest_obstacles` → workout plan AI prompt (injury-aware adjustments) [Phase 55]
- `primary_motivations` + `why_goals` → Daily Brief personalization (tone shaping) [Phase 55]
- `sleep_hours` → Daily Brief sleep target vs actual gap when relevant [Phase 55]
- `mood_level` → Daily Brief mood streak [Phase 68]
- `post_workout_difficulty/energy/note/hr_zones` → Daily Brief yesterday's workout coaching context [Phase 68]
- `dietary_preferences` → Daily Brief nutrition commentary [Phase 68]
- `calorie_history_note` → Daily Brief as ground truth overriding formula estimates [Phase 68]
- `primary_motivations/biggest_obstacles/why_goals/dietary_preferences` → Monthly Wrap personal context [Phase 68]
- `workout_days/equipment/cardio_options` → actually persisted to workout_profiles (were silently lost) [Phase 68]

**17. Persistent Coach Memory (`coach_memory` table)** — 💬 Discussed

The "brand new coach each day" problem: every AI brief, workout response, and meal insight currently runs from a fresh context window — it sees today's data and maybe 7–30 days of aggregated stats, but it has no learned knowledge about this specific user's patterns, tendencies, or exceptions. The result feels like a smart coach who's seeing your file for the first time every morning.

**Two distinct layers of memory:**

*Layer 1 — Persistent context (long-term facts):* Things that don't change day to day. Hip discomfort, recurring shoulder tightness, a bad knee. Behavioral patterns: always under-logs on weekends, actual TDEE is lower than formula, protein target is rarely hit. These live in `coach_memory` indefinitely and get injected into every AI prompt.

*Layer 2 — Real-time state (today's status):* The check-in note "tired, right shoulder sore, maybe slept poorly" is not a long-term fact — it's today's physical/mental state. This needs to change what happens TODAY: which exercises are flagged, which stretches are surfaced, what the check-in micro-response recommends. This is a separate, immediate action — not a stored observation.

**Layer 1 — coach_memory table:**
```sql
CREATE TABLE coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL, -- 'nutrition', 'sleep', 'workout', 'physical', 'lifestyle', 'goal_progress'
  observation TEXT NOT NULL, -- one plain-English sentence
  confidence SMALLINT DEFAULT 3, -- 1-5, increases with more supporting data
  data_points INT DEFAULT 1, -- how many data points support this observation
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

Examples of what gets written to coach_memory:
- "User reports ongoing hip discomfort — flag deep hip flexion exercises (lunges, deep squats, Bulgarian split squats) and always suggest a modification or substitute."
- "User's actual TDEE from 60 days of weight + food data is ~2,350 cal — formula said 2,720. All calorie commentary should use the empirical number."
- "User consistently logs energy ≤ 2 the day after back-to-back training days — this appears to be a genuine recovery pattern, not a sleep issue."
- "User rarely logs dinner on weekends — weekend calorie totals should be treated as likely incomplete."
- "Protein target of 160g is hit less than 20% of logged days — average actual is 98g. Acknowledge the gap without being repetitive."
- "User's best-rated workouts always follow 7.5+ hours of sleep. Sleep score below 60 correlates with difficulty ≥4 even on light days."

**Generation:** Weekly Supabase Edge Function (pg_cron, Sunday night) — one Haiku call per user with a structured 90-day data dump. Haiku returns 5–10 observations as `{ category, observation, confidence, data_points }` JSON. Edge Function upserts: new observations added, existing ones refreshed (confidence bumped), stale/broken patterns marked `is_active=false`.

**Injection:** Every route with a `personalContext` block gets a `WHAT I KNOW ABOUT THIS USER (treat as established facts)` section prepended — top 5–8 active observations, sorted by confidence desc.

The note field is the key input for physical context. Goals setup and check-in note should use placeholder text like "e.g. right hip tight, still sore from legs yesterday, low energy" to encourage specific, useful entries rather than vague diary-style notes.

**Conversation signal seeding:** When any conversational session ends (user closes, hits turn limit, navigates away), a lightweight POST to `/api/coach-memory/from-conversation` records structured signals — did the user apply swap suggestions, did they push back, what body parts were mentioned, any temporal patterns stated ("I always feel this way on Mondays"). These signals feed the weekly Edge Function alongside raw log data, so conversations actively train the coach over time.

**Positive pattern detection (must be explicitly in the generation prompt):** The weekly Edge Function must be instructed to look for WHAT'S WORKING, not just gaps. The most motivating coaching observations are positive reproducible patterns — "on days your sleep score is above 75 AND you eat breakfast before 9am AND hit 6k steps, your afternoon energy check-in is consistently 4–5. That combination is reproducible." The Haiku generation prompt must include an explicit instruction: "For every gap or negative pattern you find, also look for at least one positive pattern — something the user does that reliably produces a good outcome. State it as a reproducible formula the user can intentionally recreate." Without this instruction, Haiku will naturally skew toward identifying deficits because that's what optimization problems look like. Positive patterns require explicit prompting.

---

**18. Real-Time State Adjustment (Today's Physical/Mental Status)** — 💬 Discussed

Distinct from coach_memory. This is the check-in note "tired, right shoulder sore" changing what happens TODAY — not stored as a long-term pattern, but acted on immediately.

**How it works:** The morning check-in Haiku micro-response (already specced) gets upgraded. Instead of just acknowledging the check-in, it receives today's workout plan and acts as a real-time triage:

1. User writes: *"feeling pretty tired, right shoulder kinda sore, maybe slept poorly"*
2. Haiku receives: check-in text + energy/mood rating + **today's scheduled exercises** + sore spot chips + coach_memory (persistent issues like the hip)
3. Haiku response is specific: *"Today has Overhead Press and Lateral Raises — both will load that shoulder. I'd swap those for Chest Press and Bicep Curls. I'm also flagging 3 shoulder/upper-back stretches for you."*

**What Haiku receives for the check-in micro-response:**
```json
{
  "energy": 2,
  "mood": 3,
  "note": "tired, right shoulder kinda sore, maybe slept poorly",
  "sore_spots": ["right_shoulder"],
  "todays_exercises": ["Overhead Press", "Lateral Raises", "Tricep Dips", "Chest Fly"],
  "coach_memory": ["User reports ongoing hip discomfort — flag deep hip flexion exercises"],
  "rest_days_recent": 0,
  "workouts_last_7_days": 5,
  "sleep_score_last_night": 48
}
```

**Workout adjustment — Option A (recommend, don't auto-change):** Workout plan page shows a subtle banner *"3 suggestions based on your check-in"* → expand to see each swap recommendation → one-tap "Apply" per suggestion. The base plan is never touched automatically — user approves each change. This respects that the user knows their body and might dismiss the recommendation.

**Stretching page auto-population:** Sore spot chips should auto-populate from check-in note parsing (basic keyword match: "shoulder" → right_shoulder chip pre-checked, "hip" → hip chip pre-checked) so the user doesn't have to re-enter what they just told the check-in.

**The full real-time loop:**
1. Morning check-in note → Haiku reads it + today's plan → specific swap recommendations + stretch flags
2. Workout plan page → banner shows suggestions → user applies or dismisses
3. Stretching page → sore spots pre-populated from check-in → recommendations already loaded
4. If the same soreness appears 3+ times in check-in notes → coach_memory Edge Function writes it as a persistent observation (bridges real-time and long-term)

**Why the note field framing matters:** A "2" energy rating tells Claude you're tired. But *"tired, right shoulder sore, maybe slept poorly"* tells Claude which body part is compromised, which exercises to substitute, and whether this is a one-day thing or a pattern. The check-in UI should use a placeholder like *"How are you feeling physically and mentally? e.g. right hip tight, sore from legs yesterday, low energy"* to prime specific, actionable entries.

---

### 🍎 Nutrition

**5. Pre/Post Workout Meal Advisor** — ✅ Built (Phase 51)

**10. Supplement Logs Table + Adherence Tracking** — ✅ Built (Phase 51)

**12. Food Log Editing Mode + Session-Scoped Meal Insight** — ✅ Built (Phase 69)

**Decision: Feature A (post-meal slot insight) is retired.** Replaced fully by Feature 12. Feature C (catch-up detection) is incorporated into Feature 12's session metadata — also retired.

---

### Feature 12 — Comprehensive Build Spec

#### The Problem Being Solved
The current nutrition page has add/delete buttons always visible. This causes three problems:
1. The app never knows when you're "done" logging — insight can't fire at the right time
2. Delete buttons are always live — accidental deletions happen
3. The page feels cluttered as a dashboard — too much action UI when you just want to check your totals

#### The Two-State Design

**Read-only state (default):**
- Each meal slot shows entries as a clean, tap-to-view summary
- Entry rows: `[food name] · [cal]kcal [protein]g pro` — clean, no action buttons
- No ✕ delete buttons visible anywhere in the food log section
- No "Add [slot]" buttons visible
- One "✏️ Edit Log" button in the Food Log section header (right side, subtle — secondary style)
- IMPORTANT: The calorie ring, macro summary, TDEE card, and micronutrient section are always visible regardless of state — these are read-only data displays and never had editing buttons

**Editing state:**
- A fixed bottom bar slides up from the bottom of the viewport (CSS `position: fixed; bottom: 0; left: 0; right: 0`)
- Bottom bar content: `[ 📝 Session: 3 added · 1,240 cal · 89g pro ]  [ ✓ Finish Editing ]`
- "✏️ Edit Log" button changes to "← Back to summary" (or just changes styling to indicate active state)
- ✕ delete buttons appear on each entry row
- "Add [Breakfast]" / "Add [Lunch]" etc. buttons appear per slot (same as current behavior)
- Page body gets `padding-bottom: 80px` to prevent content hiding behind fixed bar

**The bottom bar stacks correctly on mobile:** The existing `viewEntry` modal (tap-to-view entry details) uses `position: fixed` with `zIndex: 1200`. The bottom bar should use `zIndex: 100` so modals (AddFoodModal, viewEntry) always render above it. The insight toast (see below) uses `zIndex: 101` so it renders above the bar but below modals.

#### State Shape in `nutrition/page.js`

```js
// New state — add alongside existing useState calls
const [isEditing, setIsEditing] = useState(false)
const [sessionEntries, setSessionEntries] = useState([])
// { meal_slot, food_name, calories, protein_g, logged_time, date }
// Populated on every successful handleAddEntry() call during editing

const [insightToast, setInsightToast] = useState(null)
// null | { text: string, timer: ReturnType<setTimeout> }
// Shows the 2-sentence AI response above the bottom bar
```

**Editing state must survive navigation to add-food page and back.** The `isEditing` and `sessionEntries` are in-memory React state — they reset on page unmount. The add-food page at `/life-hub/nutrition/add-food` uses Next.js navigation which unmounts this page. To survive the round trip, use `sessionStorage`:

```js
// On entering editing mode:
sessionStorage.setItem('nutrition_editing', 'true')
sessionStorage.setItem('nutrition_session_entries', JSON.stringify([]))

// On page mount (in useEffect, after load):
const wasEditing = sessionStorage.getItem('nutrition_editing') === 'true'
const savedEntries = JSON.parse(sessionStorage.getItem('nutrition_session_entries') || '[]')
if (wasEditing) {
  setIsEditing(true)
  setSessionEntries(savedEntries)
}

// On each successful food log (during editing):
const updatedSession = [...sessionEntries, newEntry]
setSessionEntries(updatedSession)
sessionStorage.setItem('nutrition_session_entries', JSON.stringify(updatedSession))

// On Finish Editing (after insight fires or user exits):
sessionStorage.removeItem('nutrition_editing')
sessionStorage.removeItem('nutrition_session_entries')
```

**DO NOT use localStorage here** — this is session-scoped. A new page load the next day should not re-enter editing mode. `sessionStorage` clears when the browser tab is closed.

#### The handleAddEntry Upgrade

Current `handleAddEntry(entry)` just posts to the API and updates `entries` state. When `isEditing === true`, also push to session:

```js
async function handleAddEntry(entry) {
  const res = await fetch('/api/nutrition/log', { ... })
  const data = await res.json()
  if (data.entry) {
    setEntries(prev => [...prev, data.entry])
    if (isEditing) {
      const sessionEntry = {
        meal_slot: entry.meal_slot,
        food_name: entry.name,
        calories: data.entry.calories || 0,
        protein_g: data.entry.protein_g || 0,
        logged_time: entry.logged_time || new Date().toTimeString().slice(0,5),
        date: entry.date || today,
      }
      const updated = [...sessionEntries, sessionEntry]
      setSessionEntries(updated)
      sessionStorage.setItem('nutrition_session_entries', JSON.stringify(updated))
    }
  }
  // ... rest of function unchanged
}
```

#### Backfill + Catch-Up Detection

Computed at Finish Editing time, not tracked continuously:

```js
function computeSessionMeta(entries) {
  const backfillMinutesMax = entries.reduce((max, e) => {
    const loggedAt = new Date(`${e.date}T${e.logged_time}:00`)
    const diffMin = (Date.now() - loggedAt) / 60000
    return Math.max(max, diffMin)
  }, 0)
  const isCatchup = new Set(entries.map(e => e.meal_slot)).size >= 2
  return { backfillMinutesMax: Math.round(backfillMinutesMax), isCatchup }
}
```

#### The Finish Editing Flow

```js
async function handleFinishEditing() {
  setIsEditing(false)
  sessionStorage.removeItem('nutrition_editing')
  sessionStorage.removeItem('nutrition_session_entries')

  if (sessionEntries.length === 0) return  // nothing was added, no insight needed

  const { backfillMinutesMax, isCatchup } = computeSessionMeta(sessionEntries)

  // Fire insight in the background — don't await
  fetchInsight({
    session_foods: sessionEntries.map(e => `${e.food_name} (${Math.round(e.calories)} cal)`),
    slots_touched: [...new Set(sessionEntries.map(e => e.meal_slot))],
    backfill_minutes_max: backfillMinutesMax,
    is_catchup: isCatchup,
    day_totals: {
      calories: Math.round(totals.calories || 0),
      protein: Math.round(totals.protein_g || 0),
      carbs: Math.round(totals.carbs_g || 0),
      fat: Math.round(totals.fat_g || 0),
    },
    calorie_target: effectiveTarget,
    protein_target: macros.protein,
    current_time: new Date().toTimeString().slice(0, 5),
  })

  setSessionEntries([])
}

async function fetchInsight(payload) {
  try {
    const res = await fetch('/api/nutrition/meal-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.insight) {
      const timer = setTimeout(() => setInsightToast(null), 5000)
      setInsightToast({ text: data.insight, timer })
    }
  } catch (e) {
    // Fail silently — insight is a bonus, not core functionality
  }
}
```

**Auto-exit on navigation:** The "Let me fix something" path from Feature 14 (morning review pop-up) navigates to the nutrition page in editing mode for yesterday. This is a separate concern from the auto-exit. Auto-exit (firing insight silently when user leaves the page) should use the `beforeunload` event or a `useEffect` cleanup — but be careful: `fetch` in a `beforeunload` handler may not complete. Use `navigator.sendBeacon()` for the fire-and-forget insight call on page unload if this is desired. **For first build, skip auto-exit on navigation — only Finish Editing button triggers insight. Add auto-exit in a follow-up once the basic flow is working.**

#### The Insight Toast

Appears above the fixed bottom bar, slides up when `insightToast !== null`:

```jsx
{insightToast && (
  <div style={{
    position: 'fixed',
    bottom: 70,  // sits above the 60px bottom bar
    left: 0, right: 0,
    zIndex: 101,
    padding: '0 16px',
    animation: 'slideUp 0.3s ease-out',
  }}>
    <div style={{
      background: 'var(--surface)',
      border: '1px solid #f9731644',
      borderLeft: '3px solid #f97316',
      borderRadius: '10px',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '10px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5', flex: 1 }}>
        🤖 {insightToast.text}
      </div>
      <button
        onClick={() => { clearTimeout(insightToast.timer); setInsightToast(null) }}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', flexShrink: 0, padding: '0 2px' }}>
        ×
      </button>
    </div>
  </div>
)}
```

Add the `slideUp` keyframe to the page's inline style block or use a `<style>` tag at the component root.

#### The Fixed Bottom Bar

```jsx
{isEditing && (
  <div style={{
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    zIndex: 100,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  }}>
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
      📝 <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{sessionEntries.length} added</span>
      {sessionEntries.length > 0 && (
        <span> · {Math.round(sessionEntries.reduce((s, e) => s + e.calories, 0))} cal · {Math.round(sessionEntries.reduce((s, e) => s + e.protein_g, 0))}g pro</span>
      )}
    </div>
    <button
      onClick={handleFinishEditing}
      style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      ✓ Finish Editing
    </button>
  </div>
)}
```

Also add `paddingBottom: isEditing ? '80px' : '0'` to the outermost `<div>` of the page return so content doesn't hide behind the bar.

#### The `/api/nutrition/meal-insight` Route

New file: `src/app/api/nutrition/meal-insight/route.js`

```js
// POST — Haiku, rate-limited 6/day, getUser() + is_disabled check
// Request body: { session_foods, slots_touched, backfill_minutes_max, is_catchup,
//                 day_totals: { calories, protein, carbs, fat },
//                 calorie_target, protein_target, current_time }
// Response: { insight: "2-sentence string" } | { error }
```

**System prompt key rules:**
- Max 2 sentences. Be specific — name actual foods from `session_foods`. No generic wellness advice.
- If `backfill_minutes_max > 120`: past tense, reflective framing. NEVER say "great start to your morning" at 3pm.
- If `is_catchup === true`: acknowledge "looks like you're logging retroactively" in the framing.
- If `backfill_minutes_max < 30`: present/forward-looking framing — what's coming next, what still needs logging.
- Reference what the day totals look like vs the targets. Be specific about the gap or the achievement.
- Rate limit: check `api_rate_limits` for `meal_insight` route, max 6/day. Return `{ error: 'rate_limited' }` — client handles silently (no toast shown).

**All user_input safety:** `session_foods` items come from DB-stored food names, not free-text user input, so no `<user_input>` wrapping needed. They're already sanitized through the food log flow.

#### What to Watch For During Build

1. **SessionStorage key collision:** If user opens nutrition page in two tabs, both write to the same `nutrition_editing` key. This is acceptable edge case behavior — second tab's session will overwrite first. Not worth complex locking for a personal app.

2. **The `entries` state includes both old entries AND new ones added during the session.** When computing the bottom bar's "X added" count, use `sessionEntries.length` (session-only) — NOT `entries.length` (all entries today). These are different state variables for different purposes.

3. **handleRemoveEntry during editing:** Delete is allowed during editing (that's the point). But removing an entry that was added THIS session should also remove it from `sessionEntries`. Best approach: track the entry's ID when adding to sessionEntries, then on delete, filter both `entries` AND `sessionEntries` by ID.

4. **The "Edit Log" button placement:** It goes in the Food Log section header (the `activeTab === 'log'` section), not in the overall page header. The calorie ring / macro summary card is always visible — only the food log section itself has the edit-mode concept. Don't accidentally hide the macro summary.

5. **Supplements tab, My Favorites tab, and Weekly Meal Plan tab:** These are untouched by editing mode. `isEditing` only affects the `activeTab === 'log'` view. If user switches tabs while editing, the bottom bar stays visible. This is correct behavior — they can switch tabs and come back without losing their session.

6. **Rate limit handling:** If the insight API returns a rate limit error, fail silently — no toast, no error message. The rate limit is a protection mechanism, not a user-facing feature. The user doesn't need to know about it.

7. **Insight fires even if 0 calories added:** Guard in `handleFinishEditing` with `if (sessionEntries.length === 0) return` — no reason to call Haiku if nothing was logged this session.

8. **The `today` variable:** Already defined in the page as `new Date().toISOString().split('T')[0]`. Use it consistently — don't recompute `new Date()` in multiple places or you'll get timezone-related bugs near midnight.

9. **Mobile: fixed bottom bar + keyboard:** On mobile, when the user taps the time input in AddFoodModal (which is a modal above the page), the virtual keyboard may push the viewport up and interact weirdly with the fixed bottom bar. The bottom bar is only visible when `isEditing === true` and AddFoodModal is a separate overlay — test this interaction specifically on mobile.

10. **Feature 13 dependency:** Retroactive editing (Feature 13) reuses this same editing mode but for a past date. When Feature 13 is built, it will set `isEditing = true` with a `viewingDate` state set to the past date. The `handleAddEntry` call will pass `date: viewingDate` instead of `today`. The session entries array needs to know which date they're for. When building Feature 12, keep `viewingDate` in mind — don't hardcode `today` into the session entry object; always use whatever date is being viewed.

#### Files to Create/Modify

| File | Change |
|------|--------|
| `src/app/life-hub/nutrition/page.js` | Add `isEditing`, `sessionEntries`, `insightToast` state; upgrade `handleAddEntry`; add fixed bottom bar + toast JSX; `sessionStorage` sync; `paddingBottom` on root div |
| `src/app/api/nutrition/meal-insight/route.js` | **New file** — Haiku route, rate-limited 6/day |
| `CLAUDE.md` | Add `meal-insight/route.js` to directory structure under `api/nutrition/` |
| `build-notes.md` | Move Feature 12 from Future Features to Phase Log when built |

#### Feature A Disposition

Feature A (slot-based insight after closing modal) is fully replaced by Feature 12. Remove Feature A from Future Features when Feature 12 is built. Feature C (catch-up session detection) is incorporated into Feature 12's `computeSessionMeta()` — also remove Feature C when Feature 12 ships.

---

**13. Retroactive Log Editing (Any Past Day)** — 📋 Fully Specced

Backend already supports it — all log API routes accept a `date` param. Only the UI is missing.

**The design:** Date picker (calendar icon) in the nutrition page header next to "Today's Log." Selecting a past date loads that day's entries and enters editing mode automatically. Same editing mode spec as Feature 12 — fixed bottom bar, add/delete buttons, Finish Editing trigger. When done, returns to today.

**AI insight for past-day edits:** Meal-insight call gets `is_retroactive: true` and `days_ago` count. Haiku uses past tense, reflective framing only — no forward-looking tips. Example: "With those additions Saturday now shows 142g protein — that lines up with your PR on squats two days later."

**Stale brief handling:** If a Daily Brief or Weekly Wrap was already generated for the edited date, add a subtle `⚠️ Data updated after brief was generated` note under it with a manual Refresh button. User decides if the change warrants regenerating. No auto-regeneration (expensive, and the old brief reflects how the day actually felt at the time).

**Applies to all log types:** food_log_entries (nutrition), water_logs (hydration), supplement_logs (supplements). Each navigable from their respective pages with the same date picker pattern.

---

**14. "Does This Look Right?" Morning Log Review Pop-Up** — 📋 Fully Specced

Separate from the energy check-in. Fires once per day during the morning window, shows yesterday's summary and asks the user to validate it. The AI doesn't assume you did everything right OR that you missed something — it just shows you what it has and asks.

**Three states:**

*Normal (yesterday had data):*
```
Yesterday — Saturday, July 5
  Calories: 1,840 / 2,400   Protein: 92g / 160g
  Water: 48oz / 80oz        Workout: ✓ Upper body (52 min)
  Supplements: 3/4 taken

Does this look right?
[ ✓ Looks good ]  [ ✏️ Let me fix something ]
```

*Sparse (some data, clearly incomplete):*
```
Yesterday looked light:
  Calories logged: 420     Water: none logged
  No workout logged
  
Missing a bunch, or intentional?
[ 🍽️ I forgot — let me add it ]  [ 🚫 I was fasting ]
[ 💤 Rest day, that's accurate ]  [ Skip ]
```

*Empty (nothing logged):*
```
You didn't log anything yesterday.
Intentional? Sometimes we all need a day off from tracking.
[ 🍽️ Let me backfill ]  [ 👍 Intentional ]  [ Skip ]
```

"Let me fix something" and "Let me backfill" → navigate to nutrition page in editing mode for yesterday. "Looks good" / "Intentional" → store flag in localStorage `log_review_YYYY-MM-DD` so it never resurfaces for that date. Skip → same localStorage flag.

**Why this matters:** All AI briefs, weekly wraps, and trend analyses are only as accurate as what's logged. This is the lightweight daily guardrail that catches multi-day gaps before they corrupt weeks of trend data.

---

### 🧘 Stretching & Mobility

**11. Full Stretching & Mobility Section** — ✅ Built (Phase 54)

---

### ❤️ Health & Recovery

*(Soreness tracking and chronic pain follow-up are covered under Stretching & Mobility above. No additional items currently.)*

---

### 🏋️ Workouts

**15. Workout Logger UX Improvements** — 📋 Fully Specced

*Problem 1 — Set logging friction:* After completing a physical set, user has to scroll to find and log it. Fix: when a set is completed (✓ tapped), the page auto-scrolls to the next incomplete set for that exercise. When the last set of an exercise is completed, auto-scroll to the first incomplete set of the next exercise. Always looking at what's next.

*Problem 2 — Adding exercise mid-workout:* Currently requires exiting the workout. Fix: a floating `+` FAB button (bottom-right, purple, above the rest timer bar) opens the exercise picker modal without leaving the workout page. Selected exercise added immediately to the current session with an "Added during workout" badge. Same grouped-by-muscle-group picker as the plan page, with the `?` detail popup.

**16. AI Post-Workout Coaching Response** — 📋 Fully Specced

**Current state of post-workout data:** The app collects `difficulty` (1–5), `energy` (1–5), and a free-text `note` after every workout. HR zone breakdown (fat burn / cardio / hard / peak minutes) computed from intraday HR on finish. All stored in `workout_logs`. The post-workout note is currently saved to the DB and never read again by anything — this is the biggest waste.

**New behavior:** After the post-workout check-in form is submitted, instead of immediately showing the completion screen, fire a Haiku call and show the coaching response as the primary content of the completion screen, above the stats summary.

**API route:** `POST /api/workouts/coaching-response` — Haiku, rate-limited (1/workout via `api_rate_limits`). Uses `getUser()` + `is_disabled` check.

**What Haiku receives:**
```json
{
  "user_note": "ran out of gas halfway through, couldn't finish last two sets",
  "difficulty": 4,
  "energy_after": 2,
  "duration_seconds": 3120,
  "exercises_completed": ["Squat", "Romanian Deadlift", "Leg Press"],
  "sets_completed": 14,
  "sets_skipped": 4,
  "hr_zones": { "fat_burn_min": 12, "cardio_min": 24, "hard_min": 8, "peak_min": 2, "avg_bpm": 142 },
  "pre_workout_calories": 420,
  "pre_workout_carbs_g": 38,
  "pre_workout_caffeine_mg": 0,
  "water_oz_today": 24,
  "sleep_score_last_night": 52,
  "morning_energy_rating": 2,
  "back_to_back_days": true,
  "workouts_this_week": 4,
  "resting_hr_today": 72,
  "resting_hr_baseline": 58,
  "data_completeness_pct": 35
}
```

**`data_completeness_pct`:** Rough estimate of how complete today's food log is, relative to the user's calorie target. If 35% logged and workout was at 6pm, the food picture is sparse and nutrition-based hypotheses need qualifying.

**Haiku system prompt key rule — "if your data is correct" framing:**
If `data_completeness_pct < 60`, explicitly caveat nutrition-based hypotheses: say "based on what you logged" or "if that's everything you ate before the workout" rather than stating causes as fact. Acknowledge the data may be incomplete without making the user feel accused of lying.

**Example coaching responses:**

*"Ran out of gas halfway through" — sparse food log, poor sleep, back-to-back day:*
> "Running out of gas midway through makes a lot of sense given what's here — you'd only logged 420 calories by workout time and last night's sleep score was 52. Both hit hard in the second half when glycogen and recovery reserves run low. One caveat: if you ate more than what you logged, the nutrition piece might be smaller than it looks. The most consistent factor across everything here is going back-to-back without enough fuel coming in."

*"Felt amazing, crushed it" — solid sleep, rest day yesterday, good food:*
> "That tracks completely — you came in with a full rest day, 79 sleep score, and solid fuel. Days like this are worth noting because that combination (rest + sleep + carbs ahead of time) is reproducible. This is what your body looks like when all the variables line up."

*"HR seemed really high" — elevated resting HR, low water:*
> "The elevated HR is worth paying attention to — your resting HR today was 72 against your usual 58, which often signals the body is carrying stress before you even start. That combined with only 24oz of water logged can push working HR up 10–15bpm. If your hydration data is complete, getting ahead of it tomorrow morning should normalize things."

**Workout data usage summary (what's collected vs what needs to be used):**
| Data | Collected | Currently Used | Should Use |
|------|-----------|---------------|-----------|
| Duration | ✅ | Recovery Score | Weekly Wrap trend, coaching response |
| HR zones | ✅ | Monthly Wrap mention | Coaching response, Daily Brief |
| Post-workout difficulty | ✅ | Nowhere meaningful | Coaching response, Weekly Wrap |
| Post-workout energy | ✅ | Nowhere meaningful | Coaching response, Weekly Wrap |
| Post-workout note | ✅ | **Nowhere at all** | Coaching response — this is the biggest gap |
| Sets/weights/reps | ✅ | PR tracking | Coaching response (sets skipped = ran out of gas) |
| Live HR during workout | ✅ | Zone computation | Already wired |

---

### 📊 Cross-Cutting Intelligence

**19. Work / Life Schedule Context** — 💬 Discussed

The "great walk before the heat" problem: fitness apps misinterpret occupational activity as intentional exercise and make embarrassing, wrong assumptions because they have no concept of the user's daily life structure.

**The input:** Weekly schedule, one label per day of week:
- `active_work` — on your feet all day (warehouse, construction, hospital floor, manual labor)
- `desk_work` — sitting most of the day (office, remote)
- `day_off` — no work obligations
- `travel` — different activity pattern than usual

Stored in `goals_profiles` as a `weekly_schedule` JSONB column: `{ "mon": "active_work", "tue": "active_work", ... "sat": "day_off", "sun": "day_off" }`. Collected during goals setup (new step or existing "Your Context" step).

**What recontextualizes with this data:**
- **Step count interpretation:** 14k steps on a work day = occupational activity, not exercise. Coach memory: *"User averages 12–15k steps on active_work days from job activity — count only workout logs or steps on day_off as intentional exercise effort."* Daily brief stops praising work-steps as fitness wins.
- **Heart rate:** Elevated HR on active_work days is physical labor, not stress or cardiac concern. Brief and heart rate page contextualize accordingly.
- **Meal timing:** *"You're usually done with work by 2:30pm on work days — that's a good window for your larger meal before evening digestion slowdown."*
- **Weekend logging gaps:** *"Low calorie log on Sunday — day off, user is less likely to log (established pattern), not necessarily a low-intake day."*
- **HR baseline split:** Brief can say *"your resting HR on days off averages 58 vs 67 on active_work days — that gap is your body's response to sustained physical output at work, not a health concern."*
- **Coach memory generation:** Weekly Edge Function checks `life_schedule` when computing all patterns — separates occupational vs intentional activity for every metric.

**UI placement:** A simple weekly schedule grid in the Goals Setup "Your Context" step (or a standalone "My Schedule" card on the Goals page). 7 day chips, each with a dropdown of 4 options. Takes 30 seconds to fill out, massively improves AI interpretation accuracy.

---

**20. Stretch System Overhaul — From Passive Library to Proactive Daily Guidance** — 💬 Discussed

**Current problem:** The stretching system has good infrastructure (38 stretches, session types, stretch_logs table) but is entirely passive — you have to navigate to the Stretching tab to see anything. Nobody proactively visits a stretch tab before knowing what they need. The AI has no way to surface stretch recommendations unless you're already on that page.

**What needs to change:**

*A. Proactive "Today's Stretches" card on the Workout Plan page:*
Surfaced alongside today's exercises — not buried in a separate tab. Shows 3–5 recommended stretches with timing context. User can tap any stretch to expand it inline, or tap "Open Stretching" to go to the full page. This is the hook that gets people to actually stretch.

*B. Specific timing guidance (currently completely missing):*
- **Dynamic stretches:** 10–15 min BEFORE workout (not 2 min before — you need blood moving first). The card should say "Start these 15 minutes before you begin lifting" not just "Pre-Workout."
- **Static stretches:** 10+ min AFTER workout when muscles are warm and pliable, OR before bed.
- **Before-bed framing is an untapped angle:** Static stretching 10–15 min before sleep activates the parasympathetic nervous system, lowers cortisol and HR, and correlates with deeper sleep. The app should recommend this explicitly, not just list "post-workout" as an option.
- Timing guidance stored as `timing_note` per stretch recommendation (computed by the stretch recommendation engine based on session type and time of day).

*C. Injury-aware modification language:*
When a stretch is recommended for a body part the user has flagged as sore (via check-in note or coach_memory), the recommendation card must include modification guidance rather than just showing the standard instructions:
> *"Your hip is sore — still do this stretch, but don't push past a 4/10 sensation. When injured, the goal is blood flow and gentle range of motion, not depth. Pushing into pain triggers the muscle's stretch reflex (it contracts to protect itself), making the problem worse. Ease in slowly and hold without bouncing."*
This education is critical because the average user thinks "if it doesn't burn it's not working" — which is actively counterproductive for injured tissue. The app should say this clearly, in the moment, not buried in a library article.

*D. Stretch-sleep correlation tracking:*
`stretch_logs` already has timestamps. `health_sleep_sessions` has sleep scores. The weekly coach_memory Edge Function should check: do nights where the user logged stretches before bed correlate with better sleep scores? If the correlation is meaningful, it becomes an observation: *"User's sleep score averages 72 on nights with any pre-sleep stretching vs 58 without."* The daily brief can then surface this directly.

*E. "Why this stretch" education layer in recommendation cards (not just in the library):*
Every stretch recommendation card should have a one-tap "Why?" that expands a 3-sentence explanation inline:
- What muscle/tissue is being stretched
- What that muscle does in daily life (why it gets tight)
- What happens if it stays chronically tight
This exists in the stretch library but never surfaces in recommendation context. The recommendation card is where the user actually sees the stretch — that's where education should live.

---

**21. Micronutrient Daily Awareness — Contextual, Not Just Visible** — 💬 Discussed

**Current problem:** Micros are tracked and visible on the nutrition page, but there's no daily signal telling the user what's notable or what it means. The user has to know what to look for. The sodium → water goal adjustment was a positive moment because it was reactive and contextual — *that's* the standard every micro callout should meet.

*A. Daily micro standout card on the nutrition page:*
2–3 curated callouts, not a full breakdown. Prioritized by: (1) anything over 150% DV, (2) anything under 20% DV by late afternoon, (3) anything absent for 3+ consecutive days. Each callout is one sentence, specific, and says what it means:
> *"Sodium is 210% DV today — your water target has adjusted upward to compensate."*
> *"Iron is at 12% by 5pm — you have spinach tonight which helps; pair it with something acidic (lemon, tomato) to roughly double absorption."*
> *"Vitamin D has been absent 5 days in a row — no dietary sources or supplement coverage."*

*B. Reactive pairing callouts in meal insight:*
When a logged meal is high in a specific micro that pairs well or conflicts with another, the post-meal insight (Feature A) mentions it:
> *"That meal pushes your sodium to 140% for the day — worth a glass of water with it."*
> *"Good iron in that meal — if you're having coffee or tea with it, try to wait 30 minutes, tannins block iron absorption significantly."*

*C. Streak/pattern micro alerts (the high-value ones):*
- Vitamin D absent 5+ days → notable callout in daily brief, not just a bar on the nutrition page
- Omega-3 near zero for 2+ weeks → connect to any joint soreness in check-in notes
- Magnesium consistently low → connect to sleep quality data if correlation exists
- These connections are what make the app feel like a coach instead of a spreadsheet

*D. Daily brief must include one micro standout when the story is real:*
Not every day — only when something is genuinely notable or has a cross-feature connection. *"Your magnesium has averaged 22% of target for the week, and your sleep scores this week are running 15 points below last month's average — these two can be connected for some people."*

---

**22. The Teaching Philosophy — Contextual Education as a Core Feature** — 💬 Discussed

The stated goal of the app is to teach users about themselves. This means education should be contextual (triggered by relevant data, not encyclopedic browsing) and specific (not "here's what omega-3 does" but "your omega-3 has been near zero for 12 days and your joint complaints have increased — these are connected").

**The "ℹ Learn" touchpoint pattern:**
Any data point with non-obvious meaning gets a small ℹ tap target that opens a 150-word inline education card. These are static copy, written once, triggered by context — not AI-generated. Examples:

- Sleep score 52 → ℹ: *"Most of last night was light sleep — your brain cycled through stages but didn't spend enough time in deep (SWS) or REM. Deep sleep is when your body releases growth hormone and consolidates physical recovery. REM is when your brain processes emotion and consolidates memory. A score in the 50s typically means you got the duration but not the quality — you'll feel rested-ish but not sharp."*
- Measurements going up while weight goes down → ℹ: *"This is body recomposition — your fat-free mass (muscle, bone, glycogen, water) is increasing while fat is decreasing. The scale treats both the same. Measurements going up in your arms and chest while your waist stays flat or shrinks is one of the most positive signals the data can show."*
- Stretch recommendation before bed → ℹ: *"Static stretching at night activates your parasympathetic nervous system ('rest and digest'), lowering cortisol and heart rate. The slow breathing during held stretches directly signals your nervous system to downshift. People who stretch 10–15 min before sleep typically fall asleep faster and spend more time in deep sleep."*
- Omega-3 callout → ℹ: *"Omega-3 fatty acids (EPA/DHA) are incorporated into cell membranes throughout your body, including joint tissue and the brain. Without regular dietary or supplemental sources, inflammatory responses in joints and recovery from exercise both slow down. Most people get almost none from food unless they eat fatty fish 2–3x per week."*

**Rule for this app:** Every number or recommendation that requires domain knowledge to understand should have a ℹ available. This turns data from intimidating into educational. The user who just wants to know their calories can ignore the ℹ chips. The user who wants to actually learn sees them everywhere and gets smarter over time.

**Existing infrastructure to expand:**
- Sleep Tracker education cards already exist (collapsible Deep/REM/Light/Awake explainers) — this is the right pattern, extend it everywhere
- Nutrient Encyclopedia already has AI-generated profiles — those are the long-form versions; the ℹ cards are the short contextual versions
- Body metrics page already has BMI disclaimer — same ℹ pattern

---

### 💬 App Personality Layer — 📋 Fully Specced

**Philosophy:** The app should feel like a coach who's paying attention, not a chatbot that reacts to every tap. Personality lives in three places: post-meal micro-insights, daily brief windows (already specced), and a global check-in pop-up. No blocking modals, no commentary on every food item — batched and context-aware.

---

#### Feature A — Post-Meal Micro-Insight (Haiku call after closing a meal slot)

**When it fires:** After the user finishes logging to a meal slot and closes the modal or navigates back. NOT after every individual food item. Only fires if the meal slot has ≥ 2 items OR total calories for the slot > 200 (single coffee doesn't warrant commentary).

**API route:** `POST /api/nutrition/meal-insight` — Haiku, short prompt, < $0.001/call. Rate-limited (max 6/day via `api_rate_limits`). Uses `getUser()` + `is_disabled` check.

**What it receives:**
```json
{
  "meal_slot": "lunch",
  "foods_logged": ["Chicken breast 6oz", "Brown rice 1 cup", "Broccoli 1 cup"],
  "logged_time": "12:30",
  "current_time": "15:00",
  "backfill_minutes": 150,
  "slot_calories": 620,
  "slot_protein_g": 52,
  "day_totals_so_far": { "calories": 1050, "protein": 74, "carbs": 110, "fat": 32, "water_oz": 24 },
  "calorie_target": 2400,
  "protein_target": 160,
  "is_catchup_session": true
}
```

**`backfill_minutes` calculation:**
```js
const loggedAt = new Date(`${date}T${logged_time}:00`)
const diffMin = (Date.now() - loggedAt) / 60000
// > 120 = backfill, < 30 = real-time, between = neutral
```

**`is_catchup_session` detection:** If the user logs 2+ different meal slots within the same 10-minute window in this session, flag as catch-up. Tracked client-side in session state.

**Haiku system prompt key instruction:**
- If `backfill_minutes > 120`: use past tense, reflective framing. Do NOT say "great start to your morning" if it's 3pm and the meal was at 7am. Reference it as something that already happened.
- If `backfill_minutes < 30`: use present/forward-looking framing. Tips about what's coming next.
- If `is_catchup_session`: acknowledge they're catching up ("looks like you're logging your day retroactively — here's where things stand...").
- Max 2 sentences. Be specific — name the actual foods. Don't be generic.
- Reference what's ahead (dinner still to come?) or what's already done. Connect to their actual goal (deficit, surplus, protein focus).

**UI:** Dismissible toast banner sliding up from the bottom of the nutrition page — NOT a modal. 4 seconds auto-dismiss, or user taps × to close early. No persistent storage needed (it's ephemeral commentary, not a cached insight).

**Example outputs by context:**

*Backfill, 3pm, logging breakfast (logged_time 7am):*
> "Solid breakfast — eggs and toast gave you a strong protein start for the morning. You're at 1,050 calories for the day so far, which leaves good room for dinner."

*Real-time, 7am:*
> "Good morning fuel. That much protein at breakfast typically holds you 4–5 hours — no mid-morning crash if you stay hydrated."

*Catch-up session, 6pm, logging both breakfast and lunch at once:*
> "Looks like you're catching up on today's log — breakfast and lunch together put you at 1,050 calories and 74g protein. Protein's running a bit low for midday, so leaning heavier at dinner helps close that gap."

*Backfill, 8pm, logging lunch that was low-protein:*
> "Your lunch was mostly carb-forward — 12g protein for a full meal is on the lighter side. You've still got dinner, so a protein-heavy close to the day evens things out."

*On track, real-time dinner:*
> "That dinner puts you right at your calorie target and 148 of 160g protein — essentially a complete day. Whatever you have for a snack won't move the needle much."

---

#### Feature B — Two Daily Check-Ins with AI Micro-Response

**Current state:** Check-in is a buried card at the bottom of the Life Hub overview. Users miss it, and a single morning rating misses the full picture — someone tired at 3:30am from cut sleep may feel completely different by 10am after food and caffeine.

**New behavior:** Two bottom-sheet pop-ups per day — morning and afternoon — each tied to the user's personal `wake_time`. Each fires once per window per day, across any Life Hub page, 30 seconds after the user opens the app within that window.

**Two windows:**
- Morning: appears within 60 minutes of `wake_time` (e.g. user at 3:30am → morning pop-up triggers between 3:30–4:30am)
- Afternoon: appears at `wake_time + 7hrs` (e.g. user → afternoon triggers around 10:30am)
- LocalStorage tracking: `checkin_morning_YYYY-MM-DD` and `checkin_afternoon_YYYY-MM-DD` — separate keys so one doesn't block the other

**DB change (backward compatible, no migration of existing data):**
Keep current columns (`energy_level`, `mood_level`, `note`) as morning values. Add:
```sql
alter table daily_checkins add column afternoon_energy smallint;
alter table daily_checkins add column afternoon_mood smallint;
alter table daily_checkins add column afternoon_note text;
```

**Scale: 1–5 numeric, not emoji.**
Five tap buttons labeled 1 through 5. Anchor labels at each end: `1 — Low` and `5 — High`. Selected button fills with the Life Hub Overview accent color (purple). Professional, fast, takes 5 seconds. Afternoon check-in has a subtle framing line: *"How are you feeling now vs this morning?"* — orients the comparison without making it complicated.

**Design (bottom-sheet, not full overlay):**
- Slides up ~40% of screen height from the bottom
- Semi-transparent dark overlay on content above (not fully blocked)
- Title: "Morning Check-In" or "Afternoon Check-In" with today's date
- Energy row: 5 tap buttons labeled 1–5, label "Energy"
- Mood row: 5 tap buttons labeled 1–5, label "Mood"
- Optional one-line text input for a note
- Two buttons: "Save" (purple) + "Skip" (grey, dismisses for the day)
- After Save: inputs fade, brief loading pulse (1–2 seconds while Haiku runs), AI response appears in the same sheet, sheet auto-closes after 4 seconds or user taps to dismiss

**Implementation:** Lives in `LifeHubLayout` (`src/app/life-hub/layout.js`). Two separate `useEffect`s with `setTimeout` — one for each window. State managed in layout so it persists across page navigations within Life Hub.

**AI micro-response after submission:**
API route: `POST /api/checkin/insight` — Haiku, < $0.001/call. Rate-limited (2/day via `api_rate_limits` — one per window). Uses `getUser()` + `is_disabled` check.

What it receives:
```json
{
  "window": "morning",
  "energy_rating": 2,
  "mood_rating": 3,
  "note": "woke up mid sleep cycle",
  "sleep_score": 48,
  "deep_sleep_min": 14,
  "rem_sleep_min": 42,
  "yesterday_workout": true,
  "today_calories_so_far": 0,
  "today_caffeine_mg": 0,
  "today_steps": 200,
  "rolling_7day_morning_avg": 3.1,
  "rolling_7day_afternoon_avg": 4.2
}
```

Haiku system prompt rules:
- Always cite at least one specific data point — never generic ("sounds good!")
- If rating matches data predictions → validate and briefly explain the physiological mechanism
- If rating contrasts with data → acknowledge with curiosity ("your sleep data would have predicted a 2–3, but you're at 4 — the body surprises you sometimes")
- 2 sentences maximum, conversational and warm
- If 7-day rolling avg is available, contextualize: "this is above/below your usual"
- Never medical advice framing

Example responses:

*Morning 2/5, sleep score 48:*
> "That tracks — your sleep score last night was 48, which means most of it was light sleep without much deep recovery. Afternoons tend to run 1–2 points higher for you once food and movement kick in."

*Morning 4/5, sleep score 81:*
> "A 4 makes sense — you got solid deep sleep last night, and that's when your body does its real repair work. That kind of sleep tends to show up as a strong first half of the day."

*Morning 4/5, sleep score 52 (contrast case):*
> "A 4 on that sleep is actually above your recent trend — your data would have predicted a 2–3 today. Whatever you did yesterday seems to be paying off."

*Afternoon 3/5 after a midday workout, morning was 4/5:*
> "A slight dip from this morning makes sense — your body is in recovery mode after that workout. Protein and water in the next couple hours tends to close that gap."

*Afternoon 5/5 after rating 2/5 morning:*
> "Nice turnaround from a 2 this morning — going from a 2 to a 5 in one day usually means the grogginess cleared after food and movement hit. That's a strong bounce-back pattern."

**How briefs use both check-ins:**
- Afternoon brief (1pm): knows morning rating + trajectory, can say "you were at 2 this morning after short sleep — based on your steps and caffeine timing, you're probably tracking higher now"
- Evening brief (7pm): knows both — "morning 2, afternoon 4 — that's a classic bounce-back day for you"
- Weekly Wrap: morning vs afternoon avg by day — can surface patterns like "your mornings averaged 2.8 this week but afternoons averaged 4.1 — strongest correlation is days you hit 8k+ steps"

---

#### Feature C — Catch-Up Session Detection (client-side, no API)

**The pattern:** Track which meal slots have been logged in the current browser session and at what time. If 2+ slots are logged within 10 minutes of each other, set `is_catchup_session = true` in session state. Pass this flag to the meal-insight API call.

**Why it matters:** Changes the entire framing of the insight. Without it, logging breakfast at 6pm and lunch at 6pm would generate "great morning start" commentary that feels completely wrong. With it: "looks like you're catching up on your day — here's where things stand."

**Client-side state in `nutrition/page.js`:**
```js
const recentSlotLogs = useRef([]) // { slot, timestamp }
// On each log: push { slot, timestamp: Date.now() }
// Before meal-insight call: check if last 2 entries are < 10min apart AND different slots
const isBackfilling = recentSlotLogs.current.filter(
  e => Date.now() - e.timestamp < 600000
).length >= 2
```

---

#### Feature D — Workout Suggestions Button + Today's Exercise Overrides — 💬 Discussed

Non-blocking, user-in-control system for applying check-in-informed modifications to today's workout.

**Suggestions button on workout plan page:**
Each day card (especially today's) has a small "Suggestions" button in the top-right corner. If the morning check-in flagged something relevant to today's exercises, the button shows a small orange dot. No alarm, no forced banner — quiet signal, user taps when ready.

Tap → bottom sheet slides up. Each suggestion is its own card:
```
⚠️  Overhead Press → Chest Press
"Your shoulder soreness from this morning — pressing overhead 
loads the exact area you mentioned. Chest Press hits the same 
pushing pattern without the shoulder elevation."

[ ✓ Apply ]   [ Skip ]
```
Three parts per suggestion: what's swapping, one specific sentence explaining why (references the user's actual words/data), two buttons. User can apply some and skip others in any order.

**Today override vs plan edit — critical distinction:**
Applied swaps write to a `workout_session_overrides` table (date, original_exercise, override_exercise, reason). The saved `workout_plans` record is NEVER touched. The plan looks identical tomorrow. This maintains the user's permanent plan while accommodating daily physical state — they are completely separate concerns.

**What generates the suggestions:**
The check-in micro-response (Feature B) already calls Haiku with today's exercises. The action proposals (structured JSON alongside the text response — see Feature E below) get stored in component state / sessionStorage as `today_suggestions`. The Suggestions button reads from this state — no extra API call when the user opens the suggestions sheet.

---

#### Feature E — Conversational AI with Structured Action Proposals — 💬 Discussed

**The "Keep Talking" problem — solved with context snapshots:**

*Security concern:* If every conversational turn re-fetches the user's full data from the DB and sends it to Anthropic, a motivated user could trigger hundreds of expensive API + DB calls. This is a real attack surface.

*Solution — context snapshot pattern:*
- The FIRST AI response (check-in insight, post-meal insight, post-workout coaching) does one DB fetch of all relevant data
- That data is returned to the client as a `contextSnapshot` JSON blob alongside the text response
- Every subsequent "Keep Talking" message sends: conversation history + the SAME contextSnapshot from turn 1 — NO new DB query
- DB is hit exactly once per conversation session, regardless of turn count

*Rate limits (enforced in api_rate_limits table):*
- Max 8 turns per conversation session (after that "Keep Talking" replaced with "Start a new conversation")
- Max 3 conversation sessions per day per context type (check-in, meal, post-workout)
- Worst-case cost: 3 sessions × 8 turns × Haiku ≈ a few cents. Completely bounded.

**Structured action proposals — how the AI "does things":**

Every AI response in a conversation can include a `proposed_actions` array alongside the `message` text:
```json
{
  "message": "If it's been a few days, I'd actually pull both shoulder exercises, not just the overhead. Want me to flag the other one too?",
  "proposed_actions": [
    {
      "type": "swap_exercise",
      "from_exercise": "Overhead Press",
      "to_exercise": "Chest Press",
      "day": "today",
      "display": "Swap Overhead Press → Chest Press today"
    },
    {
      "type": "add_stretch",
      "stretch_id": "sho-static-doorway-pec-stretch",
      "session_type": "pre_workout",
      "display": "Add Doorway Pec Stretch to today's pre-workout"
    }
  ]
}
```

The client renders the `message` as text, then renders each action as an inline apply-card directly below the message in the chat. **Nothing writes to the database until the user taps Apply.** The AI never acts autonomously — it only proposes. This is the tool-use pattern applied to a chat interface.

**Inline stretch cards in conversation:**
When a proposed action has `type: "add_stretch"`, the client looks up the stretch by ID in `stretches.js` (static local data, no extra API call) and renders a compact card inline in the chat:
```
╔══════════════════════════════════╗
║ 🧘 Doorway Pec Stretch           ║
║ Static · Chest & Shoulders · 30s ║
║ Stand in a doorway, forearm on   ║
║ the frame, lean forward.         ║
║ [ + Add to Pre-Workout Today ]   ║
╚══════════════════════════════════╝
```
Tapping "Add" fires POST to `/api/workouts/stretch-log` or adds to `recommended_today` local state that surfaces on the Stretching page as **"AI-Recommended for Today"** at the top of the page. Stretches ALWAYS stay separate from workout exercise cards — they live on the Stretching page regardless of which conversation surface recommended them.

**Conversation signal → coach memory bridge:**
When a conversation session ends (user closes, hits turn limit, navigates away), a lightweight POST to `/api/coach-memory/from-conversation` records structured signals:
- Did the user apply all suggested swaps? (trust signal)
- Did the user push back? What did they say? (preference/constraint signal)
- Which body parts were mentioned? (physical concern tracking)
- Any temporal patterns stated? ("I always feel like this on Mondays")
These feed the weekly Edge Function alongside raw log data, so conversations actively train the coach over time — they're not just ephemeral exchanges.

**Applicable conversation surfaces:**
- Morning/afternoon check-in micro-response (Feature B)
- Post-meal insight (Feature A)
- Post-workout coaching response (Feature 16)
- All three use the same context snapshot + structured action proposal pattern

---

### 🔔 Push Notifications + App Personality — 📋 Fully Specced

#### Key Architecture Decisions Locked In (do not re-litigate)

**pg_cron is Supabase-native, not Vercel.** It runs inside Supabase's PostgreSQL extension (`pg_cron`) and schedules Supabase Edge Functions via SQL. Nothing Vercel is needed. Vercel cron would only matter if the scheduled work needed to run Next.js server code — this work (fetch Google Health → analyze → push notification) has no dependency on Next.js.

**500,000 invocations/month is the free tier Edge Function limit.** This is NOT a notification limit. 3 briefs/day × 30 days = 90 invocations/month. Even with 3 push notifications/day = 180 invocations. Free tier is effectively unlimited for single-user personal use.

**The 3-notification-per-day cap is a UX decision, not a platform limit.** It's enforced by the `push_notification_log` table (UNIQUE on `user_id + date + window`). The platform would allow far more. The cap exists to prevent the app from becoming annoying. It can be raised to any number by changing the business logic in the Edge Function — there is no Supabase pricing tier involved.

**Supabase free → paid upgrade is never needed for notifications.** The free tier supports unlimited push notifications technically. The only reason to upgrade Supabase would be for more database storage, more API requests, or branch environments — not for notification frequency.

**Three-brief system uses `window` column on `daily_briefs` table.** UNIQUE changes from `(user_id, date)` to `(user_id, date, window)`. Each window (`morning`/`afternoon`/`evening`) is generated independently by its own pg_cron schedule. The app shows all three that exist for today + yesterday's evening as fallback context.

**Brief timing is personalized per user, not hardcoded globally.** Storing `wake_time TIME` and `bedtime TIME` in `goals_profiles` (or `user_preferences` table) means brief windows are derived from the user's personal schedule: morning = wake_time, afternoon = wake_time + 6hrs, evening = bedtime - 2hrs. pg_cron fires hourly; the Edge Function checks if "right now" is within 15 minutes of each user's personal window before generating. A user who wakes at 3:30am gets their morning brief at 3:30am. A user who wakes at 9am gets theirs at 9am.

**The early-riser / 4am scenario resolved:**
- User opens app at 3:30am: if wake_time is set to 3:30, morning brief generates immediately. If no wake_time set, show yesterday's evening brief + "Morning brief generates at your set wake time" placeholder.
- User opens app at 10pm: all three today briefs exist (generated at their personal morning/afternoon/evening times). Show as a chronological day story, newest (evening) expanded by default.
- pg_cron fires regardless of whether the user opened the app — briefs are generated on schedule, app visit just reads from cache.

**Notification cap is configurable with no platform cost.** Default 3/day (one per window). Can be raised to 5, 8, or any number by changing the integer check in the Edge Function. No Supabase pricing tier involved. Smart suppression (don't fire if all signals look good) keeps it from feeling spammy regardless of the cap number.

**Data freshness: Edge Function does a live Google Health sync before generating content.** It does NOT read from the stale Supabase cache. Replicates the token refresh + API fetch + cache write logic from `sync/route.js`, then reads the now-current tables. Notification about "10,000 steps" will be based on actual current Google Health data, not whatever was cached from the last app visit.

**Load time improvement from pre-generated briefs:** Yes — significantly. Today's overview page currently calls Claude on first daily load (blocks render while waiting for AI). With pg_cron pre-generating at 8am/1pm/7pm, the page load is a DB read (< 100ms) instead of a Claude call (2–4 seconds). The only case where Claude is called on-load is if the user visits before the scheduled window has fired (e.g. 6am before the 8am morning brief). The existing fallback logic handles this gracefully (shows yesterday's brief until today's generates).

**The current Daily Brief does NOT do intraday exercise detection.** It reads yesterday's total step count from `health_steps_hourly` and daily HR summary from `health_heart_rate_daily`. It does not cross-correlate steps + HR by time window. To detect "exercise at 2pm," the brief needs to query both `health_heart_rate_intraday` (hourly) and `health_steps_hourly` (hourly) and find windows where both spiked simultaneously (e.g. HR avg > resting + 30 AND steps in that hour > 800). This is the "intraday exercise detection" upgrade planned below.

#### Smart Brief Design — What Makes Each Window Different

Each window gets a different system prompt focus, different data emphasis, and different tone:

**Morning (8am) — Reflective + Forward**
Data: last night's sleep (sleep_score, onset_minutes, deep_min, REM_min, awake_count), yesterday's total activity (steps, workout logged), yesterday's nutrition summary, today's supplement timing recommendations.
Tone: calm, orienting. Tell the story of recovery. Connect sleep quality to expected energy today. If sleep was poor, acknowledge it and give one concrete tip (protein breakfast, avoid caffeine after 2pm). If sleep was great, set an optimistic pace. Mention one thing to watch for today based on yesterday's pattern.
Example smart point: "Your deep sleep was only 18 minutes last night (target: 60–90). That usually shows up as slower reaction time and stronger sugar cravings by afternoon — a high-protein breakfast reduces both."

**Afternoon (1pm) — Momentum + Course Correction**
Data: today's steps so far, today's food log (calories, protein, water), today's HR intraday data (was there a workout?), energy check-in if logged.
Tone: direct, actionable. You have half a day's data — use it. Identify the one biggest gap (protein low? hydration behind? steps at 800?) and give one specific action. If things are on track, acknowledge it briefly and set up the evening.
Example smart point: "You're at 6,200 steps and 1,100 calories at 1pm. Pace is good. Protein is at 68g against a 160g target — that's the one thing to close before tonight. A Greek yogurt + chicken at dinner puts you within 20g."

**Evening (7pm) — Summative + Recovery Setup**
Data: full day's food log, total steps, workout logged (with HR zones if available), sleep score from last night for context, water total.
Tone: closing the loop. Celebrate what went well. Name the one thing that slipped without judgment. Set up sleep: what to eat (or not eat), when to stop caffeine (based on what they logged), when to stop screens if sleep was poor last night.
Example smart point: "Solid day — you hit your protein goal and 9,200 steps. You had 180mg caffeine at 4pm. If last night's 22-minute sleep onset is a pattern, cutting off caffeine by 2pm tomorrow could make a difference."

#### Intraday Exercise Detection (upgrade to add to brief generation)
Query `health_heart_rate_intraday` + `health_steps_hourly` for the same user/date. Find hours where:
- `health_heart_rate_intraday.avg_bpm` > (resting_bpm + 30) AND
- `health_steps_hourly.steps` > 600 in that same hour

If 2+ consecutive hours match → high confidence exercise window. Inject into AI brief context: "User appears to have exercised from [startHour] to [endHour] based on step+HR correlation." Claude then references this confidently instead of hedging with "if you worked out."

If HR spike but no step spike → stationary elevated HR (could be stress, illness, strength training). Brief notes: "Your HR was elevated from X–Y without significant steps — that could be a strength workout, stress, or heat."

#### What Else to Add (additional ideas from session)
- **Notification tap-through:** tapping a morning brief notification opens the Life Hub overview directly to the brief panel (already handled by `data.url` in the push payload)
- **Brief "last updated" timestamp:** small grey label under each brief showing when it generated — helps user understand if afternoon brief reflects a noon sync vs a 12:59pm sync
- **Manual brief regeneration:** "🔄 Refresh" button on each brief card that calls the POST endpoint on demand (same logic as today's single daily brief) — useful on days when a lot happened after the scheduled window
- **Smart notification suppression for quiet hours:** Edge Function checks current time in user's local timezone against `bedtime` field. If send time falls within sleep window, defer to next brief window.
- **Frequent Google Health data sync (no notification):** separate pg_cron job every 2 hours that does token refresh + Google Health fetch + cache write only — no brief, no notification. Keeps step/HR tables fresh for all other features (recovery score, brief generation, notification rules) regardless of app visit recency.

### 📅 Weekly Wrap — 📋 Fully Specced

**Core idea:** A dedicated Weekly Wrap section identical in structure to Monthly Wrap — week picker, stat cards, AI narrative, history sidebar of all past weeks. Linked from the Overview group in the sidebar alongside Monthly Wrap and Daily Briefs.

**Why this improves Monthly Wrap too:** Currently Monthly Wrap gathers raw data from 10 tables across 30 days — expensive query and Claude only sees daily numbers with no sense of weekly momentum or slumps. With Weekly Wrap as a layer, Monthly Wrap instead queries 4–5 pre-computed weekly summaries and uses their `report_data` JSONB as the foundation. Claude can then say: *"Week 1 was your strongest — 4 workouts and sleep above 80 each night. Week 3 dropped off sharply, which tracked with the lower energy check-ins that week. Week 4 showed a strong recovery trend."* That week-over-week narrative is impossible from raw daily data alone.

**DB table: `weekly_wraps`**
```sql
create table weekly_wraps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,         -- always a Monday (ISO week start)
  report_data jsonb,                -- aggregated stats: avg_sleep_score, total_steps, workout_days, avg_calories, avg_protein, avg_water_oz, avg_energy, avg_mood, workout_types[], top_foods[], supplement_adherence_pct
  ai_narrative text,                -- Claude's week narrative (3–4 paragraphs)
  generated_at timestamptz default now(),
  unique(user_id, week_start)
);
alter table weekly_wraps enable row level security;
create policy "user reads own wraps" on weekly_wraps for all using (user_id = auth.uid());
```

**Generation:** pg_cron fires Sunday at `bedtime - 1hr` (user-personalized). Falls back to 8pm Sunday EST if no bedtime set. Same "generated once, cached forever" pattern as Monthly Wrap. GET without `?week=` returns all past week_start dates for the history sidebar.

**Current month still blocked:** Weekly Wrap for the current in-progress week shows "Week in progress — check back Sunday" state (same pattern as Monthly Wrap blocking the current month).

**What the AI narrative covers per week:**
- Overall tone sentence (strong week / recovery week / mixed bag)
- Best day and worst day with reason why (e.g. "Tuesday was your peak — 12k steps, 7.8 sleep score, protein goal hit")
- One consistency observation (e.g. "You hit your water goal 5/7 days — that's your best hydration week in two months")
- One thing that slipped with no judgment (e.g. "Sleep was below 70 four nights — the two late workout days correlated directly with longer sleep onset")
- One concrete setup for next week (e.g. "If you want to match or beat this week, the pattern that worked was morning protein before 9am on active days")

**"Next Week Setup" block — required section in every Weekly Wrap narrative:**
The weekly wrap must close with a dedicated "Next Week" section — one single actionable observation, not five. The format: "The one thing most likely to improve next week based on this week's patterns: [specific action tied to observed data]." This makes the wrap forward-looking instead of purely nostalgic. Examples:
- "The one thing: your sleep scores were highest the two nights you stopped eating after 8pm — building that cutoff into Monday and Tuesday when you have early mornings would give your two hardest days better recovery."
- "The one thing: you hit your protein goal 4/7 days this week, all on days you had a high-protein breakfast. Making that the default rather than the exception closes most of the gap automatically."
- "The one thing: you trained 5 days but your energy ratings show the pattern only dips on back-to-back days. If you shift Wednesday to Thursday, you'd keep the same volume without the back-to-back recovery penalty."
This section must be in the Claude system prompt as a required output structure — not optional commentary. Without it, Claude will summarize the week without ever pointing forward.

**How Monthly Wrap uses Weekly Wraps:**
`/api/life-hub/monthly-wrap/route.js` POST handler:
1. Query `weekly_wraps` where `week_start >= month_start AND week_start <= month_end` for this user
2. Use `report_data` JSONB from each week as the primary data source (pre-aggregated, fast)
3. Only fall back to raw table queries for metrics not captured in weekly_wraps (e.g. specific food entries, photo milestones)
4. Claude prompt gets: array of weekly summaries + month-level totals + comparison to previous month's weekly wraps if available

**Page: `/life-hub/weekly-wrap`**
- Week picker (← →) navigating by 7 days, showing "Week of Jul 7" format
- Current week: "Week in progress" placeholder
- Past weeks: stat cards (Sleep Score avg, Total Steps, Workout Days, Avg Calories, Avg Protein, Water Goal Hit %, Energy avg) + AI narrative card
- Right sidebar: history list of all past weeks (most recent first), clickable to switch
- "Generate" button only appears if week is complete and wrap hasn't been generated yet (edge case: if Sunday pg_cron missed)
- Sidebar nav: listed under Overview group alongside Monthly Wrap

**Overview**
Real push notifications delivered to the user's phone lock screen (iOS Safari + Android Chrome) using the Web Push API + Supabase Edge Functions + pg_cron. No Vercel paid plan required. No cron jobs on Vercel. Works even when the app is closed.

---

#### The Core Data Freshness Problem (and the solution)

The user's concern is valid: if a notification fires at 7pm saying "you've only taken 2,000 steps" when the actual count is 10,000, the notification is worse than useless — it destroys trust. This happens because the Google Health data in Supabase is only as fresh as the last app visit.

**Solution:** The Supabase Edge Function that sends notifications does NOT read from the stale cache. It runs a live refresh first:
1. Reads the user's tokens from `google_health_tokens`
2. Refreshes the access token if expired (same logic as `refreshTokenIfNeeded` in `googleHealth.js`)
3. Calls Google Health API directly to fetch fresh steps, HR, sleep for today
4. Writes fresh data to the hourly/daily cache tables
5. THEN reads the now-current data and generates the notification

This means notification data is always live at send time, regardless of whether the user has opened the app. The Edge Function essentially replaces the app's role as the sync trigger — it becomes the scheduled sync that also sends a notification as a side effect.

---

#### Architecture: All Six Pieces

**Piece 1 — VAPID Keys (generated once, stored as secrets)**
- Run `npx web-push generate-vapid-keys` locally (one-time)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` → Vercel env var (all environments — safe to be public, it's a signing key, not a secret)
- `VAPID_PRIVATE_KEY` → Vercel env var (secret) + Supabase Edge Function secret
- `VAPID_SUBJECT` → `mailto:sethproper40@yahoo.com`
- These never rotate unless the subscription system is rebuilt. Store them somewhere safe (password manager).

**Piece 2 — `push_subscriptions` DB table**
```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null,         -- push service URL (browser-generated)
  p256dh text not null,           -- client public key (browser-generated)
  auth_key text not null,         -- auth secret (browser-generated)
  user_agent text,                -- for debugging (e.g. "Chrome/Android")
  created_at timestamptz default now(),
  unique(user_id, endpoint)       -- one subscription per browser/device
);
alter table push_subscriptions enable row level security;
-- Users can manage their own subscriptions
create policy "user manages own subscriptions" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
Note: a user can have MULTIPLE subscriptions if they've granted permission on multiple devices/browsers. The Edge Function sends to ALL of them.

**Piece 3 — `/api/push/subscribe` Vercel route**
- `POST` — receives `{ endpoint, keys: { p256dh, auth }, userAgent }`
- Auth-gated with `getUser()` — only authenticated users can register
- Upserts to `push_subscriptions` (onConflict: user_id + endpoint)
- `DELETE` — removes the subscription for the current device (called when user revokes permission in Settings)
- No `is_disabled` check needed — this is not an AI route and doesn't cost money to run

**Piece 4 — Permission UI in Settings**
- A "Notifications" section in Settings page
- On first render: check `Notification.permission` — if 'default', show "Enable Notifications" button; if 'granted', show "Notifications enabled ✓" + "Disable" button; if 'denied', show "Notifications blocked in browser — tap the lock icon in your address bar to re-enable"
- On "Enable": call `Notification.requestPermission()`, then if granted, call `navigator.serviceWorker.ready` → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY })`, then POST the subscription object to `/api/push/subscribe`
- On "Disable": call DELETE on `/api/push/subscribe`, then `registration.pushManager.getSubscription()` → `subscription.unsubscribe()`
- The permission prompt only appears once ever on each device — after that, the browser remembers the choice

**Piece 5 — Service Worker push handler (`public/sw.js`)**
The service worker already exists (PWA). Add a `push` event listener:
```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Life Hub', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: data.url ?? '/life-hub' },
      tag: data.tag ?? 'lifehub-update',   // replaces previous notification with same tag
      renotify: false,                      // don't vibrate if replacing same tag
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = event.notification.data?.url ?? '/life-hub'
      const match = list.find(c => c.url.includes(location.origin))
      if (match) { match.focus(); match.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
```
Security note: `tag` deduplication means if 3 pm and 7 pm notifications both use `tag: 'nutrition-nudge'`, the 7 pm one silently replaces the 3 pm one on the lock screen — no notification spam.

**Piece 6 — Supabase Edge Function (`supabase/functions/daily-push/index.ts`)**
This is the brain. Called by pg_cron on a schedule (e.g. 8am, 1pm, 7pm EST daily).

High-level logic per scheduled window:
```
1. Load all push_subscriptions rows (service role read)
2. For each user:
   a. Load their google_health_tokens row
   b. Refresh access token if expired (call oauth2.googleapis.com/token)
   c. Update access_token + expires_at in DB
   d. Fetch fresh data from Google Health API:
      - steps (today's civil date)
      - heart rate (today)
      - sleep (last night)
   e. Write fresh data to health_steps_hourly / health_heart_rate_daily / health_sleep_sessions
   f. Load their food_log_entries for today (calories, protein, water from food entries)
   g. Load their water_logs for today
   h. Load their goals_profiles (step goal, calorie target, protein target, water goal)
   i. Load their workout_logs for today (did they work out?)
   j. Load their daily_checkins for today (energy level)
   k. Determine which notification window this is (morning/midday/evening)
   l. Apply rule-based logic to pick a notification message
   m. Call web-push library with the user's subscription endpoint
3. Mark sent in a `push_notification_log` table (prevents duplicates if function runs twice)
```

**Notification logic per window:**

*8am — Morning Brief Notification:*
- Sleep < 6hrs → "You got [X] hrs of sleep. Energy may be lower today — stay ahead of it with a protein-heavy breakfast."
- Sleep ≥ 7.5hrs → "Solid [X] hrs of sleep. Good recovery base today."
- Yesterday steps > 10k → "You hit [X] steps yesterday. Good baseline — see if you can match it today."
- Default → "Morning. Let's see what today looks like."

*1pm — Midday Check:*
- Steps < 2000 by 1pm → "Only [X] steps so far today. A 10-min walk after lunch gets you to 3,000 easily."
- No food logged + it's 1pm → "No food logged yet. Even if you're not tracking strictly, a quick log helps the app give you better insights."
- Water < 32oz → "You're at [X]oz of water at 1pm. Dehydration at this point causes the classic afternoon energy dip — drink 16oz now."
- Calorie deficit > 800 by 1pm → "You're running a big deficit early. That 3–4pm crash you might feel is usually hunger in disguise."

*7pm — Evening Summary:*
- Steps > 10k → "You hit [X] steps today. That's about [X] calories burned from movement alone."
- Steps < 5k + workout logged → "Low step count but you had a workout. Movement quality over quantity — you're good."
- Protein < 80% of target + calorie goal hit → "Close to your calorie target but protein is at [X]g — [target]g is the goal. A quick protein source before bed protects muscle overnight."
- All goals hit → "Great day — steps, food, and water all on track. Recovery is tonight's job now."
- No food logged all day → "Looks like today wasn't a tracking day. No problem — even logging tomorrow's breakfast gets the streak going."

---

#### Security Design

**What could go wrong and how it's prevented:**

| Threat | Mitigation |
|--------|-----------|
| Someone intercepts your push subscription endpoint and sends fake notifications | Web Push spec encrypts all payloads end-to-end using ECDH — only your browser's private key can decrypt them. Even if someone has your endpoint URL, they can't send a notification without the VAPID private key. |
| VAPID private key leaks | Stored only in Vercel env vars (secret) and Supabase Edge Function secrets — never in code, never in git. Rotatable by generating new keys and re-subscribing. |
| Someone calls the Edge Function directly to spam notifications | The function is invoked by pg_cron only (internal Supabase call). If you add an HTTP trigger, gate it with a shared secret header checked inside the function. |
| Edge Function reads other users' tokens | Function uses service role but is coded to only read the token for the user_id it's processing. Logic is auditable. |
| `push_subscriptions` table exposed | RLS enabled — users can only see their own subscriptions. Edge Function uses service role but only touches the subscription of the user it's currently processing. |
| Notification content leaks health data if phone is shared | Web Push payloads are encrypted in transit. On the lock screen, iOS/Android show the notification body — this is the same as any health app. User can disable lock screen notification previews in phone settings if needed. |
| Token refresh inside Edge Function exposes client secret | `GOOGLE_HEALTH_CLIENT_SECRET` stored as Supabase secret (encrypted at rest, injected at runtime, never visible in logs). Same security model as Vercel env vars. |
| `push_notification_log` bypassed — sends duplicate notifications | Table stores `(user_id, date, window)` unique constraint. Function checks before sending, inserts after. If the insert fails (duplicate), the notification was already sent — no retry. |

**What the Edge Function can and cannot do:**
- ✅ Can read all user health data (service role)
- ✅ Can call Google Health API with stored tokens
- ✅ Can send Web Push notifications
- ✅ Can write to health cache tables
- ❌ Cannot call Claude/Anthropic API (would cost money per notification, on a schedule = uncontrolled spend). Notification content is rule-based, not AI-generated.
- ❌ Cannot access Vercel env vars (they're separate from Supabase secrets — VAPID private key needs to be stored in BOTH Vercel AND Supabase secrets)

**Rate limits and cost:**
- pg_cron fires the Edge Function 3× per day
- Each Edge Function invocation does 1 Google Health refresh + 1 web-push send per user
- Single user = trivially cheap. If the app ever gets other users, the rate limiting is 3 notification windows/day/user (enforced by the push_notification_log table)

---

#### Build Order (sequential — each step testable before the next)

**Step 1 — Generate VAPID keys + add to env**
- Run `npx web-push generate-vapid-keys` locally
- Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to Vercel (all environments)
- Add `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET` to Supabase Edge Function secrets
- Commit nothing — no code changes needed for this step

**Step 2 — DB migration**
- Create `push_subscriptions` table with RLS (see schema above)
- Create `push_notification_log` table: `(id, user_id, sent_at, window, title, body)` + unique on `(user_id, date(sent_at), window)`

**Step 3 — `/api/push/subscribe` route + Settings UI**
- POST: receives subscription object, upserts to `push_subscriptions`
- DELETE: removes subscription for current device
- Settings page: "Notifications" card with permission state management

**Step 4 — Service worker push handler**
- Add push + notificationclick listeners to `public/sw.js`
- Test: use browser DevTools → Application → Service Workers → "Push" button to send a test push

**Step 5 — Supabase Edge Function (rule-based, no Claude)**
- `supabase/functions/daily-push/index.ts`
- Implements the full logic: token refresh → Google Health fetch → cache write → rule evaluation → web-push send
- Test by invoking manually via Supabase dashboard

**Step 6 — pg_cron schedule**
- SQL migration: `select cron.schedule('morning-push', '0 12 * * *', ...)` etc. (UTC times — 12:00 UTC = 8am EST, 17:00 UTC = 1pm EST, 23:00 UTC = 7pm EST)
- DST handling: use America/New_York tz conversion in the Edge Function, not in the cron schedule

**Step 7 — Test end-to-end**
- Grant notification permission in Settings
- Manually invoke the Edge Function
- Verify notification appears on phone lock screen
- Verify tapping it opens the app to the right page

---

## Vercel Deployment — When Ready

**Steps:**
1. Connect GitHub repo to Vercel (Import Project → select `cert-study-app`)
2. Set framework preset to **Next.js**
3. Add all environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (secret, never public)
   - `OWNER_PIN_HASH` (SHA-256 hex hash of owner PIN)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Settings → API → service_role)
   - `GOOGLE_HEALTH_CLIENT_ID`
   - `GOOGLE_HEALTH_CLIENT_SECRET`
   - `NEXT_PUBLIC_SITE_URL` (the Vercel production URL)
4. Deploy and verify all features work on the live URL
5. Update Google OAuth redirect URIs in Google Cloud Console to include the Vercel URL

**Post-deploy Supabase config (requires live URL):**
- Auth → URL Configuration → add `https://yourdomain.com/update-password` to Redirect URLs
- Auth → URL Configuration → set Site URL to Vercel production URL

**Features that must be tested on Vercel (cannot test locally):**
- `/update-password` — password reset email flow
- Google Health OAuth — full connect/disconnect
- Owner admin "Send Password Reset" — sends real email

**Features that must be built AFTER Vercel deploy:**
- Vercel Cron Job (health auto-sync) — Vercel-only, configured in `vercel.json`
- PWA conversion — service workers require HTTPS ✅ Built

---

## Performance Fix Notes

These are the precise, line-level fixes for every issue found in the Phase 57 performance audit. Safe quick wins were applied in Phase 57. The remaining items (nutrition/page.js split) are documented here for Phase 58+.

### APPLIED in Phase 57 (Safe Quick Wins)

**Fix A — heart-rate/page.js: Throttle SVG hover + binary search**
- File: `src/app/life-hub/health/heart-rate/page.js`
- Problem: `handleSvgMouseMove` fires on every mouse move event (up to 60×/sec), runs an O(n) linear scan through up to 1,440 `chartPoints`.
- Fix applied:
  - Added `lastMoveTime` ref; skip handler if < 50ms since last run (throttle)
  - Pre-sort `chartPoints` is already done; binary search replaces linear scan
  - All derived SVG values (`avgPath`, `bandPath`, `yTicks`, `xOf`, `yOf`, chart coordinates) wrapped in `useMemo` keyed on `[chartPoints, yMin, yMax]`
  - `useMemo` also applied to `allBpm/allMin/allMax` arrays, `dataMin/dataMax/yMin/yMax`, `wStartX/wEndX`

**Fix B — life-hub/page.js: Memoize Recovery Score calculation**
- File: `src/app/life-hub/page.js`
- Problem: Recovery score calc (sleep/hydration/protein/energy/workout/HRV/stretch) runs every render inside a `useEffect`, stored in state — not a render-path issue but the entire 40-line block runs synchronously.
- Fix applied:
  - The calc already runs inside `useEffect` (on load) so it only runs once per data fetch — no memoization needed in render path. Audit finding was a false alarm for this specific file.

**Fix C — workouts/log/page.js: SELECT specific columns (not SELECT *) on exercise prefetch**
- File: `src/app/life-hub/workouts/log/page.js`, line 353
- Problem: `.select('*')` fetches all exercise columns including large `instructions` array and `gif_url` when only name is needed for the prefetch map; individual `fetchExerciseDetail` calls also use `SELECT *`.
- Fix applied:
  - Line 353: changed to `.select('id, name, body_part, equipment, target, secondary_muscles, instructions, gif_url')`
  - Line 378: kept `select('*')` (individual detail fetch — needs all fields for modal)

**Fix D — measurements/page.js: Memoize WeightChart path calculations**
- File: `src/app/life-hub/goals/measurements/page.js`
- Problem: `WeightChart` is a plain function called in render — `rawPath` and `avgPath` are string computations that run on every parent re-render (e.g. when delete confirm modal opens/closes).
- Fix applied:
  - Converted `WeightChart` from a plain function to a proper React component (`function WeightChart({ history })`) so it receives props and can use hooks
  - Added `useMemo` for `pts`, `vals`, `avgVals`, `rawPath`, `avgPath` inside the component

**Fix E — nutrition/page.js: Move DIETARY_RULES and getDietaryWarnings to module level**
- File: `src/app/life-hub/nutrition/page.js`
- Problem: `DIETARY_RULES` and `getDietaryWarnings` are already defined at module level (lines 1219–1248) outside the component — no change needed. Audit finding was correct that they should be there, and they are.

**Fix F — nutrition/page.js: Memoize SavedFoodsTab myFoods filtering (5-pass → 1-pass)**
- File: `src/app/life-hub/nutrition/page.js`, `SavedFoodsTab` component (around line 1474)
- Problem: `myFoods` is filtered 5 separate times (pinned, unpinned, loggedToday, loggedThisWeek, loggedOlder, neverLogged) on every render with 5 separate `.filter()` passes.
- Fix applied: Replaced 5 separate `.filter()` calls with a single `useMemo` pass that builds all 5 arrays in one loop.

**Fix G — daily-brief/route.js: Build supplement keyword index once**
- File: `src/app/api/life-hub/daily-brief/route.js`, lines 172–189
- Problem: `suppList.filter(s => suppHasKw(s, 'iron'))` etc. — 4 separate `.filter()` scans over the same array. Each invokes `suppHasKw` which itself loops over `Object.keys(s.nutrients)`. O(n×m) per filter, called 4 times.
- Fix applied: Single pass builds a `Set`-based index per keyword before the filter calls, then lookups are O(1).

**Fix H — heart-rate/page.js: Don't load both 5-min and hourly if 5-min has data**
- The API already returns both from `/api/health/heart-rate` in one call. Client picks `useFiveMin = fiveMin.length > 0`. Both datasets are always held in memory simultaneously.
- Fix applied: Conditional early discard — after `setData`, if `fiveMin.length > 0`, clear the `intraday` array from state to free memory. No additional network call needed.

### DEFERRED — Phase 58 (Nutrition Page Split)

**Fix I — nutrition/page.js: Split 2,748-line file into separate component files**
- This is the root cause of mobile OOM on the nutrition page.
- Current state: Everything — SearchModal (lines 97–441), AddFoodModal (lines 442–1117), EditFoodModal (lines 1118–1217), SavedFoodsTab (lines 1441–1697), MealBuilderModal (lines 1698–2000+) — is all in one 2,748-line client component.
- Plan:
  1. Create `src/components/nutrition/SearchModal.js` — extract lines 97–441
  2. Create `src/components/nutrition/EditFoodModal.js` — extract lines 1118–1217
  3. Create `src/components/nutrition/SavedFoodsTab.js` — extract lines 1441–1697
  4. Create `src/components/nutrition/MealBuilderModal.js` — extract lines 1698–2000+
  5. Wrap each with `React.lazy()` + `<Suspense>` so they're code-split and only load when opened
  6. Each extracted file imports only what it needs (Supabase client, MEAL_NUTRITION_KEYS, getDietaryWarnings)
- Risk: High — shared state (logModal, editModal, mealBuilderOpen, etc.) must be lifted or passed as props. Needs careful prop threading. Plan for a dedicated session.

**Fix J — life-hub/page.js: Consolidate 20 parallel Supabase queries**
- Current: 20 simultaneous queries in Promise.all on every page load
- Plan: Group related queries — health tables (steps/HR/sleep) can be deferred until after first paint; goals/checkins/workouts are critical path. Split into 2 waves: critical (8 queries) load first, secondary (12 queries) load after render.
- Risk: Medium — requires restructuring the useEffect and state initialization order.

---

## Phase Log

### Phase 75 — Item 17: Persistent Coach Memory — Complete

- DB: `coach_memory` table — `user_id`, `category` (nutrition/sleep/workout/physical/lifestyle/goal_progress), `observation`, `confidence` (1–5), `data_points`, `first_seen_at`, `last_confirmed_at`, `is_active`; RLS: SELECT for own rows only; INSERT/UPDATE service-role only (Edge Function)
- `supabase/functions/generate-coach-memory/index.ts` (new): Deno Edge Function; fetches 90 days of data across 9 tables per user (food_log_entries, daily_checkins, workout_logs, health_sleep_sessions, body_measurements, supplement_stack, stretch_logs, water_logs, goals_profiles); aggregates key stats; one Haiku call with balance instruction (for every negative pattern, find a positive formula); upserts: matching category+prefix → bump confidence+data_points; new → insert; stale (>60 days) → mark is_active=false
- `src/lib/coachMemory.js` (new): `getCoachMemoryContext(supabase, userId)` — fetches top 8 active observations ordered by confidence; returns formatted block or empty string (no overhead when table is empty)
- Injected `getCoachMemoryContext` into 5 routes: `daily-brief/route.js`, `workouts/coaching-response/route.js`, `workouts/exercise-chat/route.js`, `nutrition/meal-insight/route.js` (Phase G's `checkin/insight` will be injected when built)

### Phase 74 — Feature 15: Workout Logger UX Improvements — Complete

- `src/app/life-hub/workouts/log/page.js` — two UX fixes:
  - **Auto-scroll after set completion:** `setRowRefs` Map (keyed `${exIdx}-${setIdx}`) tracks each set row DOM node via ref callback. `userInteractedRef` guards against firing on initial render. After marking a set complete, `toggleComplete` computes the next incomplete set (same exercise first, then next exercise) and calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` after a 50ms delay (allows React to re-render first).
  - **Mid-workout FAB:** Purple `+` circle (zIndex 98, below rest timer bar at 99 and finish bar at 100) fixed bottom-right. Hidden when rest timer is active. Taps open a bottom-sheet picker (grouped by muscle group, same EX_GROUPS as plan page). `addMidWorkoutExercise()` appends to `exercises` state with `added_mid_workout: true` flag; shows a "+ ADDED" purple chip on the exercise card header. Exercise library loaded lazily on mount from Supabase.

### Phase 73 — Feature 16: AI Post-Workout Coaching Response — Complete

- `src/app/api/workouts/coaching-response/route.js` (new): POST, Haiku, rate-limited 1/day via `api_rate_limits` key `coaching-response-YYYY-MM-DD`. Accepts workout stats + context (difficulty, energy, HR zones, pre-workout nutrition, water, morning energy, back-to-back days, workouts this week). If `data_completeness_pct < 60`, instructs Haiku to caveat nutrition observations with "based on what you logged". User note wrapped in `<user_input>` tags. Returns `{ coaching: "2–4 sentences" }`.
- `src/app/life-hub/workouts/log/page.js` — after saving the workout log, fires async coaching fetch (8s timeout, fail silently). Gathers context in parallel: water logs, today's check-in energy, yesterday's workout (back-to-back flag), this week's workout count, today's food entries, calorie target. Shows coaching card above the stats grid on the completion screen — orange left border, 🤖 Coach header, "Analyzing your workout..." loading state while in-flight. Disappears silently if API fails or rate-limited.

### Phase 72 — Item 19: Work/Life Schedule Context — Complete

- DB: `alter table goals_profiles add column if not exists weekly_schedule jsonb;` — stores `{ mon: 'active_work'|'desk_work'|'day_off'|'travel', ... }` per-day
- `src/app/life-hub/goals/setup/page.js` — added `weeklySchedule` state + `WeeklySchedulePicker` component in Step 3 (after sleep hours); saves to `goals_profiles.weekly_schedule` on finish
- `src/app/life-hub/goals/page.js` — added "Weekly Schedule" read-only card with pill grid + Edit → inline picker + Save/Cancel (PATCHes only `weekly_schedule` column)
- `src/app/api/life-hub/daily-brief/route.js` — injects `scheduleContext` (today's type + full week summary); null-safe; filtered via `.filter(Boolean)`
- `src/app/api/life-hub/monthly-wrap/route.js` — injects `scheduleMonthlyContext` (active/desk/off day counts per week); null-safe
- `src/app/api/workouts/generate-plan/route.js` — added `weekly_schedule` to goals_profiles select; injects schedule block into `bodyContext` noting active work days and placement advice for harder sessions

### Phase 71 — Feature 14: Morning Log Review Pop-Up — Complete

- `src/components/nutrition/DailyLogReview.js` (new): client component, fires 5am–noon once per day via `localStorage` key `log_review_YYYY-MM-DD` (keyed to yesterday's date). Fetches yesterday's food log; three states: Normal (≥3 entries, ≥1000 cal) / Sparse / Empty. Renders as a slide-up bottom sheet (fixed overlay, borderRadius 16px top, slide-up animation). Normal: shows top-3 entries + kcal total + "✓ Looks good" / "✏️ Fix something". Sparse: "Yesterday looked light" + 3 dismissal options. Empty: "Nothing logged" + backfill / intentional / skip. "Fix something" / backfill buttons navigate to `/life-hub/nutrition?editDate=YYYY-MM-DD` and set the localStorage flag before navigating.
- `src/components/LifeHubClientShell.js` (new): thin `'use client'` wrapper that dynamically imports `DailyLogReview` (SSR disabled). Mounted in Life Hub layout.
- `src/app/life-hub/layout.js` — imports and renders `LifeHubClientShell` so the popup fires on every Life Hub page in the morning window.
- `src/app/life-hub/nutrition/page.js` — added `useSearchParams` + Suspense wrapper (project pattern). Reads `?editDate=` on mount: if set and not today, fetches that date's entries, sets `viewingDate`, writes sessionStorage JSON, auto-enters editing mode. The `NutritionPage` default export wraps `NutritionPageInner` in `<Suspense>`.

### Phase 70 — Feature 13: Retroactive Log Editing — Complete

- `viewingDate` state (null = today) added to nutrition page
- 7-day date picker chips in food log header: Today / Yesterday / Mon / Tue... up to 6 days back; tapping switches the log view for that date (no editing required); chips are locked while in editing mode
- Selecting a past date calls `loadDateEntries(date)` — fetches `GET /api/nutrition/log?date=YYYY-MM-DD`, replaces entries state
- "✏️ Edit Log" now calls `startEditing(viewingDate)` — accepts optional date so past-day edits start in the correct context
- `startEditing()` updated: stores `{ since, date }` JSON in sessionStorage instead of bare ISO string
- sessionStorage restore in `load()` updated: `JSON.parse()` extracts `since` + `date`, restores `viewingDate` correctly after navigation round-trip
- Bottom bar label: shows "Editing: [Day, Date]" when `viewingDate !== null` instead of session count
- Cancel button: calls `returnToToday()` if `viewingDate` was set (navigates back to today's log)
- `handleFinishEditing()`: calls `returnToToday()` after Done if past-date editing, passes `is_retroactive: true` + `days_ago: N` to meal-insight API
- `+ Add` and empty-slot dashed buttons include `?date=${viewingDate}` in the add-food URL when viewing a past date
- add-food page: reads `?date=` param, injects into log POST payload (`date: dateParam`)
- "Copy from yesterday" button hidden when `viewingDate !== null`
- TDEE calibration card hidden when `viewingDate !== null`

### Phase 69 — Feature 12: Food Log Editing Mode + Session-Scoped Meal Insight — Complete

Two-state nutrition page: read-only dashboard (default) vs editing mode with AI session analysis.

**`src/app/life-hub/nutrition/page.js`:**
- New state: `isEditing`, `sessionEntries`, `insightToast`, `insightLoading`
- `startEditing()`: writes `nutrition_editing_since` ISO timestamp to sessionStorage, resets session state
- `handleFinishEditing()`: clears sessionStorage key, exits editing mode, posts session foods to meal-insight API, shows toast on success
- `handleAddEntry()` upgraded: tracks new entry in `sessionEntries` when `isEditing`
- `handleRemoveEntry()` upgraded: removes from `sessionEntries` too
- Load function: on mount, checks `nutrition_editing_since` in sessionStorage — if present, restores editing mode and populates `sessionEntries` with entries created after that timestamp (survives add-food navigation round-trips)
- "✏️ Edit Log" button added to food log header (orange border, hidden when already editing)
- "Cancel" clears sessionStorage + resets, "Done" fires insight + clears
- Add button (slot header), delete × button, and empty-slot dashed button all hidden in read-only mode
- Fixed bottom bar (zIndex 100): shows session count + Cancel + Done; shows "Analyzing…" while Haiku runs
- Insight toast (zIndex 101): appears above bottom bar, 🤖 header, orange border, dismissable
- Root div gets `paddingBottom: 80px` when editing to prevent content under the fixed bar
- Removed duplicate `viewEntry` modal that existed at both line ~311 and ~797 — kept the first (zIndex 1200), removed the second (zIndex 1000)

**`src/app/api/nutrition/meal-insight/route.js`:** (new file)
- Haiku model, max_tokens 150, rate-limited 6/day via `api_rate_limits`
- `getUser()` + `is_disabled` check
- Accepts: `session_foods`, `slots_touched`, `backfill_minutes_max`, `is_catchup`, `day_totals`, `calorie_target`, `protein_target`, `current_time`
- Detects catch-up logging (backfill > 30 min) and annotates prompt
- Returns: `{ insight: "2-sentence string" }` — first sentence: specific observation; second: actionable suggestion for rest of day

### Phase 68 — Dead Data Audit Fixes — Complete
Seven inputs that were collected but never used downstream wired up in the same session.

**daily-brief/route.js:**
- `mood_level` — was fetched from DB but silently discarded. Now calculates `avgMood` (7-day rolling average) and `lowMoodStreak` (consecutive low-mood days ≤2) and injects both into the brief context. System prompt now has explicit mood rules.
- `post_workout_difficulty/energy/note/hr_zones` — post-workout check-in data was in `workout_logs` but never fetched for the brief. Now fetches `yesterdayWorkout` and injects difficulty, energy, free-text note, and HR zone breakdown (fat_burn/cardio/hard/peak minutes) into the brief context.
- Hydration line upgraded: was just `48oz water`. Now shows `48oz / 80oz goal — 32oz short` so Claude can comment meaningfully on hydration shortfalls vs a blank number.
- `dietary_preferences` — collected in goals_profiles step 3 but never sent to Claude in the brief. Now injected into `personalContext` with instruction to factor into nutrition commentary.
- `calorie_history_note` — user's lived calorie experience (e.g. "I've always had to eat less than TDEE formulas say"). Now injected as ground truth that overrides formula estimates.

**monthly-wrap/route.js:**
- `primary_motivations`, `biggest_obstacles`, `why_goals`, `dietary_preferences` — none of these were in the goals_profiles SELECT query. Now fetched and injected as a PERSONAL CONTEXT block in the wrap narrative. Claude uses them to write a wrap that reflects what this user actually cares about.
- `sleep_hours` (goal target) — fetched but never compared to actual. Now part of personalContextLines for sleep framing.
- `protein_g` per day — food_log aggregation only tracked calories. Now also tracks protein and computes `avgProtein` for the wrap stats.

**workouts/setup/page.js:**
- `workout_days`, `has_pullup_bar`, `has_ab_roller`, `cardio_options`, `dumbbell_pairs` — these 5 fields were collected in the 7-step onboarding but never saved to `workout_profiles`. A "Regenerate Plan" feature could never have reconstructed the user's setup. Fixed by adding all 5 to `profileData` in `handleFinish()`.
- DB migration applied to `workout_profiles` adding the 5 missing columns.

### Security headers — Complete
- `next.config.mjs`: Added HTTP security headers applied to all routes — `X-Frame-Options: DENY` (clickjacking protection), `X-Content-Type-Options: nosniff` (MIME sniffing prevention), `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: on`, `Permissions-Policy` (disables camera/mic/geolocation/FLoC), `Strict-Transport-Security` with 2-year max-age + preload (forces HTTPS on all future visits)

### Measurements page redesign — Complete
- `measurements/page.js`: Split single form into two separate sections — "⚖️ Log Weight" (inline row with date + weight field + Save Weight button) and "📏 Log Measurements" (date + 8 tape measurement fields + Save Measurements button), each with its own saving state and messages; removed rolling average from weight chart (now shows raw dots + line only); added "📐 Measurement Trends" chart below weight chart — field selector pill buttons (Waist/Hips/Chest/Neck/Left Arm/Right Arm/Left Thigh/Right Thigh), SVG line chart filtered to non-null entries for selected field, start/end date + value labels, total delta shown in color (down=good for waist/hips, up=good for arms/thighs); fixed `interpretBodyComp` to search history for most-recent-non-null per field independently using `getMostRecentPair(history, field)` instead of comparing hist[0] vs hist[1] directly — fixes signal analysis when weight and tape measurements are logged on different days

### Supplement nutrient entry upgraded to structured chip picker — Complete
- `supplements/page.js`: Replaced freetext nutrient rows (nutrient name + amount + unit dropdown) with chip picker pattern matching EditFoodModal — `NUTRIENT_GROUPS` and `ALL_MICRO_META` constants at module level; `SupplementForm` now accepts `activeNutrients` (Set), `nutrientValues` (object key→string), `showPicker` props; picker panel shows Minerals (blue) / Vitamins (purple) / Other (green) chips; nutrient cards on stack display human-readable labels (`meta.label: val + meta.unit`); nutrients stored as `{ "vitamin_d_mcg": 20 }` numeric format instead of `{ "Vitamin D": "20 mcg" }` text format; `handleAiFill` maps AI response to structured keys; `EditModal` initializes from structured keys; `loadStack` simplified (no longer needs `nutrients_list` translation)
- `encyclopedia/route.js`: Added `STRUCTURED_NUTRIENT_KEYS` Set; supplement aggregation loop checks if key is in the set and val is a number (new format → use directly) before falling back to `matchSuppToNutrient` + `parseSuppAmount` for legacy text format

### Fix — SearchModal manual entry upgraded to chip picker UI — Complete
- `SearchModal.js`: Replaced flat list of all micro fields with EditFoodModal-style chip picker UI — macros shown in 2-col grid, micronutrients added on demand via group picker (Minerals/Vitamins/Other), % DV toggle, per-field remove button, AI Fill button in button bar; added `manualCategory` state for category chip picker; `handleManualMicroFill` replaces the old `handleMicroFill` call for manual mode; `EMPTY_MANUAL`, `NUTRIENT_GROUPS`, `ALL_MICRO_META` constants added at module level

### Fix — Add Supplement form converted to modal overlay — Complete
- `supplements/page.js`: Inline add form was an in-page div with a blue border that visually cut through supplement cards below it; converted to `position: fixed` overlay modal matching the Edit modal pattern

### Fix — Edit Favorite category not saving — Complete
- `my-foods/route.js` PUT handler was missing `is_drink`, `is_ingredient`, `is_snack` fields in the update object; category changes were silently ignored on save

### Phase 67c — Audit cleanup — Complete
- `water/page.js`: Removed dead `quickLogSavedDrink` function (direct-log bypass left over from before Phase 67; never called — all drink logging now goes through LogConfirmModal)

### Phase 67b — UX Fixes (Build a Meal button + libraryOnly saved foods) — Complete
- `nutrition/page.js`: Added "🍳 Build a Meal" button above SavedFoodsTab on My Favorites tab; calls `setMealBuilderModal(true)` directly so user can always access MealBuilderModal without going through AddFoodModal
- `SearchModal.js`: Hide "⭐ Saved Foods" section when `libraryOnly=true` — prevents already-saved foods from appearing when user is adding new foods to their library

### Phase 67 — All Logging Flows Through LogConfirmModal — Complete
- `LogConfirmModal`: Added `mode="drink"` with editable caffeine (mg) and water (oz) inputs; added `initialServings`/`initialSlot` props for pre-fill; added `extra` prop for parent-injected content (e.g. save checkbox); drink mode uses purple Log button
- `SavedFoodsTab`: Repeat button (↺) now opens LogConfirmModal pre-filled with last servings + slot instead of auto-logging
- `AddFoodModal`: Search tab "Log" button, AI preview "Log" button, and manual tab "Log" button all open LogConfirmModal before logging; save-to-lib and my_food_id logic handled in callbacks
- `add-food/page.js`: Search "Log" button opens LogConfirmModal; callback handles save-to-lib then logs
- `water/page.js`: Search result drinks now open LogConfirmModal in `mode="drink"` with save-to-favorites checkbox via `extra` prop; saved drink chips already used LogConfirmModal, now also use `mode="drink"` for editable caffeine/water

### Phase 66 — Universal LogConfirmModal — Complete
- New component: src/components/nutrition/LogConfirmModal.js — bottom-sheet modal with food name/brand, macro grid (live-updating with servings), non-null micros as chips with DV%, servings input, time picker, meal slot selector chips, Log/Cancel buttons
- SavedFoodsTab.js: replaced inline expand-to-log with LogConfirmModal (Log button opens modal); removed inline servings/time/slot UI from each row; removed FoodIntelCard import
- add-food/page.js: favorites tab now taps to open LogConfirmModal instead of expanding inline; AI preview "Log" also opens modal
- water/page.js: saved drink chips now open LogConfirmModal (slot='drink') instead of auto-logging; water tracking updated after modal confirm
- AddFoodModal.js: favorites tab Log button opens LogConfirmModal instead of inline expand; modal closes after confirm

### Phase 65 — Category picker + drinks sub-tab fix — Complete
- nutrition/page.js: removed `!f.is_drink` filter — all myFoods now passed to SavedFoodsTab; categorizeFoods() handles sub-tab sorting
- nutritionUtils.js: added FOOD_CATEGORIES, foodToCategory(), categoryToFlags() exports
- EditFoodModal.js: category picker (4 chips: Food/Meal | Drink | Snack | Ingredient) at top of form; category saved on edit
- AddFoodModal.js: replaced is_drink/is_snack/is_ingredient checkboxes with unified category picker
- add-food/page.js: category picker shown when saving search result to favorites
- SearchModal.js: category picker shown when saving to favorites

### Phase 64 — Log entry detail modal + DV% conversion hints — Complete
- Tap any food log entry on nutrition page → read-only modal with all macros + non-null micros, serving info, time logged
- Tap any drink entry on hydration page → same read-only modal
- All nutrient input fields now show live conversion hint (e.g. "200mg = 22% DV" or "20% DV = 180mg") below each field
- Applies to EditFoodModal, log-manual/page.js, water/page.js nutrient inputs

### Phase 63 — DV% ↔ mg toggle for all nutrient entry points — Complete
- Added DV% ↔ mg toggle to EditFoodModal.js, water/page.js (log + edit modals), and log-manual/page.js
- nutritionUtils.js DV constant extended: added vitamin_k_mcg: 120 and choline_mg: 550
- Toggle shows "% DV" button (switches to mg mode) and "mg" button (switches to DV mode)
- Nutrients without a standard DV (omega3_g, trans_fat_g, water_g, caffeine_mg) always show in their native unit
- DV% pattern: display = actual / DV[key] * 100; on change: actual = input * DV[key] / 100
- AddFoodModal.js already had this toggle — all other entry points now match

### Phase 62 — SavedFoodsTab sub-tabs + time picker for food and drink logging — Complete
- **Problem 1:** "My Favorites" tab on main nutrition page (SavedFoodsTab.js) had no sub-tabs — only add-food/page.js had them after Phase 61
- **Problem 2:** No way to log the time a food or drink was consumed — entries always defaulted to the current timestamp
- **Problem 3:** No way to edit the time on an existing log entry after the fact
- **SavedFoodsTab.js:** Added 5 sub-tab pills (🌟 All | 🍽️ Foods & Meals | 🥤 Drinks | 🍿 Snacks | 🥚 Ingredients) using `categorizeFoods()`; active tab persisted to `localStorage` key `favTab`; added `logTime` state with `nowTimeString()` default; time input shown in expanded log panel; `logged_time` passed to POST body
- **add-food/page.js:** Added `logTime` state and `nowTimeString()` helper; time input added to expanded favorites card panel; `logTime` resets to current time when a card expands; `logged_time` sent in logEntry
- **water/page.js:** Added `logDrinkTime` state to drink log modal with time input; added `editLogTime` state to edit log modal with time input; both send `logged_time` (and `date`) in their respective API calls
- **api/nutrition/log/route.js:** POST now extracts `logged_time` and sets `created_at = ${date}T${logged_time}:00` on insert; PATCH now extracts `date` and `logged_time` and sets `created_at` on update — enables retroactive time correction
- **CLAUDE.md:** Documented "Time Logging Pattern — `logged_time`" in Parallel Implementations section with 5-step requirement; all 3 entry points listed in sync table

### Phase 61b — Centralize shared nutrition logic, eliminate duplicate constants — Complete
- **Problem:** Nutrient key lists, MEAL_SLOTS, dietary rules, food categorization logic, and log-entry assembly were independently copy-pasted across 8+ files — high drift risk when adding nutrients
- **nutritionUtils.js:** Added `categorizeFoods(foods)` (splits by is_drink/is_ingredient/is_snack) and `buildFoodLogEntry(food, slot, sv, source)` (assembles food_log_entries object with all MEAL_NUTRITION_KEYS multiplied by servings) — now exported as shared utilities
- **add-food/page.js:** Now imports `MEAL_SLOTS`, `categorizeFoods`, `buildFoodLogEntry` from nutritionUtils; removed 14-line local duplicate of MEAL_SLOTS; logEntry() now delegates to buildFoodLogEntry; categorization uses categorizeFoods
- **AddFoodModal.js:** Now imports `categorizeFoods` and `buildFoodLogEntry`; categorization 4-liner replaced with 1-line destructure
- **meal-plan/page.js:** Removed 7-rule `MEAL_PLAN_DIETARY_RULES` duplicate and local `getMealPlanWarnings`; now imports `getDietaryWarnings` and `MEAL_SLOTS` from nutritionUtils; `MEAL_LABELS` derived from imported constant
- **api/nutrition/log/route.js:** Removed 10-key `MICRO_FIELDS` hardcode; now imports `MEAL_NUTRITION_KEYS` and derives MICRO_FIELDS dynamically — all 37 nutrient fields now covered (was missing 12 Phase 60 fields)
- **api/nutrition/my-foods/route.js:** Removed 26-key `ALL_NUTRITION_FIELDS` hardcode; now imports `MEAL_NUTRITION_KEYS` directly
- **CLAUDE.md:** Parallel Implementations section expanded with "What's Centralized" table, updated sync table, and complete New Nutrient Checklist (8-step)

### Phase 61 — Smart nutrient UI + Favorites sub-tabs fix + Hydration extended nutrients — Complete
- **Problem 1:** Sub-tabs from Phase 59 not visible on "Add to [Meal]" because those buttons navigate to `add-food/page.js` (standalone page), not `AddFoodModal`
- **Problem 2:** "Add to My Drinks" modal on Hydration page only had 10 nutrient fields — missing all 12 Phase 60 electrolytes/B-vitamins
- **Problem 3:** EditFoodModal loaded all 38 nutrient fields as empty rows — overwhelming wall of zeros
- **Fix 1 — add-food/page.js:** Added sub-tab pills (🌟 All | 🍽️ Foods & Meals | 🥤 Drinks | 🍿 Snacks | 🥚 Ingredients) to the Favorites section with count badges, smart defaults per slot, `localStorage` persistence; now loads ALL my_foods (not just non-drinks); numKeys extended with 12 Phase 60 nutrients
- **Fix 2 — EditFoodModal.js (Phase 60 rewrite):** New smart UI — starts showing only fields that already have values (`activeNutrients` Set); "+ Add nutrients" dashed button opens grouped chip picker (Minerals in blue, Vitamins in purple, Other in green); clicking a chip adds that nutrient row; × removes it; AI Fill always visible and auto-adds filled fields to active set; macros always shown in 2-col grid
- **Fix 3 — water/page.js:** "Add to My Drinks" modal now has same smart chip picker; `DRINK_EXTRA_NUTRIENTS` const (32 nutrients in 4 groups); `activeDrinkNutrients` Set + `showDrinkPicker` toggle; AI Fill auto-reveals filled fields; `saveNewDrink` writes all fields; `EMPTY_DRINK_FORM` includes all fields

### Phase 60 — Extended nutrient tracking (electrolytes + full B-vitamin panel) — Complete
- **Problem:** Couldn't log phosphorus, chloride, manganese, selenium, chromium, copper, iodine, biotin (B7), pantothenic acid (B5), niacin (B3), thiamine (B1), or riboflavin (B2) — critical for tracking electrolyte packets like Ultima Replenisher
- **DB migration:** 12 new NUMERIC columns added to `food_cache`, `my_foods`, `food_log_entries`, `meal_plan_entries`
- **nutritionUtils.js:** Extended `DV`, `MICRO_GROUPS` (Minerals now has 13 entries, Vitamins now has 12), `MEAL_NUTRITION_KEYS`, `TRACKED_MICRO_KEYS`
- **NutrientBars.js:** Updated `NUTRIENT_BAR_GROUPS` and `NUTRIENT_META` to render all new nutrients in the micronutrient panel
- **nutrients.js:** 12 new nutrient entries with full metadata (slug, key, rdv, goalTags, symptomTags, synergies, competitors, suppMatch, oneLiner) — now appears in Encyclopedia
- **search/route.js:** Extracts all 12 new fields from Open Food Facts (correct g→mg or g→mcg conversions per nutrient)
- **ai-micro-fill/route.js:** Updated prompt to request all 12 new fields; max_tokens bumped to 600
- **EditFoodModal.js:** All 12 new fields added to form with correct labels and units
- **encyclopedia/page.js:** 13 new color entries for new nutrient slugs

### Phase 59 — My Favorites sub-tabs in AddFoodModal — Complete
- **Problem:** All saved foods (drinks, ingredients, snacks, meals) mixed in one scroll — hard to find what you want
- **Solution:** Sub-tab pills inside the Favorites tab: 🌟 All | 🍽️ Foods & Meals | 🥤 Drinks | 🍿 Snacks | 🥚 Ingredients
- Count badges on each tab — `Drinks (3)` shows what's there at a glance
- Smart default: slot=drink auto-opens on Drinks; slot=snack auto-opens on Snacks; otherwise All
- Last-used sub-tab persisted in `localStorage` so reopening remembers your position
- Empty state per tab with context-aware hint (e.g. "Log drinks from Hydration page, or search and save here")
- Drinks properly excluded from all other tabs (`is_drink` flag checked)
- Manual entry now has 🥤 Drink checkbox (mutually exclusive with Ingredient/Snack); saves `is_drink: true` to my-foods
- Filter input still works within whatever sub-tab is active

### Phase 58 — nutrition/page.js component split (mobile OOM fix) — Complete
- **Problem:** 2,748-line single `'use client'` file caused Android to kill the tab (OOM) — full component tree parsed and registered on initial load
- **Solution:** Extracted 6 components into separate files + shared utility module
- `src/lib/nutritionUtils.js` — shared constants (`MEAL_SLOTS`, `DV`, `MICRO_GROUPS`, `MEAL_NUTRITION_KEYS`, etc.) and pure functions (`foodCompleteness`, `getDietaryWarnings`, `DIETARY_RULES`)
- `src/components/nutrition/FoodIntelCard.js` — AI food intelligence card
- `src/components/nutrition/EditFoodModal.js` — edit saved food modal (all 27 fields + AI micro-fill)
- `src/components/nutrition/SavedFoodsTab.js` — My Favorites tab with grouping, pinning, direct log
- `src/components/nutrition/NutrientBars.js` — micronutrient stacked bars (food + supplement)
- `src/components/nutrition/MealBuilderModal.js` — meal recipe builder
- `src/components/nutrition/SearchModal.js` — OFFs search + manual entry + AI fill
- `src/components/nutrition/AddFoodModal.js` — 3-tab add-food modal (Favorites / Manual / Search)
- `nutrition/page.js` reduced from 2,748 → ~700 lines; clean Vercel build confirmed

### Phase 57 — Performance quick wins — Complete
- **heart-rate/page.js:** SVG hover handler throttled to 20fps (50ms gate via `lastMoveTime` ref); replaced O(n) linear scan with binary search through sorted `chartPoints`; all derived SVG values (`avgPath`, `bandPath`, `yTicks`, `wStartX/wEndX`) wrapped in `useMemo` keyed on `[chartPoints, yMin, yMax]`; `xOf`/`yOf` wrapped in `useCallback`; `yMin`/`yMax` computed in a single `useMemo`; if 5-min data exists, `intraday` array discarded early to free memory — no need to hold 2× datasets simultaneously
- **workouts/log/page.js:** Exercise prefetch changed from `select('*')` to explicit column list — avoids fetching unused columns on the initial exercises batch load
- **measurements/page.js:** Added `useMemo` import; `WeightChart` function now memoizes `rawPath`/`avgPath` SVG strings and all intermediate calc values (`vals`, coordinate functions) in a single `useMemo` keyed on `[pts]` — paths only recompute when history data changes, not on every parent re-render (e.g. delete confirm modal open/close)
- **nutrition/page.js:** Added `useMemo` import; `SavedFoodsTab` grouping replaced 5 separate `.filter()` passes over `myFoods` with a single `useMemo` loop that builds all 5 groups (`pinned`, `loggedToday`, `loggedThisWeek`, `loggedOlder`, `neverLogged`) in one O(n) pass; memoized on `[myFoods, today]`
- **daily-brief/route.js:** Supplement interaction detection replaced 4 separate `suppList.filter(s => suppHasKw(...))` calls (each O(n×m)) with a single keyword-index build pass that groups supplements by keyword; `cafS` and `vitDS` built from Set union of keyword buckets — O(n) total instead of O(4n×m)

### Phase 56f — Security hardening (M1 + M3 + full audit fixes) — Complete
- **M1 (invite/redeem enumeration):** `invite/redeem/route.js` now checks rate limit (10/hr) before processing; error messages unified to "Invalid or already used code" — prevents authenticated users from distinguishing valid-but-used codes from invalid codes
- **M3 (recovery code brute force):** `2fa/use-recovery/route.js` now checks rate limit (5/hr) — blocks brute-force enumeration of bcrypt-hashed recovery codes
- **rateLimit.js:** Added `invite/redeem` (10/hr) and `2fa/use-recovery` (5/hr) to LIMITS; fixed fail-open bug to fail-closed on DB error
- **C1 (OAuth CSRF):** `health/connect` generates UUID state stored in httpOnly cookie (10min); `health/callback` validates state before code exchange — prevents CSRF token injection
- **H1 (barcode SSRF):** `nutrition/search/route.js` validates barcode against `/^\d{8,14}$/` before use; `encodeURIComponent` in OFF URL; returns 400 on bad format; `BarcodeScannerModal` also validates before calling `onResult`
- **H2 (prompt injection in chat routes):** `chat/route.js` filters roles to `['user','assistant']`, limits history to last 20 msgs × 2000 chars; `test-chat/route.js` added is_disabled check, sanitizes inputs, wraps in `<question_context>` + `<user_input>` tags
- **H3 (unprotected AI routes):** All AI routes now gated by `checkRateLimit` — 11 previously unprotected routes added including `workouts/exercise-chat`, `supplements/ai-fill`, `nutrition/ai-drink-fill`, `nutrition/ai-micro-fill`, `life-hub/daily-brief`, and 6 more
- **M4 (owner PIN in-memory lockout):** `owner/verify-pin/route.js` — lockout state moved from module-level variables to `api_rate_limits` DB table; survives serverless cold starts and redeploys
- **C3 (flag-question auth gap):** `flag-question/route.js` — auth guard moved to top of handler; whitelist validation on `feedback_type`, `cert`, `difficulty`; `feedback_text` truncated to 1000 chars

### Phase 56e — Servings/container editable + search results capped — Complete
- `log-manual/page.js`: servings_per_container is now an editable input field (pre-filled by AI, editable before saving); saved to My Favorites library when checked; "× 2.5 (whole container)" quick-fill button shown when value is set
- `nutrition/page.js`: capped all `results.map()` calls to `results.slice(0, 8)` in SearchModal and MealBuilder search — prevents unbounded DOM lists from crashing mobile

### Phase 56d — Standalone add-food page replaces inline AddFoodModal — Complete
- AddFoodModal was crashing the mobile tab when opened from any "Add [slot]" button — same OOM root cause as Edit Details
- New `/life-hub/nutrition/add-food?slot=breakfast` page handles the entire add-food flow off the heavy nutrition page
- Page has two tabs: ⭐ Favorites (filtered list with servings + whole-container button) and 🔍 Search (OFFs search + barcode scanner + AI estimate)
- "✏️ Enter food manually" button on both tabs navigates to existing log-manual page
- AI estimate flow on search tab: preview card with "Log It" + "Edit Details" (navigates to log-manual)
- All "Add [slot]", "Log Lunch", "Log Snack", and empty-slot dashed buttons now use `window.location.href` to navigate to add-food page
- Servings per container shown on both Favorites and Search result panels with "whole container" quick-fill button

### Phase 56c — Servings per container on log-manual page — Complete
- AI fill response includes `servings_per_container` (e.g. 2.5 for a can of soup) — now stored and displayed on the log-manual page
- Shows "(2.5 per container — log whole container)" hint next to the Servings input
- "log whole container" button pre-fills the servings field with the container count so macros are correctly multiplied

### Phase 56b — Edit Details hard navigation fix — Complete
- `router.push()` is a React client-side navigation — the current page's JS keeps running until the new page mounts, which on mobile is enough to crash the tab
- Changed "Edit Details" button to `window.location.href = ...` — this is a hard browser navigation that immediately halts all JS on the current page, freeing its entire RAM budget before the log-manual page loads

### Phase 56 — Barcode Scanner + AI Food Estimate Crash Fix — Complete
- **Barcode scanner added** to Nutrition food search (📷 button next to search input in AddFoodModal) and Drinks & Hydration drink search
- Native `BarcodeDetector` API only — no WASM polyfill (WASM caused OOM crashes on mobile); shows clear error on unsupported browsers
- Camera resolution reduced to 640×480 to minimize frame buffer memory; requires same barcode 3 consecutive frames before firing
- `onResultRef` pattern in `BarcodeScannerModal` — stores `onResult` in ref so `useEffect` dependency array is `[]`, preventing runaway camera restarts on every parent re-render
- **Crash fix:** "Ask AI to estimate" → "Edit Details" path was crashing mobile tabs (Android OOM killer)
  - Root cause: rendering additional inputs on the heavy nutrition page pushed RAM over mobile browser limit
  - Fix: AI result shows a lightweight preview card (name + cal/protein/carbs/fat chips + "Log It" + "Edit Details")
  - "Edit Details" stores prefill in `sessionStorage` and navigates to new standalone `/life-hub/nutrition/log-manual` page
  - Log-manual page is completely separate — completely unmounts the heavy nutrition page, giving the form all available RAM
- New file: `src/app/life-hub/nutrition/log-manual/page.js` — lightweight standalone manual entry; reads `manual_prefill` from sessionStorage; shows name/brand/serving + 4 core macros; "▼ Show fiber, sodium & micronutrients" toggle; wrapped in `<Suspense>`

### Mobile — Life Hub status pills responsive wrap — Complete
- Replaced `repeat(4, 1fr)` with `repeat(auto-fit, minmax(140px, 1fr))` on the Zone 1 status bar grid
- On mobile (~390px): 2×2 grid; on desktop: all 4 pills in one row

### Mobile — LifeHubSidebar JS-based mobile detection — Complete
- Replaced CSS `@media` class injection with `isMobile` state using `window.innerWidth <= 768` in a useEffect + resize listener
- CSS-in-JSX `<style>` tags in Next.js App Router client components are unreliable for media queries; JS-driven conditional rendering is guaranteed to work
- On mobile: renders hamburger button + backdrop + slide-in overlay; on desktop: renders sidebar in flow as before

### Mobile — SW cache v2 bump — Complete
- Bumped `CACHE` from `csa-shell-v1` to `csa-shell-v2` in `public/sw.js` to force full cache eviction on next SW update
- Fixes stale LifeHubSidebar JS bundle being served from old cache on PWA

### Mobile — viewport meta tag fix — Complete
- Added `<meta name="viewport" content="width=device-width, initial-scale=1">` to root layout
- Without this, mobile browsers render at ~980px desktop width so `@media (max-width: 768px)` never fires — sidebar drawer never activates on phones

### Mobile — Life Hub sidebar drawer — Complete
- LifeHubSidebar hidden on mobile (≤768px); hamburger button (☰) fixed top-left opens it as slide-in overlay
- Backdrop tap and route change both close the drawer
- life-hub/layout.js adds `padding-top: 64px` on mobile so content clears the hamburger
- Matches the existing StudyHubSidebar mobile pattern (same CSS class naming convention, different prefix `lh-`)

### PWA — Progressive Web App (installable) — Complete
- `public/manifest.json` — app name "Cert Study App", short_name "CSA", display standalone, theme #a78bfa, 192+512 icons
- `public/sw.js` — cache-shell service worker; caches `/` and `/offline`; cache-first for static assets; network-first for navigation; skips all `/api/`, Supabase, non-GET requests
- `src/app/offline/page.js` — offline fallback page ("You're offline" + Try Again)
- `src/components/ServiceWorkerRegistrar.js` — client component that registers `/sw.js` on mount, renders null
- `src/app/layout.js` — added manifest link, theme-color meta, Apple PWA meta tags, apple-touch-icon, mounts ServiceWorkerRegistrar
- `public/icons/icon-192.png` + `icon-512.png` — generated via sharp (dark bg + purple CSA text)
- Install on iPhone: Safari → Share → Add to Home Screen; Android: browser menu → Install App

### Vercel Fix — Heart Rate page crash (Rules of Hooks) — Complete
- Root cause: `useCallback` was declared after `if (loading) return` and `if (!connected) return` — violating Rules of Hooks (hooks must be called unconditionally). React error #310 in production.
- Fix: moved ALL computation (fiveMin, chartPoints, avgPath, bandPath, yTicks, etc.) and `useCallback` to BEFORE the conditional returns; early returns now placed after all hooks
- Also replaced `Math.min/max(...spread)` with `.reduce()` throughout, and added `Math.max(yMax, yMin+30)` guard so yMax is always > yMin
- ErrorBoundary class component left in place (catches any future render errors gracefully)

### Vercel Fix — Heart Rate page crash — Complete
- Heart rate page was crashing the browser tab when navigating to it
- Fix 1: wrapped entire `load()` in try/catch so fetch errors don't propagate uncaught
- Fix 2: guarded `yStep` with `Math.max(10, ...)` to prevent a zero-step value; added `yTicks.length < 20` cap on the tick loop as a hard safety net
- Fix 3: replaced `Math.min(...spread)` / `Math.max(...spread)` with `.reduce()` to avoid potential stack overflow on large arrays

### Vercel Fix — SITE_URL self-reference bug in health callback — Complete
- `replace_all` accidentally replaced `process.env.NEXT_PUBLIC_SITE_URL` inside the SITE_URL constant definition itself, creating `const SITE_URL = SITE_URL || ...` — fixed to use `process.env.NEXT_PUBLIC_SITE_URL`

### Vercel Fix — Google Health OAuth redirect_uri undefined — Complete
- `NEXT_PUBLIC_SITE_URL` was undefined in server-side API routes on Vercel (env var with `NEXT_PUBLIC_` prefix is only guaranteed in client bundles)
- Both `connect/route.js` and `callback/route.js` now use a `SITE_URL` constant: `NEXT_PUBLIC_SITE_URL || (VERCEL_URL ? https://VERCEL_URL : localhost:3000)`
- `VERCEL_URL` is auto-injected by Vercel at build time — no env var needed

### Vercel Build Fix — useSearchParams Suspense Boundaries — Complete
- Wrapped `useSearchParams()` in `<Suspense>` on 5 pages that failed production build: `/join`, `/study-hub/test`, `/life-hub/workouts/log`, `/settings`, `/life-hub/goals/setup`
- Pattern: renamed default export to `XxxInner`, added Suspense wrapper as new default export; added `Suspense` to React import in each file

### Phase 55 — Orphaned Inputs + Recovery Score Stretching + Daily Brief Sore Spots — Complete
- **Orphaned Inputs wired downstream (item #4):**
  - `biggest_obstacles` + `biggest_obstacles_other` now injected into `generate-plan/route.js` AI prompt — phrased as "factor into exercise selection and recovery planning (chronic pain affects exercise choice; time constraints affect session length)"; `goals_profiles` select expanded to include both fields
  - `primary_motivations`, `why_goals`, `sleep_hours` (from goals_profiles) wired into `daily-brief/route.js` — builds `personalContext` block with motivations (tone-shaping instruction to Claude), known obstacles (acknowledge if relevant to today's data), why text (reference only if genuinely connects), sleep target vs actual gap; system prompt updated with instructions to let motivations shape HOW things are said without reciting them verbatim
- **Recovery Score — Stretching component:**
  - Life Hub home (`page.js`) now fetches `stretch_logs` for yesterday; computes `stretchPts` (standalone=8, post_workout=5, pre_workout=3); adds to `maxAvailable` and `rawTotal`; `stretchPts` and `stretchSessionType` passed in score object; new "🧘 Stretching" component card in detail expand with session-type-specific explanation and tip
  - "How it's calculated" text updated to include Stretching when logged; simplified format
- **Daily Brief — sore spots + stretch context:**
  - `daily-brief/route.js` now fetches today's check-in (`sore_spots`) and yesterday's `stretch_logs` in the parallel Promise.all
  - New "MOBILITY & RECOVERY" section in Claude's data summary: reports sore spots and stretch session (type + count) or "none logged"
  - System prompt updated: instruct Claude to acknowledge sore spots and connect to stretch recommendation; only mention if in the data
- **Stretching page — workout fetch fix:**
  - Replaced broken `fetch('/api/workouts/log?limit=1')` with Supabase client direct queries; now fetches `workout_logs`, `stretch_logs`, and `daily_checkins.sore_spots` in parallel via `Promise.all`; auto-sets `post_workout` session type when a workout was logged today
- **Future Features:** item #4 (Orphaned Inputs) moved to Phase Log; Future Features list now complete

### Phase 54 — Stretching & Mobility Section — Complete
- **`src/data/stretches.js`** — 38 stretches across 10 muscle groups; exports `STRETCHES`, `STRETCH_MUSCLE_GROUPS`, `BODY_PART_TO_STRETCH_GROUPS`, `STRETCH_BY_ID`, `STRETCH_BY_GROUP`, `getRecommendedStretches(bodyParts, soreSpots)`; each stretch has id, name, muscle_group, stretch_type (dynamic/static/both), how_to, common_mistakes, contraindications, duration_seconds; `getRecommendedStretches` builds targeted groups from today's workout body parts + sore spots, returns `{ dynamic, static, isRestDay, targetGroups }`
- **`src/app/api/workouts/stretch-log/route.js`** — GET (date param, returns today's logs); POST (stretch_ids, session_type, duration_seconds) → inserts to `stretch_logs`; RLS-enforced via user_id
- **`src/app/life-hub/workouts/stretching/page.js`** — Daily recommendation page; sore spots chip selector (9 options, red when active); session type toggle (Pre-Workout/Post-Workout/Standalone); physiological callout explains dynamic-before/static-after rule; stretch cards with type badge, muscle group chip, duration, expandable how-to + mistake + contraindication panels; Select All per section; sticky log button counts checked stretches; logged-today banner; duration tracked from first checkmark
- **`src/app/life-hub/workouts/stretching/library/page.js`** — Full library; type filter (All / Dynamic / Static) with explainer callouts; muscle group nav chips; expandable rows with full details
- **`src/components/LifeHubSidebar.js`** — Added "Stretching & Mobility" and "Stretch Library" under Workouts dropdown; workoutsOpen auto-triggers on stretching routes
- **DB**: `stretch_logs` table (user_id, date, stretch_ids TEXT[], session_type CHECK, duration_seconds, logged_at; RLS enabled); `sore_spots TEXT[]` column added to `daily_checkins`
- **`src/app/api/reset/route.js`** — Added `stretch_logs` scope
- **`src/app/settings/page.js`** — Added "Stretch Log History" reset row

### Phase 51 — Pre/Post Workout Meal Advisor + gain_weight Goal + Supplement Adherence — Complete
- **Pre/Post Workout Meal Advisor**: two dismissible banners on Food Log tab — post-workout (blue, shows minutes since completion, protein target + 30-50g carbs, "Log Snack" CTA, visible for 2 hrs after workout finish); pre-workout (blue, shows planned workout label, timing tip, visible all day until workout logged); `workout_logs` query updated to include `created_at`; `workoutFinishedAt` state added
- **gain_weight Goal Option**: added `{ key: 'gain_weight', label: 'Gain Weight / Bulk Up', ... }` to GOALS array in setup page; `calcGoalAdjustment` now handles `gain_weight` — timeline-based surplus (200–500 cal, capped at 500, min 200) or standard 350 cal/day surplus; modes: `gain_timeline` and `gain_standard`; modeExplanation dict updated with gain entries; Timeline card has gain variant framing (scale going up is the goal, Week 1-2 glycogen note, Week 3+ steady gain, "gaining too fast" warning); Scale Expectations card gain variant (different labels/text); gain works alongside build_muscle
- **Supplement Adherence Tracking**: new `supplement_logs` table (user_id, supplement_id, date, taken_at; UNIQUE on user+supp+date; RLS); `loadStack()` now fetches 30-day logs in parallel — derives `todayLogs` Set and `adherence` map (days taken/30); "✓ Taken Today" / "○ Mark Taken" toggle button per supplement card (green border + color when taken); adherence % chip on each card (green ≥70%, yellow ≥40%, grey otherwise); "✓ Mark All as Taken Today" bulk button appears when ≥2 supplements untaken; `handleMarkTaken` upserts/deletes with optimistic UI; reset route + Settings page reset row added

### Phase 50 — Dietary Preferences Wired Downstream — Complete
- Added `DIETARY_RULES` object and `getDietaryWarnings(food, prefs)` function to `nutrition/page.js` — keyword-based checks for vegan, vegetarian, gluten_free, dairy_free, low_sodium, keto, low_carb
- Warning chips (amber) appear on food search results, saved favorites, and My Favorites list in `AddFoodModal` and `SearchModal` when food name/brand matches a restriction keyword
- `AddFoodModal` and `SearchModal` accept `dietaryPrefs` prop; call sites pass `goals?.dietary_preferences || []`
- Meal plan page: added `getMealPlanWarnings` inline function; search results show amber warning chips when food conflicts with stored dietary preferences; `goals_profiles` select expanded to include `dietary_preferences`
- Encyclopedia: API route now returns `dietary_preferences` from `goals_profiles`; new "Vegan/Vegetarian Nutrient Watch List" panel renders above Low Energy banner when vegan/vegetarian pref detected — 6 at-risk nutrients (vegan) or 3 (vegetarian) with clickable buttons opening detail panel; panel always visible, not gated on log days

### Body Measurements — Intelligence Card + Goal Completion + Navy BF% — Complete
- Added `calcNavyBfPct(entry, heightInches, sex)` using the U.S. Navy Method — accurate BF% from tape measurements (waist/neck/hips + height); shown as a badge on every history entry where neck + waist measurements are logged
- Added `interpretBodyComp(current, previous, goalsProfile, supplements, recentCarbAvg)` — context-aware body composition signal card after each save
- Signal card analyzes weight delta vs measurement deltas (waist, arms, thighs) and classifies into 7 modes: muscle_gain, scale_noise, fat_loss, recomp, fat_gain, fat_loss_highbf, check_protein
- Context modifiers: (1) Creatine — if creatine is in supplement_stack, notes that missed doses cause water deflation without tissue loss; (2) Low carb — if 14-day avg carbs < 90g/day, notes glycogen depletion flattens muscles; (3) Navy BF% > threshold — when body fat is high (>25% male, >33% female), losing size everywhere is overwhelmingly fat not muscle — reduces false alarm signals
- `getGoalCompletion(hist, gp)` — checks latest weight vs target_weight_lbs; returns 'reached' (within 0.5 lbs), 'almost' (≤ 3 lbs over), or null
- Goal completion banner at top of page with 3 action paths: "Switch to Maintenance" (removes lose_weight), "Shift to Body Recomp" (adds lose_weight + build_muscle), "Set New Goal" (redirects to setup)
- `loadAll()` now fetches 4 things in parallel: measurements, goals_profiles (full row), supplement_stack, and food_log_entries for 14-day carb average

### Goals Setup + Nutrition — Timeline-Aware Calorie Target + Body Recomp — Complete
- Added `calcGoalAdjustment(goals, weightLbs, targetWeightLbs, timeline)` to `src/lib/tdee.js` — now exported and shared
- When target_weight_lbs + timeline both provided for lose_weight: calculates exact daily deficit from (lbs to lose × 3500) ÷ timeline days; capped 150–1,000 cal/day with explanation when adjusted
- Body recomposition mode: lose_weight + build_muscle selected simultaneously → 250 cal/day deficit with high-protein framing (not 500 cal pure cut)
- "No target weight" fallback: still defaults to 500 cal/day deficit with a note explaining how to get a personalized number
- Step 4 now shows: personalized eating target with math breakdown (TDEE ± X = target); projection badge (e.g. "Lose 6 lbs in 6 months"); ⚠ safety cap badge when timeline was too aggressive; explanation card per mode
- Nutrition page: now imports `calcGoalAdjustment` from shared lib; uses goals.weight_lbs + goals.target_weight_lbs + goals.timeline to compute the same adjustment; label shows ⚡ for recomp, 🔥 for deficit, 💪 for surplus

### Goals Setup + Nutrition — Eating Target vs Maintenance Clarification — Complete
- Goals setup Step 4 now shows two distinct numbers: "Eating Target" (goal-adjusted) as the primary large number with goal-colored border, and TDEE (maintenance) as a smaller secondary figure labeled "maintenance"
- Eating target formula: lose_weight = TDEE − 500, build_muscle = TDEE + 200, maintain/other = TDEE
- For weight loss/muscle: shows the deficit/surplus math inline (TDEE ± X = eating target), plus a brief explanation of WHY that specific number (1 lb/week fat loss pace; lean bulk with minimal fat gain)
- Projection badge shown: "~1 lb / week fat loss" or "~0.5 lb / week lean gain" or "Weight maintenance"
- Nutrition page calorie ring updated: `effectiveTarget` now applies the same goal adjustment before adding workout bonus; "Target" label updated to "Eating Target 🔥" (lose) or "Eating Target 💪" (build); a secondary line shows "Maintenance (TDEE)" when a deficit/surplus is active so user can see both numbers

### Heart Rate Phase 4 — 5-Minute Line Chart + RHR/HRV Fix — Complete
- Created `health_heart_rate_5min` table (user_id, date, minute_bucket SMALLINT, avg/min/max_bpm, sample_count; UNIQUE on user_id+date+minute_bucket; RLS enabled)
- Updated `sync/route.js`: added 5-minute bucketing alongside existing hourly; `minuteBucket = estHour*60 + floor(estMin/5)*5`; upserts to `health_heart_rate_5min` after hourly upsert
- Updated `workout-hr-sync/route.js`: same 5-minute bucketing added for live workout HR polling
- Updated `heart-rate/route.js`: added `fiveMinRes` query from `health_heart_rate_5min`; fixed RHR/HRV cards showing "—" — now falls back to `yesterdayDaily` when today has no resting data (Google stores resting HR under the sleep date, which is often yesterday); `workoutWindow` now exposes `startMinute`/`endMinute` in addition to hour fields; `fiveMin` included in response
- Rebuilt `heart-rate/page.js`: replaced 24-bar chart with SVG line graph using 5-minute data points; line colored segment-by-segment by BPM zone; min/max shaded band behind line; hover on SVG finds closest data point and shows tooltip with time (e.g. "2:30p") + BPM + range; workout window drawn as a shaded red band; falls back to hourly intraday if 5-min table is empty (existing users before re-sync); X-axis labeled every 3 hours; Y-axis auto-scales to data range

### Heart Rate Phase 3 — Workout Zone Breakdown — Complete
- Added `computeHrZones(supabase, userId, logId, durationSeconds)` in `/api/workouts/log/route.js`:
  - Computes workout start/end from `Date.now()` and `duration_seconds`
  - Fetches `health_heart_rate_intraday` rows for the workout date filtered to start/end hours
  - Fetches `goals_profiles.age` to compute max HR (220 - age; default 35 if not set)
  - Zones: Fat Burn 60-70%, Cardio 70-80%, Hard 80-90%, Peak 90%+
  - Minutes estimated from `sample_count / 6` (~10s per sample)
  - Writes result to `workout_logs.hr_zones` JSONB; returns `null` silently if no intraday data
- POST and PATCH handlers now run `computeHrZones` in `Promise.all` alongside overload detection; `hrZones` included in response
- Completion screen: new HR Zones card renders when `done.hrZones` has any non-zero zone minutes — proportional colored bar + legend with minutes per zone + avg/max bpm header; gracefully absent when Google Health not connected or no HR data for the session
- History page: expanded session rows now show HR zones bar + legend when `log.hr_zones` exists — automatically populated for any future workout; historical sessions without data show nothing (no empty state)

### Heart Rate Phase 1 + 2 — Complete
- Created `/api/health/heart-rate/route.js` (GET): returns `intraday` (hourly avg/min/max_bpm for requested date), `daily` (7-day resting HR + HRV trend), `workoutWindow` (start/end hour from today's workout_logs, if any), `todayAvg`, `todayResting`, `todayHrv`
- Created `/life-hub/health/heart-rate/page.js`:
  - Top cards: Avg Today (color-coded by zone), Resting HR, HRV (RMSSD)
  - 24-hour bar chart: 24 slots (one per hour), bars colored by BPM zone (blue=resting/blue, green=light, amber=moderate, yellow=hard, red=peak); workout window bars highlighted red with legend annotation; future-hours shown as faded grey; hover tooltip shows avg/min/max + zone + workout flag
  - 7-day resting HR trend: SVG polyline with labeled dots, today's dot filled larger, grid lines, day labels — only shown when ≥2 days of resting data exist
  - HRV panel: current value + context paragraph + 4 zone chips (< 20ms / 20–40 / 40–60 / 60ms+) with active chip highlighted
- Upgraded `/life-hub/health/page.js` (Health Overview):
  - Primary stat cards (Steps, Avg HR, Sleep) are now clickable Links to their sub-pages with "View details →" hint
  - Added second row: Resting HR card, HRV card, Sleep Score card (all linked to sub-pages; sleep score color-coded by tier)
  - Removed "more data coming soon" placeholder
  - Refresh now also re-fetches heart-rate endpoint in parallel
- Added "Heart Rate" link to LifeHubSidebar Health dropdown (between Step Tracker and Sleep Tracker)

### Sleep Tracker Upgrade — Complete
- Added `ScoreRing` SVG component: animated progress ring (0–100), color-coded (green ≥80 / blue ≥65 / yellow ≥50 / red <50), shows score and label (Excellent/Good/Fair/Poor)
- New top card combines score ring + quality metrics grid: Total Sleep, Sleep Onset (with green/yellow threshold at 20m), Efficiency (threshold at 85%), Awakenings (threshold at 3), Restlessness label (Restful/Normal/Restless/Very Restless) — all pulled from new sync route fields (sleepScore, sleepOnset, sleepEfficiency, sleepAwakeCount, sleepRestlessness)
- Stage summary cards (Deep/REM/Light/Awake) now show percentage of total sleep + target range below the minute count
- Added `STAGE_EDUCATION` constant with 4 detailed education cards (collapsible) explaining Deep/REM/Light/Awake:
  - Each card: target %, plain-language description of what's happening, bulleted body processes, "If you're low" warning callout
  - Deep: muscle repair, immune cells, brain waste flushing
  - REM: memory consolidation, emotion processing, creativity, motor skills
  - Light: sleep spindles, bridge role, why it still matters
  - Awake: normal awakening count ranges, temperature/alcohol/consistency tips
- Cards expand on click, auto-annotate with your actual minutes + percentage for the stage
- All new data (`sleepScore`, `sleepOnset`, etc.) was already being written by the sync route from Phase 0 — purely a UI update, no API changes

### Edit Saved Favorites — Complete
- Added `foodCompleteness(food)` helper (module-level): returns `'complete'` (all 4 macros + ≥6 tracked micros), `'partial'` (all macros, few micros), or `'minimal'` (missing a core macro)
- Added `CORE_MACRO_KEYS` and `TRACKED_MICRO_KEYS` constants at module level (19 micro fields tracked)
- Added `EditFoodModal` component: full-screen modal with all 27 nutrition fields pre-populated from saved food; grouped sections (Macros, Fats & Cholesterol, Minerals, Vitamins, Other); 🤖 Fill N missing button calls `/api/nutrition/ai-micro-fill` and highlights AI-estimated fields in yellow; Save Changes calls `PUT /api/nutrition/my-foods` (already existed); AI-filled fields can be individually edited; closing clears the modal
- Modified `SavedFoodsTab`: added `onEdit` prop; added ✏️ button to each FoodRow (calls `onEdit(food)`); added completeness chip (✓/⚠/✗) to each food name row with tooltip explaining the status; added completeness summary header ("X complete · Y partial · Z minimal") below subtitle when foods exist; updated subtitle hint text to include "✏️ to edit"
- Added `editingFood` state and `handleEditMyFood` handler to `NutritionPage`; handler updates `myFoods` in-place and closes modal
- Rendered `EditFoodModal` in `NutritionPage` return when `editingFood` is set
- Wired `onEdit={setEditingFood}` onto `SavedFoodsTab` call site

### Heart Rate Phase 0 — Complete
- Created `health_heart_rate_intraday` table (user_id, date, hour, avg/min/max_bpm, sample_count; UNIQUE on user_id+date+hour; RLS enabled)
- Added `resting_bpm SMALLINT` and `hrv_rmssd NUMERIC(6,2)` columns to `health_heart_rate_daily`
- Added `hr_zones JSONB` column to `workout_logs`
- Added sleep quality columns to `health_sleep_sessions`: onset_minutes, efficiency_pct, awake_count, longest_stretch_min, restlessness TEXT, sleep_score SMALLINT
- Extracted `refreshTokenIfNeeded`, `fetchDataType`, `estDateStr`, `getEstHour`, `computeSleepMetrics`, `computeSleepScore` to `src/lib/googleHealth.js` (shared by sync and workout-hr-sync routes)
- Updated `sync/route.js`: imports from shared lib; dual-buckets HR samples by both date (daily) and date+hour (intraday); adds `daily-resting-heart-rate` and `daily-heart-rate-variability` fetches (defensive field name handling); computes and stores all sleep quality metrics on every sleep session upsert
- Created `src/app/api/health/workout-hr-sync/route.js`: lightweight POST, fetches last 2 hours of HR only, upserts intraday rows — called every 90s during active workouts
- Updated workout log page (`src/app/life-hub/workouts/log/page.js`): checks `/api/health/status` on load; starts 90s HR polling interval when `running=true` and `healthConnected=true`; stops polling on finish; fires one final sync call before showing post-workout modal
- **No user-visible changes** — data now accumulates in background

### Phase 49 — Navigation Restructure + Visual Identity + AI Food Intelligence — Complete

**Sprint 1A — Sidebar Restructure**
- Hydration (formerly Water Tracker) moved from Health → Nutrition group in sidebar
- Supplements moved from Goals → Nutrition group in sidebar
- Monthly Wrap moved from top-level → under Overview group
- All URLs unchanged — sidebar navigation only

**Sprint 1B — Section Color System**
- `SECTION_COLORS` constant in LifeHubSidebar: Overview=#a78bfa, Goals=#06b6d4, Health=#22c55e, Nutrition=#f97316, Workouts=#3b82f6
- Section headers colored, active nav items get section-colored left-border pill
- All Life Hub page headers use section color for title

**Sprint 1C — Overview Dashboard**
- Zone 1: 4-pill status bar (calories/workouts/steps/water, each section-colored)
- Zone 2: Daily Brief (compact, collapsible after first read, section-colored left border)
- Zone 3: 2×2 live section summary cards (Nutrition/Workouts/Health/Goals with real data + left-border accents)
- Recovery Score: above section cards, 42px score, vertical bar mini-components, click-to-expand breakdown
- Smart Contextual Check-In + 28-day heatmap below

**Sprint 2A — AI Food Intelligence**
- `ai_food_intel_cache` table (food_key, intel JSONB, generated_at); shared across users
- `POST /api/nutrition/ai-food-intel` — Haiku, cached by normalized name
- `FoodIntelCard` component: GI/satiety/density/processing chips + detail rows + best time + pairings + fun fact
- Appears in SearchModal, AddFoodModal, and SavedFoodsTab expanded row
- Personalized timing: `workoutCtx` prop (loggedToday / plannedLabel) overrides best_time_note

**Sprint 2B–2G — Nutrition UX**
- Servings-per-container on food cards; "Use whole container" button
- AI autofill missing micros (🤖 Fill N missing — amber tint, editable)
- AI fallback search (OFFs returns 0 → "Ask AI to estimate" banner)
- %DV toggle on manual entry form
- Weight-to-servings input (type total grams → servings auto-calculates)
- My Favorites sorted: pinned → recent → log count → name; section dividers; 📌 pin; ↺ quick-repeat; frequency insight

### Phase 48c - Complete
- **AddFoodModal manual tab upgraded to chip-picker UI matching EditFoodModal**: replaced collapsed "▼ Show fiber, sodium & micronutrients" section with full chip picker (Minerals/Vitamins/Other groups); 2-column macro grid; DV%/mg toggle appears inline only when micros are active; category selector always visible (moved above macros); AI Fill now activates nutrient chips for any estimated micro fields; `NUTRIENT_GROUPS` + `ALL_MICRO_META` constants added at module level

### Phase 48b - Complete
- **AddFoodModal rewritten with 3 equal tabs**: "⭐ My Favorites" | "✏️ Enter Manually" | "🔍 Search Database" — manual entry is now first-class
- **Create a Meal moved into AddFoodModal**: footer link on My Favorites tab
- **Tabs moved to top of Nutrition page**: appear before calorie ring; "📅 Weekly Meal Plan" added as a proper tab
- **Drinks filtered from meal favorites**: `is_drink` flag used to separate meal vs drink flows
- **MealBuilderModal custom ingredient button**: styled prominently in purple

### Phase 48 - Complete
- **Nutrition UX overhaul — Favorites-first flow**: new `AddFoodModal` opens on My Favorites tab by default; inline Log button per item; Find Food tab for search + manual entry with "⭐ Save to Favorites" defaulted on
- **SavedFoodsTab redesigned**: Log/Cancel per item; servings input + calorie preview + slot chips; renamed "Add Food" → "Add Favorite"
- **OFFs result cap**: 8 results max to reduce overwhelm

### Phase 47f - Complete
- **MealBuilderModal per-ingredient nutrition editing** — all 21 fields per ingredient; custom ingredient add; auto-expand on add

### Phase 47e - Complete
- **Create a Meal** — `MealBuilderModal`; per-ingredient servings; live macro totals + per-serving; saves to `my_foods` as per-serving; no new DB tables

### Phase 47d - Complete
- **Add to My Foods Library** — `libraryOnly` mode on SearchModal; saves without logging; stays open for bulk entry
- **Add to My Drinks** — create form on Hydration page; saves to my_foods with is_drink=true

### Phase 47c - Complete
- **Full nutrition fields on drink log modal** — calories, water, caffeine + expandable more nutrients

### Phase 47b - Complete
- **Edit logged drink entries** — ✏️ on each drink opens edit modal; PATCH `/api/nutrition/log`
- **Manage saved drinks** — Edit + Delete per drink; PUT `/api/nutrition/my-foods`

### Phase 47 - Complete
- **Stack Interactions card** on Supplements page — rule-based timing warnings and synergy tips (Iron+Calcium, Iron+Vitamin C, Caffeine+Iron, Zinc+Copper, Vitamin D fat absorption, Magnesium evening)
- **Drink Timing chart** on Hydration page — 18-bar hourly chart (5am–11pm); smart callout for back-loaded or midday-gap hydration
- **Daily Brief deep sleep + supplement interaction warnings** — stages JSONB fetched; deepSleepMin/remSleepMin added; supplement warnings injected into Claude context

### Phase 46 - Complete
- **3 new nutrients in Encyclopedia** — Omega-3, Vitamin K, Choline added to NUTRIENTS array; all encyclopedia features auto-propagate
- **DB migration `phase46_new_nutrients`** — `omega3_g`, `vitamin_k_mcg`, `choline_mg`, `added_sugar_g` added to food_cache, my_foods, food_log_entries, meal_plan_entries
- **OFFs extraction updated** — omega-3, vitamin K, choline, added sugar extracted from OFF nutriments
- **Recovery Score widget on Life Hub home** — 5 components: Sleep (0–25), Hydration (0–20), Protein (0–20), Energy (0–15), Workout Load (0–10) = 90 base; HRV adds 10 when watch data available; normalized to 100

### Phase 45b - Complete
- **Supplement caffeine → Hydration total** — active supplements with caffeine contribute to daily caffeine total
- **Daily Brief hydration upgrade** — total hydration (water + beverage water_g) + yesterday's caffeine including supplements
- **Monthly Wrap hydration upgrade** — includes beverage water_g; avg_caffeine_mg added
- **Weight chart rolling average** — dual lines: raw data (dim) + 7-day rolling average (bold); scale-context callout when consecutive entries differ ≥1.5 lbs within 3 days

### Phase 45 - Complete
- **Drinks & Hydration page** — redesigned from Water Tracker; stacked SVG ring (water/beverages/food water); drink search + log; saved drinks chips; caffeine tracker; combined today's log

### Phase 44h - Complete
- **Symptom Checker modal** — 22 symptoms in 5 categories; ranked results with mechanism sentences; synthesis callout; supplement coverage note; handoff to detail panel

### Phase 44g - Complete
- **Symptom-check banner** on Encyclopedia — 14 symptom pills; prioritizes symptoms from low/moderate nutrients; opens detail panel on click

### Phase 44f/e/d/c/b - Complete
- Encyclopedia UI tweaks (panel width, color fixes, timeout fix, params await fix, max_tokens increase)

### Phase 44 - Complete
- **Nutrient Encyclopedia** at `/life-hub/nutrition/encyclopedia` — 13 tracked nutrients; Gap Report card; Low Energy banner; color-coded status grid; right-drawer detail panel; AI profiles cached in `nutrient_profiles` (shared)
- New DB table: `nutrient_profiles`; new data file: `src/data/nutrients.js`

### Phase 43e - Complete
- **Nutrition sidebar dropdown** — "Nutrition" is now a collapsible dropdown with Food Log, Meal Plan, Encyclopedia children

### Phase 43d - Complete
- **Monthly Wrap account-age guard** — blocks months before user.created_at; GET returns `account_since`

### Phase 43c - Complete
- **Monthly Wrap history sidebar** — all past wraps as clickable chips; current month shows "still in progress"
- **Auto-generate on the 1st** — LifeHubSidebar triggers background POST silently; tracks in localStorage
- **GET /api/life-hub/monthly-wrap (no ?month=)** — returns list of all months with a wrap

### Phase 43b - Complete
- **Monthly Wrap notification popup** — bottom-right toast; "Take me there →" navigates; dismissal in localStorage

### Sprint 3A: Contextual Banners + Better Empty States - Complete
- **Lunch reminder** (12–2pm, no lunch logged) — orange banner with "Log Lunch" shortcut button + dismiss
- **Water gap banner** (3pm+, today's water < 40% of goal) — cyan banner showing oz logged vs goal + dismiss; reads from `water_logs` + drink food entries
- **Protein gap banner** (yesterday's protein < 80% of target) — green banner showing yesterday's actual vs target; fetches yesterday's log entries on page load
- **Empty meal slot state** — replaced "Nothing logged yet." text with a dashed "+ Log breakfast…" button that opens the food modal directly
- Nutrition page `load()` now fetches yesterday's log entries + today's water from `water_logs` in parallel

### Phase B: Age-Adjusted Micronutrient Targets + Teen Safety Gates - Complete
- **`calcMicroTargets(age, sex)`** added to `src/lib/tdee.js` — returns NIH DRI-sourced per-nutrient daily targets keyed by DB column name (calcium_mg, vitamin_d_mcg, iron_mg, magnesium_mg, etc.) + `b12AbsorptionFlag` true when age ≥ 50
- **Teen deficit cap** in `calcGoalAdjustment` — 4th `age` param; under-18 users capped at 300 cal/day deficit (vs 1,000 for adults) with teen-specific cap explanation text
- **Encyclopedia page** — now fetches age+sex from goals_profiles (added to encyclopedia route query); computes `microTargets` from `calcMicroTargets`; passes to all `getStatus()` calls, NutrientCard, DetailPanel, and SymptomCheckerModal; RDV label in DetailPanel notes "adjusted for your age & sex" when different from FDA default
- **B12 absorption banner** — shown on Encyclopedia page for users 50+ explaining stomach acid reduction + supplement recommendation
- `encyclopedia/route.js` — adds `age` and `sex` to goals_profiles select + returns them

### Phase C: Micronutrient Bar Tracker across Food Log, Meal Plan, Encyclopedia - Complete
- **`NutrientBars` component** in nutrition/page.js — stacked horizontal bars for all 16 nutrients; food portion color-coded (green/yellow/red by coverage %), supplement layer in purple; personal targets from `calcMicroTargets`; always-visible (no "log food first" gate)
- **Food Log "Micronutrient Tracker"** — renamed from "Full Nutrition Breakdown"; replaces old mini card grid; shows food + supplement stacked bars live as you log
- **Meal Plan "Weekly Nutrient Coverage"** — collapsible panel below the day grid; 7-day average vs daily target for 7 tracked nutrients; supplement layer included; note explaining which nutrients meal plan tracks
- **Encyclopedia "▬ Bars" tab** — new view toggle (⊞ Cards | ▬ Bars); dashboard view shows all nutrients as full-width stacked bars sorted by category; click any row opens detail panel in Cards view; supplement layer visible
- nutrition/page.js imports `calcMicroTargets` from tdee.js + `matchSuppToNutrient`/`parseSuppAmount` from data/nutrients

### Fix: measurements page handlePhotoUpload - Complete
- `handlePhotoUpload` function was missing from measurements/page.js despite being referenced — added function that POSTs FormData to `/api/goals/progress-photos`, updates photo list, shows success/error in `photoMsg`

### Phase A - Complete
- **"What Happens Now" Full Expansion** — Goals Setup step 5 expanded with: timeline math card (lbs over weeks = lbs/week pace; recomp honest framing); macro targets grid (protein/carbs/fat in grams with per-macro plain-language why); age-specific callout (5 brackets: teen/young_adult/adult/midlife/older_adult); dietary pref callouts (vegan B12/iron/zinc, vegetarian iron note, picky eater framing); scale expectations card (Week 1–2 water weight/Week 3–6 fat loss/Plateaus); `calcMacros` added to import from `@/lib/tdee`

### Phase 43 - Complete
- **TDEE Calibration** — `goals_profiles.custom_tdee`; `/api/nutrition/tdee-check`; calibration card on Nutrition page; `tdee_suggestions` table
- **Progress Photos** — private Supabase Storage; `progress_photos` table; `/api/goals/progress-photos`; photo grid + lightbox on Measurements page
- **Monthly Wrap** — `/life-hub/monthly-wrap`; `monthly_wraps` table; `/api/life-hub/monthly-wrap`; stat cards; cached forever per month

### Phase 42 - Complete
- **Daily Brief fix** — generates once per day strictly; removed manual Refresh button
- **Weekly Meal Plan** at `/life-hub/nutrition/meal-plan` — Mon–Sun × meal slots grid; food search; "Analyze This Week" AI insights (4–6 typed callouts)
- New DB tables: `meal_plans` + `meal_plan_entries`

### Phase 41 - Complete
- **Daily Brief** — AI paragraph synthesizing all data; cached in `daily_briefs`; skeleton loading; instant on return visits
- **Smart Contextual Check-In** — questions adapt based on yesterday: post-leg-day, under-target calories, short sleep, low-energy streak
- **Micro-Insight after saving** — rule-based, instant, no AI; fires after check-in save

### Phase 40 - Complete
- **Goals Setup rebuilt — 5 steps**: Your Goals → Your Body → Activity & Exercise → Your Context → What Happens Now
- **New Step 2 "Activity & Exercise"**: job type, exercise days/type/duration, consistency, calorie history
- **`/src/lib/tdee.js` created** — `calcTDEE()`, `calcMacros()`, `tdeeBreakdown()`, `estimateBodyFatPct()`; Katch-McArdle formula
- **DB migration**: 6 new columns to `goals_profiles` (job_activity, exercise_types[], exercise_days_per_week, exercise_duration_min, exercise_consistency, calorie_history_note); `tdee_suggestions` table

### Phase 39 - Complete
- **Full micronutrient tracking** — 14 new columns on food_cache, my_foods, food_log_entries; OFFs mapping updated; Full Nutrition Breakdown panel; ⭐ Saved Foods system; Copy from yesterday; workout calorie bonus; fiber added to macro row; sodium shown inline

### Phase 38 - Complete
- **Full Nutrition Dashboard** — TDEE + macro targets; calorie ring; food log by meal slot; food search modal (OFFs + my_foods + food_cache); manual entry; My Foods tab; Supplements tab

### Phase 37 - Complete
- **Fatigue signal on Workout Plan page** — energy ≤ 2 → yellow ⚡ callout recommending lighter session
- **Hydration reminder on Workout Log page** — < 50% of goal → dismissible 💧 banner

### Phase 36 - Complete
- **7 cross-feature improvements**: exercise chatbot knows workout profile; Goals AI overview regenerate button + supplement context; BMI chip per measurement history row; Life Hub home live stats strip; Nutrition page supplement preview; Settings Goals section restructure; workout completion nutrition window hint

### Phase 35 - Complete
- **Supplement Stack** at `/life-hub/goals/supplements` — add/edit/remove; AI Info card cached in `supplement_profiles`; nutrient chips; timing; Stack Interactions
- New tables: `supplement_stack`, `supplement_profiles`

### Phase 34 - Complete
- **Water Tracker** at `/life-hub/health/water` — SVG progress ring; quick-add; custom entry with time; 7-day bar chart; goal persisted to localStorage
- New `water_logs` table

### Phase 53 - Complete
- **Exercise trainer chatbot** — inside `?` modal; Haiku; multi-turn; `<user_input>` tags; `/api/workouts/exercise-chat`
- **Rest timer** — auto-starts 90s on working set complete; progress bar; quick-select buttons; ✕ dismiss

### Phase 52b - Complete
- **18 missing exercises added to Supabase** — all with instructions, muscles, metadata; gif_url = NULL pending images

### Phase 52 - Complete
- **Root bug fix**: `workout_logs` missing columns — migration added day_of_week, day_label, duration_seconds, plan_id, is_partial, post_workout_difficulty/energy/note
- **"What is this?" button** — `?` icon in active workout; pre-fetched exercise detail modal
- **Drop set contextual explanation** — purple info box per exercise type when set type = Drop Set
- **Post-workout check-in modal** — Difficulty + Energy + optional note before saving
- **Pause workout** — saves state to localStorage + partial log to DB; returns to plan
- **Resume workout** — restores exercises + elapsed + log_id; PATCH instead of POST on finish
- **Same-day completion gate** — "✓ Done Today" on plan card
- **Stale pause cleanup** — auto-cleared if paused workout is from previous day

### Fix: Colorful bars in Nutrient Encyclopedia dashboard view
- Added `NUTRIENT_COLORS` map — each of the 16 nutrients gets a distinct vivid hue (red/blue/purple/orange/emerald/amber/cyan/pink etc.)
- Dashboard bars now use a per-nutrient gradient fill (`linear-gradient` from 80% to 100% opacity of the nutrient color) instead of a flat status color; bars are 1px taller (8px)
- Status color still appears on the text label (green/yellow/red) so deficiency info is clear
- Legend updated to dots instead of rectangles, clarified as "Status labels"

### Ingredients vs Snacks vs Foods distinction + Meal Builder integration
- Added `is_ingredient BOOLEAN DEFAULT false` and `is_snack BOOLEAN DEFAULT false` columns to `my_foods` table
- **My Favorites tab** in AddFoodModal now shows three sections: "🥚 Ingredients", "🍿 Snacks", "🍽️ Foods & Meals"; sections only appear when they have items; ingredient and snack are mutually exclusive
- **Enter Manually tab** → when "Save to My Favorites" is checked, two sub-options appear: "🥚 This is an ingredient" and "🍿 This is a snack"; checking one unchecks the other
- **Meal Builder** now shows a "🥚 My Saved Ingredients" quick-pick chip row above the search box; chips show ✓ once added; nutrition pulls from saved data
- `my-foods` POST route now passes through `is_ingredient` and `is_snack` fields

### Fix: AI Fill on Add to My Drinks modal (hydration page)
- Added "🤖 AI Fill" button next to the Name field in the Add to My Drinks modal
- Type a drink name → click AI Fill → Haiku returns calories, caffeine, water content, and macros; pre-fills all fields; user reviews before saving
- New route: `POST /api/nutrition/ai-drink-fill` — drink-specific prompt (includes caffeine_mg and water_oz); Haiku; getUser() + is_disabled; name in user_input tags

### Fix: Saved drink delete not persisting (hydration page)
- **Problem:** Deleting a drink from "MY DRINKS" appeared to work but came back after switching pages; the DB delete was silently failing due to a FK constraint (`food_log_entries.my_food_id` → `my_foods.id`)
- **Fix:** `DELETE /api/nutrition/my-foods` now nulls out `food_log_entries.my_food_id` first, then deletes; returns a real error on failure; client only removes from state if `res.ok`

### Phase 52 - Complete
- **AI Supplement Fill** — "🤖 AI Fill" button in the add supplement form
- Type a supplement name → click 🤖 AI Fill → Haiku returns dose, timing, and nutrients; pre-fills form fields; user reviews and adjusts before saving
- New API route: `POST /api/supplements/ai-fill` — Haiku, getUser() + is_disabled check, name wrapped in `<user_input>` tags, returns `{ fill: { dose, timing, nutrients } }`; returns `{ error }` for unknown supplements
- `SupplementForm` component updated to accept `hideName` prop (add form renders its own name input + AI fill button row above the form)
- AI filled indicator (green "✓ AI Filled" button + hint text) cleared when name changes

### Phase 51 - Complete
- **Workout Logging system** — active workout page, workout history, progressive overload detection
- `/life-hub/workouts/log/page.js` — live timer, exercise cards, set rows, add set/drop set, prev session hints, completion screen
- `/life-hub/workouts/history/page.js` — full history, expandable log cards, PR section
- `/api/workouts/log/route.js` + `/api/workouts/history/route.js`

### Phase 50 - Complete
- **Workout plan cardio placement rules** — no HIIT after legs/back; walking/bike only after those days
- **Dumbbell input redesign** — chip-based tag input; weights stored as numeric array

### Phase 49 (earlier) - Complete
- **Fix**: generate-plan route `session.user.id` → `user.id`
- **Goals setup UX polish**: activity level forced free-text explanation; body composition range badges; Step 4 section labels; dietary preferences "Picky Eater" / "Very Picky Eater" with required explanation; heatmap size reduction; workout plan generation timeout + compressed prompt

### Phase 48 (earlier) - Complete
- **Phase 33 — Daily Check-In widget** on Life Hub home — energy + mood 1–5, optional note, save/update; 28-day heatmap
- New table `daily_checkins` with RLS

### Phase 47 (earlier) - Complete
- **Phase 32 — Body Measurements page** — how-to guide, 9-field log form, history with delta indicators, weight-over-time SVG chart
- New table `body_measurements` with RLS

### Phase 46 (earlier) - Complete
- **Phase 31 — Goals Setup Step 4 "Your Context"** — Biggest Obstacles, Primary Motivations, Why These Goals, Dietary Preferences, Sleep Hours
- 8 new columns added to `goals_profiles`

### Phase 45 (earlier) - Complete
- **Authenticator app name on 2FA login** — chip selector during enrollment; stored in `profiles.authenticator_name`; shown on login TOTP prompt

### Phase 44 (earlier) - Complete
- **2FA (TOTP)** — Supabase MFA; QR enrollment; recovery codes (10, bcrypt-hashed, displayed once); login TOTP gate; owner admin Reset 2FA
- New table `recovery_codes`

### Phase 43 (earlier) - Complete
- **Update Password page** at `/update-password` — PASSWORD_RECOVERY auth event listener; strength bar; match indicator; redirects to /login on success

### Phase 42 (earlier) - Complete
- **Owner Admin Panel** — user list; Enable/Disable, Force Logout, Send Password Reset, Clear PIN per user
- **Brute force protection on /join** — `join_attempts` table + `check_join_rate_limit` Postgres function; 5 failed attempts per IP per hour → 429

### Phase 41 (earlier) - Complete
- **Account deletion** — Danger Zone; confirmation requires typing "DELETE"; `/api/delete-account` wipes all data + removes auth user
- **Privacy PIN** — optional Settings lock; bcrypt hash in `profiles.settings_pin_hash`; full-page PIN gate; Set/Change/Remove modals

### Phase 40 (earlier) - Complete
- Template cycling: fills remainder by looping pool if bank runs short

### Phase 39 (earlier) - Complete
- Removed AI fallback from `generate-questions` — tests serve from templates only; no live AI per question

### Monthly Wrap — Previous Month Comparison — Complete
- On generation, fetches previous month's `report_data`; builds comparison block for workouts, avg calories, avg energy, hydration, weight, resting HR, HRV, sleep hours — only for metrics present in both months

### Monthly Wrap + Daily Brief — Watch Data + Educational AI — Complete
- Monthly Wrap: avg resting HR + trend, avg HRV, avg sleep, aggregated HR zone minutes; Claude explains what each metric means
- Daily Brief: resting HR + HRV for yesterday; Claude explains elevated/low values in plain language

### Settings — Danger Zone Tab + Gate — Complete
- Danger Zone moved to its own "⚠ Danger Zone" tab; gate page with warning shown first; gate resets on tab change

### Life Hub — Steps Pill Hidden Without Watch — Complete
- `google_health_tokens` check on load; 4-column (watch) vs 3-column (no watch) status bar; Steps pill hidden when no watch

### Daily Brief — Graceful Watch-less Handling — Complete
- Sleep line silently omitted when no data; manual sleep_hours from daily_checkins used as fallback

### Google Health — Connect Modal + Sidebar Gating — Complete
- Connect button opens confirmation modal (contact site owner first); Health sub-pages hidden in sidebar when not connected

### Manual Sleep Hours — Hide Field for Watch Users — Complete
- `hasGoogleSleep` flag hides "Hours slept?" field when watch provides sleep data

### Manual Sleep Hours in Daily Check-In — Complete
- `sleep_hours NUMERIC(4,1)` added to `daily_checkins`; Recovery Score falls back to this when no Google Health sleep

### Recovery Score Upgrade — HRV Component + Normalization — Complete
- Rebalanced: Sleep 25 + Hydration 20 + Protein 20 + Energy 15 + Workout Load 10 = 90 base; HRV +10 with watch; normalized to 100
- HRV scoring: ≥60ms=10, ≥40ms=8, ≥20ms=5, <20ms=2, null=excluded
