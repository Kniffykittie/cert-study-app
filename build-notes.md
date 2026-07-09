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
| `profiles` | User display name, exam_dates JSONB, daily_goal INT, default_cert TEXT, is_disabled BOOLEAN, settings_pin_hash TEXT (bcrypt), authenticator_name TEXT, notification_preferences JSONB (10 boolean keys; briefs default true, nudges default false) |
| `invite_codes` | Single-use signup codes — code TEXT UNIQUE, created_by, used_by, used_at TIMESTAMPTZ; null = unused |
| `join_attempts` | IP brute force tracking for /join — ip TEXT, attempted_at, success BOOLEAN; `check_join_rate_limit(ip)` Postgres function |
| `recovery_codes` | 2FA recovery codes — user_id, code_hash TEXT (bcrypt), used_at TIMESTAMPTZ (null = unused); RLS user-scoped |
| `api_rate_limits` | Per-user per-route per-hour call counts; incremented atomically via `increment_rate_limit` Postgres function |
| `push_subscriptions` | Web Push subscriptions — user_id, endpoint, p256dh, auth_key, user_agent; UNIQUE on user_id+endpoint; RLS: user manages own |
| `push_notification_log` | Delivery dedup log — user_id, sent_date TEXT, `"window"` TEXT (morning/midday/evening), title, body, delivered BOOLEAN; UNIQUE on user_id+sent_date+window; RLS: user SELECT only |

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
| `daily_checkins` | Energy (1–5), mood (1–5), sleep_hours NUMERIC, note per day; afternoon_energy, afternoon_mood, afternoon_note (Phase 76); UNIQUE on user_id+date; RLS enabled |
| `water_logs` | Plain water intake — user_id, date, amount_oz NUMERIC; one row per tap; RLS enabled |

### Goals & Body
| Table | Purpose |
|-------|---------|
| `goals_profiles` | Full health goals profile — goals TEXT[], height_inches, weight_lbs, age, sex, body_composition, job_activity, exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency, activity_level, activity_level_note, daily_steps, target_weight_lbs, timeline, notes, ai_overview, biggest_obstacles TEXT[], primary_motivations TEXT[], why_goals, dietary_preferences TEXT[], sleep_hours, water_goal_oz, custom_tdee INT, weekly_schedule JSONB, wake_time TIME, bedtime TIME (Phase 76); UNIQUE on user_id |
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
| `workout_session_overrides` | Today-only exercise swaps from check-in suggestions — user_id, date, original_exercise, override_exercise, reason, applied_at; RLS user-scoped |

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
| 24 | Settings-PIN brute force prevention | ✅ Built | `settings-pin/verify` and `settings-pin/remove` rate-limited (10/hr) — Phase Audit |
| 25 | Weekly-wrap rate limiting | ✅ Built | `life-hub/weekly-wrap` POST limited to 3/hr — was unrated — Phase Audit |
| 26 | Daily-brief all windows rate-limited | ✅ Built | afternoon + evening windows now have entries in LIMITS map (2/hr each) — Phase Audit |
| 27 | Recovery code regeneration rate limit | ✅ Built | `2fa/generate-recovery` rate-limited (3/hr) — Phase Audit |
| 28 | Chat history injection — exercise-chat + checkin/chat | ✅ Built | Both now apply role whitelist + 20-msg slice + 2000-char cap matching chat/route.js — Phase Audit |
| 29 | Atomic rate limiting — TOCTOU fix | ✅ Built | `checkin/insight` + `coaching-response` converted to increment-first atomic pattern — Phase Audit |
| 30 | Prompt injection — exercises_completed | ✅ Built | `exercises_completed` in coaching-response wrapped in user_input tags with per-item cap — Phase Audit |
| 31 | Prompt injection — todays_exercises | ✅ Built | `todays_exercises` in checkin/insight + checkin/chat wrapped in user_input tags — Phase Audit |
| 32 | Lab input length caps | ✅ Built | `lab-doc-feedback` + `lab-summary`: stepTitle/stepContent/documentPrompts/labTitle/labDescription all capped — Phase Audit |
| 33 | generate-questions count cap | ✅ Built | `count` validated 1–150; prevented potential infinite loop — Phase Audit |
| 34 | workout_log_sets delete IDOR guard | ✅ Built | Added `.eq('user_id', user.id)` to sets delete in workouts/log — Phase Audit |
| 35 | owner/admin/clear-pin self-target guard | ✅ Built | Owner can no longer clear own PIN via admin endpoint — Phase Audit |
| 36 | Search query length cap | ✅ Built | Nutrition search `q` param capped at 200 chars — Phase Audit |
| 37 | Push endpoint URL validation | ✅ Built | Endpoint must be https:// URL ≤ 2048 chars — Phase Audit |
| 38 | generate-flashcards session.user.id crash fix | ✅ Built | Was `session.user.id` (undefined) — fixed to `user.id` — Phase Audit |

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

#### Phase G — Item 18 + Feature B: Real-Time Check-In Intelligence ✅ Built (Phase 76)

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

#### Phase H — Feature D + Feature E: Workout Suggestions + Keep Talking ✅ Built (Phase 77)

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

#### Phase I — Item 20: Stretch System Overhaul ✅ Built (Phase 78)

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

#### Phase J — Item 21: Micronutrient Daily Awareness ✅ Built (Phase 79)

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

#### Phase K — Item 22: Teaching Philosophy / ℹ️ Touchpoints ✅ Built (Phase 80)

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

---

#### Phase O — Evening Brief + daily_briefs Migration 📋

**Why before Phase M:** Phase M-B wires push sends into brief generators. Evening brief must exist first. The `daily_briefs` table migration must happen before anything reads the `window` column.

**DB migration (breaking — do carefully):**
```sql
-- Step 1: add column with default (safe — no constraint yet)
ALTER TABLE daily_briefs ADD COLUMN window TEXT DEFAULT 'morning';
-- Step 2: backfill all existing rows
UPDATE daily_briefs SET window = 'morning';
-- Step 3: drop old unique constraint
ALTER TABLE daily_briefs DROP CONSTRAINT daily_briefs_user_id_date_key;
-- Step 4: add new unique constraint
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_user_id_date_window_key UNIQUE (user_id, date, window);
-- Step 5: add check constraint
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_window_check CHECK (window IN ('morning', 'afternoon', 'evening'));
```
Do all 5 steps in one migration — if you split them, step 4 could fail if step 2 didn't run.

**What to build:**
1. **`daily-brief/route.js` changes:**
   - GET: add `?window=` param (default `'morning'`), include it in the `.eq('window', window)` query
   - POST: accept `window` in request body (default `'morning'`), include in upsert with new `onConflict: 'user_id,date,window'`
   - All existing morning logic stays identical — just add the `window` field throughout
2. **Evening brief content** (new POST with `window: 'evening'`):
   - Queries: today's full food log totals, today's workout (if done), today's steps + water, today's check-in mood/energy, today's stretch log, today's sleep context if available
   - Tone: retrospective — "here's how today actually went, one thing for tomorrow"
   - System prompt differs from morning: past-tense framing, forward-looking close ("tomorrow, focus on X")
   - Max tokens: 200 (slightly shorter than morning — bedtime, keep it concise)
3. **Afternoon brief:** don't rebuild — the existing `checkin/insight/route.js` already generates a 2-sentence insight on check-in. Just add a step to upsert that text into `daily_briefs` with `window: 'afternoon'` after generating. No new AI call.
4. **`life-hub/page.js`** — Morning brief fetch adds `?window=morning` param
5. **Life Hub page: Evening brief display** — add a second brief card below the morning one for evening window. Only shows after ~6pm (client-side time check). If no evening brief yet, show "Evening summary generates at 9pm" placeholder.

**Watch out for:**
1. **Constraint name matters** — the old constraint `daily_briefs_user_id_date_key` must match exactly. If it was named differently at table creation, the DROP will fail. Check `\d daily_briefs` first or use `IF EXISTS`.
2. **GET route must default to morning** — all existing callers pass no window param. They must keep getting the morning brief without changes.
3. **Rate limiting** — evening brief is a new AI call. Add it to the rate limit key: `'life-hub/daily-brief-evening'`, cap at 1/day.
4. **Evening brief data is today not yesterday** — morning brief looks at yesterday's food/workout. Evening brief looks at TODAY's data. Query `date = today` not `date = yesterday`.
5. **`is_disabled` check** — same pattern as morning brief, must be present.

---

#### Phase L — Weekly Wrap Page 📋

**Why now:** Fully specced, independent. Build before Phase M so M-B can wire the push send into it.

**What to build:**
1. DB: `weekly_wraps` table — `user_id`, `week_start DATE` (always Monday), `report_data JSONB`, `ai_narrative TEXT`, `created_at`; UNIQUE on `(user_id, week_start)`; RLS user-scoped.
2. `GET /api/life-hub/weekly-wrap` — no param → returns list of all `week_start` dates for sidebar. `?week=YYYY-MM-DD` → returns single wrap.
3. `POST /api/life-hub/weekly-wrap` — body: `{ week: 'YYYY-MM-DD' }`. Validates week is a Monday and is in the past (not current week — 400 if so). Gathers 7 days of data from 8 tables. Calls Sonnet. Caches forever (never regenerates same week). Claude prompt **must** include "Next Week" section as final required paragraph.
4. `/life-hub/weekly-wrap/page.js` — week picker (← → chips), stat grid (workouts/avg energy/avg mood/avg calories/avg water/weight delta), AI narrative card with "Next Week" section highlighted, history sidebar of past weeks.
5. `LifeHubSidebar.js` — add "Weekly Wrap" under Overview group alongside "Monthly Wrap".

**Watch out for:**
1. **Week start = Monday always.** Helper: `const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().split('T')[0]`
2. **Block current week** — API returns 400, UI hides Generate button, shows "Week in progress — check back [next Monday's date]".
3. **"Next Week" section is required** — add to system prompt: "Your response MUST end with a paragraph starting with 'Next week:' containing exactly one actionable observation tied to this week's data patterns."
4. **pg_cron auto-generation (Sunday night)** — that's Phase M's job. For now, manual Generate button only.

---

#### Phase M — Push Notifications + Three-Brief System 📋

**Build order within M: M-A → M-B → M-C**

##### M-A: Infrastructure

1. **VAPID keys** — generate ONCE locally: `npx web-push generate-vapid-keys`. Store both in password manager. Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Vercel env vars AND Supabase Edge Function secrets. Never regenerate — changing keys invalidates all subscriptions.

2. **DB migrations:**
```sql
-- push_subscriptions
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON push_subscriptions USING (user_id = auth.uid());

-- push_notification_log
CREATE TABLE push_notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT true
);
ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON push_notification_log USING (user_id = auth.uid());
```

3. **`public/sw.js`** — check if file exists. If it does, APPEND push handlers (don't replace). If not, create. Add:
```js
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(self.registration.showNotification(data.title ?? 'Life Hub', {
    body: data.body ?? '', icon: '/icon-192.png',
    data: { url: data.url ?? '/life-hub' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

4. **API routes:**
   - `POST /api/push/subscribe` — saves PushSubscription to `push_subscriptions`; upsert on `(user_id, endpoint)`
   - `DELETE /api/push/subscribe` — removes by endpoint

5. **Settings UI** — "🔔 Notifications" section with toggle. On enable: `Notification.requestPermission()` → on 'granted': `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })` → POST to `/api/push/subscribe`. On disable: DELETE. Show current permission state.

6. **`src/lib/webPush.js`** — shared sender utility for Next.js routes:
```js
import webpush from 'web-push'
webpush.setVapidDetails('mailto:...', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
export async function sendPush(subscription, payload) { ... }
```
For Edge Functions (Deno), use `https://esm.sh/web-push`.

**Watch out for M-A:**
- `applicationServerKey` must be `Uint8Array` (base64url decoded) not a plain string. Client needs `urlBase64ToUint8Array()` helper.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is the ONLY key that goes in `NEXT_PUBLIC_` env — the private key must NEVER be public.
- Handle `410 Gone` from push service — subscription expired, delete the row.
- iOS Safari: only works if installed as PWA (Add to Home Screen). Regular Safari visits can't receive push. Document this clearly in the Settings UI.
- Multiple devices: one user → multiple subscription rows (one per browser/device). Loop all when sending.

##### M-B: Wire Push into Brief/Wrap Generators

After each generator caches its result, add a push send step:
- Morning brief pg_cron Edge Function → "☀️ Your morning brief is ready"
- Evening brief pg_cron Edge Function → "🌙 Your evening summary is ready"
- Afternoon check-in insight route → "🌤️ Your afternoon insight is ready" (only send if user is NOT currently in the app — check `last_seen_at` or skip entirely since they triggered it themselves)
- Weekly Wrap pg_cron → "📊 Your weekly wrap is ready"
- Monthly Wrap pg_cron → "📅 Your monthly wrap is ready"

For the morning/evening Edge Functions: query `push_subscriptions` for the user, send via web-push, log to `push_notification_log`.

##### M-C: Nudge Edge Function

New Edge Function: `background-nudge-check/index.ts`

Three pg_cron entries (UTC times for EST targets):
- `0 19 * * *` (2pm EST) — food nudge: if `food_log_entries` count for today = 0, send "🍽️ Haven't logged food yet today"
- `0 1 * * *` (8pm EST) — check-in nudge: if no `daily_checkins` row for today, send "How's your energy today? Tap to check in"
- `0 2 * * *` (9pm EST) — water nudge: if today's water_logs sum < 50% of `water_goal_oz`, send "💧 You're at X oz — try to hit your goal before bed"

Before each send: query `push_notification_log WHERE user_id = X AND type LIKE 'nudge_%' AND sent_at > today midnight` — if count >= 2, skip. Max 2 nudges/day.

**Watch out for M-C:**
- pg_cron runs UTC — be precise with cron expressions. EST = UTC-5 (winter) or UTC-4 (summer/DST). Using fixed UTC times means nudges shift by 1 hour during DST transitions. Acceptable for now.
- The 2/day cap means water nudge (last to run) gets suppressed if food + check-in both fired. That's correct behavior.
- Query `water_goal_oz` from `goals_profiles` — if null, default to 64 oz.

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


**Photo-Based Food Logging** — ✅ Built (Phase Z)

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

### 💧 Hydration

**Food Water Content in Hydration Tab** — 💬 Discussed

The Hydration page (`water/page.js`) currently only counts explicit water logs and drink entries from `food_log_entries` (meal_slot='drink'). It does not surface the passive water content in solid foods (e.g. fruits, vegetables, oatmeal, soups — all of which have `water_g` values in `food_log_entries`).

The Life Hub dashboard home and the Weekly/Monthly Wrap already include this via `f.water_g * 0.0338` (g → oz conversion). The Hydration page should match.

**What to add:**
- Query all non-drink `food_log_entries` for the day where `water_g > 0`
- Convert to oz and add to the hydration ring total as a third segment (distinct color from water-blue and beverage-purple — use a light green or teal)
- Show a "from food" line in the breakdown: `Water from food: 8 oz (cucumbers, oatmeal, apple)`
- Keep this visually secondary — passive food water is a "bonus" category, not a primary hydration source. The ring should show it but the goal progress bar should only count explicit water + drinks (that's what users control and intend)
- The 7-day bar chart should also include food water in the stacked totals for completeness

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

**22. Workout Day Hub — Full Architecture** — ✅ Built (Phase R)

**The architectural shift:** The Day Hub collapses four current pages (plan day expand, standalone stretching page, workout logger entry, coaching completion screen) into one coherent owner for the full training day. It is the single entry point for starting any workout or stretch session. The standalone Stretching & Mobility page (`/life-hub/workouts/stretching`) is retired — that flow lives exclusively inside the Day Hub. The Stretch Library stays but becomes reference documentation under the Workouts section, not a flow destination.

---

**Part A — Dates on the Workout Plan Page (prerequisite, quick win):**

Each day card on `/life-hub/workouts` shows the actual calendar date next to the day name. Compute the Monday of the current week (same `getMonday()` logic already in weekly-wrap route), then offset by day index (0–6).
- Display as subtitle under day name: `Monday · Jul 7` or `Wednesday · Jul 9`
- Rest days and active days both get dates
- Tapping any day card (including rest days) navigates to the Day Hub for that day — inline expand removed entirely

---

**Part B — Day Hub Page (`/life-hub/workouts/day/[dayOfWeek]`):**

The Day Hub is the same page in two modes: **active** (current week) and **read-only** (past weeks/days). URL param is day of week (0=Mon…6=Sun); the page derives the actual date from that + the current week's Monday. For historical access, add optional `?date=YYYY-MM-DD` param so history can link directly to any past Day Hub.

**Header:**
- Day name + actual date (e.g. "Wednesday · July 9")
- Muscle group / day label (e.g. "Pull Day" or "Rest Day")
- Phase progress dots: four small circles color-coded by completion status — visible at a glance without scrolling

**Phase 1 — Pre-Workout Stretches (dynamic stretches):**
- 3–5 dynamic stretches auto-selected by `getRecommendedStretches()` for today's muscle group
- Each card: stretch name, duration, and a *one-sentence context note* explaining why it matters for today's specific muscle group (e.g. "Your lats are trained today — opening the thoracic spine now improves overhead pull range and reduces impingement risk")
- Tap card to expand: full instructions + "Why?" text (same content as stretch library)
- "Start Pre-Workout Stretches →" button: navigates to stretching page with `session_type=pre_workout` and today's muscle group pre-selected — no configuration needed on that page
- Phase status: ✅ Done when a `stretch_logs` entry with `session_type='pre_workout'` exists for today

**Phase 2 — Today's Workout:**
- Exercise list matching today's plan (same data as current expanded day view — exercise name, sets × reps, rep range)
- Each exercise has a collapsible "Why this today?" section: 2 sentences — what the exercise trains + why it belongs in this week's split (e.g. "Barbell rows hit mid-back thickness. On pull days these are your primary horizontal pull — they build the strength base your curls and pulldowns sit on top of.")
- Previous session hints shown inline per exercise ("Last time: 3 × 185lbs") — currently only shown in the workout logger, surfacing them here helps you plan load before you start
- "Start Workout →" button: navigates to `/life-hub/workouts/log` with today's day pre-selected — logger skips the day-selection step
- Phase status: ✅ Done when a `workout_logs` entry exists for today
- When done: small excerpt of AI coaching response shown with "Read full feedback ↓" chevron

**Phase 3 — Post-Workout Stretches (static stretches):**
- 3–5 static stretches for today's trained muscle group
- Subtitle: "Best done within 30 minutes of finishing — muscles are warm and pliable"
- Same card format as Phase 1 with context notes (e.g. "Lat stretch — holds this muscle at its longest to prevent the chronic shortening that limits your range on next pull day")
- "Start Post-Workout Stretches →" button: same flow, `session_type=post_workout`
- Phase status: ✅ Done when a `stretch_logs` entry with `session_type='post_workout'` exists for today

**Phase 4 — Bedtime Stretches:**
- 4–5 full-body static stretches focused on parasympathetic activation (not muscle-group-specific — always the same regardless of training day)
- Subtitle: "10–15 minutes before sleep — activates your rest-and-digest system, lowers cortisol and resting HR"
- If user has sleep data: show their avg sleep score on nights with vs without bedtime stretching if coach_memory has tracked this correlation
- "Start Bedtime Stretches →" button: `session_type=standalone` with bedtime-appropriate stretch set pre-selected
- Phase status: ✅ Done when a `stretch_logs` entry with `session_type='standalone'` and `logged_at` after 8pm exists for today (rough heuristic)

**AI Coaching Review (collapsible panel, shown after workout phase complete):**
- Triggered by: `workout_logs` entry exists for today AND `ai_coaching_response` is populated
- Header: workout stats row (duration, sets completed, HR zones if available)
- Body: full `ai_coaching_response` text
- If response not yet generated (still async): show "Coaching feedback generating..." spinner — poll once per 3 seconds for up to 15 seconds, then show "Check back in a few minutes" if still pending
- User can collapse this panel; it re-opens on next visit if they haven't read it
- `coaching_feedback_read_at` timestamp in `workout_logs` — set when user opens the panel in expanded state (useful for future notification logic)

**Rest Day Hub:**
Rest days get a Day Hub too, just with different content:
- Recovery note based on recent training load (e.g. "You trained 3 days in a row — today's rest is structural, not optional")
- Light movement recommendation: a short walk, foam rolling note, or mobility suggestion based on body parts trained yesterday
- Bedtime stretches section (same Phase 4 as active days)
- No workout phase, no pre/post stretches

---

**Phase completion tracking:**
- Status computed at page load from existing DB data — no new tables needed
- `stretch_logs`: `session_type` + `date` + `logged_at` (for bedtime heuristic)
- `workout_logs`: `created_at` matching today
- Each phase shows: ⬜ Not started · 🔄 Started (stretch log for session exists but may be incomplete) · ✅ Done
- Phases are completely independent — user can do pre-workout at 6am, leave, do workout at 7pm, come back at 10pm for bedtime stretches. State persists between visits because it's all in the DB.

**Phase progress dots on plan page:**
Small colored indicator dots under each day's title on the plan page — visible without opening the Day Hub:
- 🟣 Pre-stretch done
- 🔵 Workout done
- 🟢 Post-stretch done
- ⚪ Bedtime stretches done
These give a glanceable completion picture across the whole week without navigating into each day.

---

**Part C — Sidebar Restructure:**

Current Workouts dropdown (5 items): My Plan · Workout History · Exercise Library · Stretching & Mobility · Stretch Library

Proposed (4 items):
- **My Plan** — week view, day cards tap to Day Hub
- **History** — unified week-grouped history (see Part D)
- **Exercise Library** — reference, unchanged
- **Stretch Reference** — the current Stretch Library renamed and reframed as documentation (the "Stretching & Mobility" active page is retired)

The standalone `/life-hub/workouts/stretching` page is retired. All stretch session initiation flows through Day Hub phase buttons. The Stretch Library at `/life-hub/workouts/stretching/library` becomes "Stretch Reference" at a cleaner URL like `/life-hub/workouts/stretches`.

---

**Part D — Unified History (Workout + Stretch merged):**

Current history page: flat list of `workout_logs` ordered by date.

Proposed: week-grouped view where workouts and stretch sessions appear together under the week they happened, all accessible via the read-only Day Hub.

*Week group header:*
"Week of Jul 7 — 3 workouts · 8 stretch sessions · 4h 40m total"
→ Tap to expand/collapse

*Within each week group — Day cards instead of session cards:*
Each day that had any activity (workout OR stretch session) shows as a compact card:
- Day + date (e.g. "Wednesday · Jul 9")
- Day label (Pull Day / Rest Day)
- Phase completion dots (same 4-dot indicator from plan page)
- If workout: duration + HR zone summary chip
- 1-line excerpt of AI coaching response (80 chars, truncated)
- "📊 View Weekly Wrap →" link shown at week group level if a wrap exists for that week

Tapping a day card opens the **read-only Day Hub** for that date — the exact same page component in read-only mode:
- Shows what was planned vs what was actually completed
- All stretch sessions shown with timestamps
- Full AI coaching response
- Previous session data for each exercise (same data as "prev session hints" in the logger)

This means there is only ONE page design for viewing a day's training — the Day Hub — whether you're looking at today, yesterday, or a session from 6 weeks ago. No separate "history detail" page to build or maintain.

---

**Part E — Weekly Completion Tracking:**

No streak for workouts currently. Add a weekly completion picture visible on both the plan page (top of page, current week) and the history page (per week group):

`Phases completed this week: 7 / 16` — broken down as:
- Pre-workout: 2/4 planned workout days
- Workouts: 3/4 planned workout days
- Post-workout: 1/4 planned workout days
- Bedtime: 3/7 nights

This data feeds coach_memory (Edge Function can see phase completion patterns over time) and the Daily Brief (can note "you've completed 3 of 4 planned workouts but only 1 post-workout stretch session — post-stretch is where today's plan has the biggest gap").

---

**Part F — Coaching Feedback Notification:**

Current problem: AI coaching response is generated async (up to 8s) after workout finish. User typically leaves the completion screen before it's ready and never reads it.

Fix: when the user opens the Day Hub for a day that has a `workout_logs` entry but `coaching_feedback_read_at` is null, show a badge on the AI Coaching Review panel header: "💬 New feedback". The panel auto-expands on first visit if unread. This naturally pulls the user back to read it without requiring push notifications for this specific case.

---

**"Why this today?" generation strategy — decided:**
Generate at workout plan creation time, not on-demand. When `generate-plan/route.js` calls Claude, the prompt asks for context notes per exercise alongside the sets/reps, stored in the plan JSONB as `context_note` on each exercise object. This is free (same generation call), instantly available in the Day Hub with no extra API call, and can reference the specific split structure ("Romanian deadlifts are on pull day because they share the same hip-hinge motor pattern as your rows — training them together builds that posterior chain as a unit"). Older plans without `context_note` fields show nothing in that slot — no fallback needed, just empty. Users naturally regenerate plans when they change goals or equipment.

**Bedtime phase completion — decided:**
Do not use a time-of-day heuristic ("logged_at after 8pm"). Instead, add a `context` TEXT field to `stretch_logs` (e.g. `'bedtime'`, `'pre_workout'`, `'post_workout'`, `'standalone'`). The "Start Bedtime Stretches" button on the Day Hub passes `context=bedtime` when navigating to the stretch flow, and the stretch flow sets it on the log row. Then completion detection is exact: `stretch_logs` entry with `context='bedtime'` for today = Phase 4 done. This requires a DB migration (add `context` column to `stretch_logs`) and updating the stretch log POST route and flow entry points.

**PRs move to Exercise Library — decided:**
The PR section currently on the history page (heaviest working set per exercise ever) moves to the Exercise Library as a per-exercise detail. When a user taps an exercise card in the library, the detail modal shows a "Your PR" section: heaviest working set ever + date it was set. This is a better UX — you look up an exercise, you immediately see your history with it. The history page doesn't need a flat PR list once this is in place; the week-grouped Day Hub view is richer context anyway.
- Requires: `workout_log_sets` query filtered to `set_type='working'`, grouped by `exercise_name`, returning `MAX(weight_lbs)` + the date of that set
- No new DB columns needed — all data is in `workout_log_sets` already

**Build order:**
1. Add `context` column to `stretch_logs` (DB migration) + update POST route
2. Add dates to plan page + remove inline expand (day card taps navigate to Day Hub URL)
3. Build Day Hub page — active mode, phases with static content (no "Why this?" AI yet, just layout + completion indicators using new `context` field)
4. Wire all "Start X" buttons to existing stretch/workout flows with pre-selection params + context values
5. Update `generate-plan/route.js` prompt to include `context_note` per exercise; surface in Day Hub Phase 2 cards
6. Add AI coaching review panel + unread badge (add `coaching_feedback_read_at` column to `workout_logs`)
7. Build rest day Day Hub variant
8. Revamp history page to week-grouped Day cards with read-only Day Hub links; remove flat PR section
9. Move PRs to Exercise Library detail modal (query workout_log_sets for max working set per exercise)
10. Retire standalone stretching page, rename Stretch Library to Stretch Reference, update sidebar
11. Add weekly completion tracking bar to plan page and history week groups

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

### 📅 Weekly Wrap — ✅ Built (Phase L)

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

---

### 📱 Health Sync & Wearable Parity Plan 💬 Discussed

**Session context (2026-07-09):** Discussed closing the gap between our health tracking and what Google Health / Bevel do natively. The fundamental constraint is that we use the Google Health REST API (server-to-server), not native Health Connect (Android OS) or HealthKit (iOS). This means we can never fully match real-time reads, but we can get very close on freshness and we can surpass them on insight depth since we have nutrition, workouts, sleep, and study data together in one place.

**The seven gaps and fixes, in priority order:**

---

**Gap 1 — Resting HR and HRV always show dashes (BROKEN, fix first)**
- Root cause: the field names we guess at in `sync/route.js` and `background-health-sync/index.ts` when parsing Google's API response for `daily-resting-heart-rate` and `daily-heart-rate-variability` data types have never matched the actual response structure
- Debug output `_debugRestingHR` and `_debugHRV` was added to the POST `/api/health/sync` response — need user to hit Refresh on Health page, open network tab, find the POST response, and share the raw `_debugRestingHR` and `_debugHRV` fields
- Once actual field names are confirmed, fix the parsing in both `src/app/api/health/sync/route.js` AND `supabase/functions/background-health-sync/index.ts` in the same commit (they must stay in sync)
- Status: ⏳ Blocked on user sharing debug response

---

**Gap 2 — Steps overwrite bug (causes count regression)**
- Root cause: `health_steps_hourly` upsert uses `onConflict: 'user_id,date,hour'` which blindly replaces existing step counts with whatever the current sync returns. If a sync has partial data for an hour (e.g., Edge Function's 3-hour lookback catches a partially-complete hour, or pagination cuts off early), the lower incoming value overwrites the correct higher value already in the DB.
- Real example: User had ~12k steps correctly stored. Background sync ran with a 3-hour window and returned partial data for some hours. Upsert replaced good values with lower ones. Total dropped to 8,761.
- Fix: Replace the upsert logic with a Postgres function `upsert_steps_hourly(user_id, date, hour, steps)` that uses `INSERT ... ON CONFLICT DO UPDATE SET steps = GREATEST(EXCLUDED.steps, health_steps_hourly.steps)` — always keeps the higher value
- Must fix in both `src/app/api/health/sync/route.js` AND `supabase/functions/background-health-sync/index.ts`
- DB migration needed: create the `upsert_steps_hourly` RPC function
- Status: ✅ Built — migration `upsert_steps_hourly_greatest` applied; both sync routes now use RPC with GREATEST

---

**Gap 3 — Sync lag (2 hours background, 15 min on health page open)**
- Already improved this session: health pages now force sync on open (2-min cooldown), hub page fires background sync before user reaches Life Hub
- Remaining gap: background cron still runs every 2 hours. Changing to every 15 min is free (2,880 invocations/month vs 500k free tier limit) and would mean data is never more than 15 min stale even without opening the app
- Fix: update pg_cron schedule from `0 */2 * * *` to `*/15 * * * *`
- Status: 💬 Discussed, not yet built

---

**Gap 4 — "Last synced X min ago" transparency indicator**
- Health pages currently show a small "Last synced HH:MM" timestamp but it's easy to miss
- Better: a subtle chip on each health card reading "Synced 4 min ago" or "Synced 23 min ago" in green/yellow/red based on staleness (< 5min = green, 5–30min = yellow, > 30min = red)
- This makes staleness feel intentional rather than broken — users know what they're looking at
- Status: 💬 Discussed

---

**Gap 5 — Depth: 7-day and 30-day trends (currently only show today)**
- We already have weeks of data in `health_heart_rate_daily` and `health_sleep_sessions` — we just don't show it
- What to add:
  - HR page: 30-day resting HR trend line (already partially there — extend to 30 days, add annotation for 7-day avg)
  - Sleep page: 14-day sleep duration bar chart + bedtime consistency scatter (how variable your sleep/wake times are — Bevel charges for this)
  - Steps page: 30-day daily total bars alongside the existing 7-day view
- Status: 💬 Discussed

---

**Gap 6 — Sleep consistency score**
- Bevel's most-talked-about feature: measures how consistent your bedtime and wake time are over 14 days, separate from sleep duration or quality
- Formula: take stddev of bedtime minutes and stddev of wake minutes across 14 days; low stddev = high consistency score
- Display as a 0–100 score alongside Sleep Score on the Sleep page, with a "what this means" InfoChip
- Data source: `health_sleep_sessions.start_time` and `end_time` — we already have this
- No new table needed, computed on the fly
- Status: 💬 Discussed

---

**Gap 7 — Weekly AI health insight (where we beat both apps)**
- Neither Google Health nor Bevel connects your health metrics to your nutrition, workouts, and life context. We can.
- Once or twice a week, Claude looks at: HRV trend (improving/declining), sleep quality trend, workout load (sets × reps volume), calorie vs target consistency, hydration, and stress signals (check-in energy scores) and returns a 3-sentence "what your body is telling you this week" paragraph
- Displayed as a card on the Health Overview page — similar to the Daily Brief card but health-specific and weekly-refreshing
- Rate limited: 2/week. Cached in a new `health_insights` table (user_id, week_start, insight_text, generated_at)
- This is our genuine differentiator — no standalone health app has your food logs, supplement stack, workout sets, and study schedule to cross-reference
- Status: 💬 Discussed

---

**Native app consideration (discussed same session):**
- Converting to a native app (Expo/React Native) would close all sync gaps permanently via Health Connect/HealthKit direct reads
- Cost delta vs current: only new cost is Apple Developer Program ($99/yr) + optional Expo EAS ($29/mo). Backend (Supabase + Anthropic) unchanged
- Security changes: XSS eliminated (no DOM), but new risks: app binary reverse engineering, deep link hijacking (use expo-secure-store + proper scheme handling), unencrypted AsyncStorage (use expo-secure-store for tokens)
- Build effort estimate: 4–8 weeks — backend is done, it's purely UI port + native bridge work
- Decision: not now, but the architecture already supports it cleanly when ready

---

**Build order for the health parity plan:**
1. Fix resting HR/HRV field names (blocked on debug data from user) 
2. ✅ Fix steps overwrite bug (GREATEST upsert via RPC)
3. Drop background cron to 15 min
4. Add staleness chips to health cards
5. Add 30-day trend views
6. Add sleep consistency score
7. Add weekly AI health insight

---

### 🎨 UI/UX Overhaul — Full Audit (2026-07-09)

Full top-to-bottom audit comparing against Apple Health, Google Health, Fitbit, and Bevel. Every item below is a confirmed finding. Items are grouped by area and ranked within each group by impact. Status tags apply to each item independently.

---

#### Life Hub Landing — Restructure (HIGH PRIORITY)

**Problem:** The Life Hub home has 6 distinct stacked zones before the user reaches anything interactive. Current order: status pills → 3 Daily Brief cards → Recovery Score → 2×2 section cards → Check-in. The check-in — the most interactive element, the thing that feeds all other data — is buried at the bottom after ~800px of content. The Recovery Score, arguably the most valuable number we generate, is a collapsed card buried after three brief cards.

Every competitor anchors their home to one visual hero: Apple = activity rings, Fitbit = ring + calorie ring, Google = three big data cards, Bevel = recovery score ring. You see the most important thing within 2 seconds. We make you scroll to find anything interactive.

**Duplication issue:** The status pills (top) and the 2×2 section cards (middle) show the same four data points — calories, workout, steps/health, water/weight — twice before the user reaches the check-in.

**Proposed new order:**
```
1. Recovery Score RING — hero, full-width, centered, colored by score
   Three component chips below it: Sleep / Hydration / Protein (the top 3 by weight)
   "Expand breakdown" link opens the current detailed view

2. Check-in (energy + mood) — immediately below the ring
   These belong together: the ring is the output, the check-in is the input.
   Compact form: two rating rows + optional note + Save button, no heatmap visible yet

3. Today's Quick Stats — one slim row: Calories · Steps · Water · Workout
   Each is a tappable chip linking to the relevant sub-page
   Replaces BOTH the current status pills and the 2×2 section cards

4. Daily Brief — ONE card with three tabs (☀️ Morning / 🌤️ Afternoon / 🌙 Evening)
   Active window tab highlighted, inactive tabs visible but muted
   Content loads in place when tab is tapped — no separate cards, no stacked headers
   Collapsed by default (shows first 2 lines), expand to read full

5. 28-Day Heatmap — below the brief, collapsible
   Shows check-in history at a glance

6. Section nav cards — at the very bottom, for navigation only
   Simplified: just label + section color + arrow, no duplicate data
```

This mirrors the Bevel mental model: *here's your score* → *here's the input that affects it* → *here's the rest of your day*.

**Status: 📋 Fully Specced**

---

#### Recovery Score — Visual Redesign (HIGH PRIORITY)

**Problem:** The current presentation is a 42px number left-aligned, mini 28px bar charts right-aligned, everything in one cramped row. The collapsed state doesn't communicate the importance of the score. Users who never expand it are missing the most valuable output the app generates.

**Bevel comparison:** Full-width colored ring with score centered inside. Single sentence label below ("Well Recovered / Low Recovery"). Component chips in a row below that. The ring IS the visual anchor of their entire home screen.

**Proposed redesign:**
- SVG circle progress ring, full-width card (~200px diameter)
- Score number centered inside ring (56px, bold), colored by health tier
- Tier label below score inside ring ("Well Recovered")
- Four component chips in a 2×2 grid below the ring: Sleep (X/25) · Hydration (X/20) · Protein (X/20) · Energy (X/15)
- HRV and Stretching chips appear below if data exists
- Each chip: icon + label + pts + small progress bar
- "What's driving this?" expand button at bottom → opens the current detailed breakdown (that content is already excellent, just hidden)
- The collapsed state (ring + chips) replaces the current cramped number+bars header
- Card color: ring stroke color bleeds into card background at 5% opacity, making the entire card feel colored by your health status

**Status: 📋 Fully Specced**

---

#### Daily Brief — Tab-Based Single Card (HIGH PRIORITY)

**Problem:** Three separate collapsible cards (Morning, Afternoon, Evening) are always visible simultaneously as card headers. This means three stacked card header rows before the user sees a data point. The morning card is always present even when empty (shows placeholder text). When all three have content, there are three "Read more" chevrons before anything else on the page.

**Fix:** One card. Three tabs at the top of the card: `☀️ Morning` | `🌤️ Afternoon` | `🌙 Evening`. Active tab is highlighted with the brief's color (purple/yellow/indigo). Inactive tabs that have content show a green dot. Tapping a tab swaps the content in place.

- Morning tab always visible and active by default (existing behavior)
- Afternoon tab shown grayed if no check-in done yet; tapping shows "Complete a check-in to generate your afternoon insight"
- Evening tab shown grayed before 6pm; after 6pm shows "Generating..." state then content
- If a tab has no content and isn't the current window, it's dimmed but still tappable
- Card is collapsed by default — shows first 2 lines of text + "Read more"
- One card, one design, no stacked headers

**Status: 📋 Fully Specced**

---

#### Mobile Bottom Tab Bar (HIGH PRIORITY)

**Problem:** On mobile, the sidebar is a slide-out from a hamburger button fixed at top-left. The top-left corner is the hardest-to-reach part of a phone screen for right-handed users. Every major health app (Apple Health, Google Health, Fitbit, Bevel) uses a bottom tab bar on mobile because thumbs reach the bottom, not the top-left.

Additionally: the Life Hub sidebar currently has ALL navigation nested inside dropdowns. On mobile, opening the hamburger, finding the right dropdown, tapping it open, then tapping a link is 4 interactions. A bottom tab bar + drill-down is always 2: tap section → tap sub-page.

**Proposed bottom tab bar (mobile only, ≤768px):**
```
[ Overview ] [ Health ] [ Nutrition ] [ Workouts ] [ Goals ]
```
- 5 tabs, each with section color when active, `var(--text-secondary)` when inactive
- Icon above label (use simple emoji or SVG)
- Active tab has color fill underline or pill
- Tapping a tab navigates to the section root page
- Sub-pages still exist via links within each section
- Desktop keeps the current sidebar — this is mobile-only
- The hamburger button is removed on mobile entirely

**Files affected:** `src/components/LifeHubSidebar.js` (new MobileBottomNav component), `src/app/life-hub/layout.js` (conditionally render bottom nav instead of sidebar on mobile)

**Status: 📋 Fully Specced**

---

#### Sidebar Bottom Scroll Bug (CONFIRMED USER-REPORTED BUG)

**Problem:** On both Study Hub and Life Hub sidebars, items near the bottom (Settings link, account avatar) are cut off and can't be clicked. The sidebar hits the bottom of the viewport and the user can't scroll it further.

**Root cause:** The sidebar `aside` has `min-height: 100vh` and `overflowY: auto`. On short screens (or when the browser's address bar is expanded on mobile), `100vh` is taller than the visible area, causing the bottom items to render below the visible fold. The `auto` overflow means the sidebar should scroll — but on mobile Safari and some Chrome configurations, the scroll container doesn't get focus and the user can't scroll it.

**Fix:**
- Change sidebar height from `min-height: 100vh` to `height: 100dvh` (dynamic viewport height — adjusts for mobile browser chrome automatically)
- Add `overflow-y: auto` and `-webkit-overflow-scrolling: touch` for iOS Safari
- Test at iPhone SE viewport (375×667) and with browser address bar visible

**Affects:** `src/components/LifeHubSidebar.js` and `src/components/StudyHubSidebar.js`

**Status: 📋 Fully Specced**

---

#### Study Hub Mobile — Everything Too Small (CONFIRMED USER-REPORTED BUG)

**Problem:** On mobile, the Study Hub pages (cert guide, test taking, study mode, etc.) render at desktop scale. Text is tiny, buttons are hard to tap, layouts don't reflow. Specifically:
- Test questions: question text wraps but answer choices become very narrow
- Cert Guide: 5-tab navigation doesn't fit on mobile; tabs wrap or overflow
- Domain Trend charts: SVG charts render at desktop width compressed into mobile screen
- Reference sheets: tables with 4+ columns become unreadable
- The floating reference panel and floating chat bubble compete with content on small screens

**What needs to happen:**
- All test-taking pages need a mobile-first pass: larger tap targets (min 44px height), question text at 15-16px minimum, answer options full-width with more padding
- Cert Guide tabs need to scroll horizontally on mobile (`overflow-x: auto`, `white-space: nowrap`)
- SVG charts (DomainTrend, ScoreChart) need `viewBox` + `width: 100%` responsive treatment
- Reference sheet tables need `overflow-x: auto` wrapper with horizontal scroll
- FloatingChat and FloatingReferencePanel need mobile-specific positioning (avoid overlapping content)
- Bottom padding on test pages to prevent fixed buttons overlapping last answer choice

**Status: 💬 Discussed, needs full mobile audit pass per page**

---

#### Study Hub Overview — Too Sparse (HIGH PRIORITY)

**Problem:** The Study Hub overview page shows only the `DailyStreak` component (a 30-question streak tracker and 28-day heatmap). That's it. There's no answer to "what should I study today?" — the user has to already know where to go.

Compare to Bevel's training home: your last session, your next recommended session, your current streak. Three things. You immediately know what to do.

**Proposed Study Hub overview page layout:**
```
1. Greeting + recommended action (dynamic)
   "Your CCNA domain 4 accuracy is 48% — weakest area. Practice it today?"
   [→ Practice Domain 4] button

2. Cert predicted scores — all 3 certs in one row
   CCNA: 74% | Net+: 68% | Sec+: —
   Progress bars colored by cert. Same data currently shown on hub picker page.

3. Daily Streak + heatmap (existing DailyStreak component, keep as-is)

4. Quick actions row
   [Take a Test] [Study Mode] [Review Wrong Answers] [Flashcards]
   Four buttons, 2×2 grid on mobile

5. Recent activity (last 3 test sessions)
   Score + cert + mode + date. Quick sense of momentum.
```

**Status: 📋 Fully Specced**

---

#### Breadcrumb Navigation on Sub-Pages (MEDIUM PRIORITY)

**Problem:** On sub-pages like `/life-hub/health/steps`, `/life-hub/workouts/history`, `/life-hub/nutrition/encyclopedia`, there is no breadcrumb or back link. The only way to navigate back to the section root is to open the sidebar and find the link. This adds 2-3 extra interactions for every back-navigation on mobile.

**Fix:** Add a breadcrumb row at the top of every sub-page, above the page H1. Format: `← Health Overview` or `Health / Step Tracker`. This is a 2-line change per page (import Link, add one div above the h1).

**Pattern:**
```jsx
<div style={{ marginBottom: '12px' }}>
  <Link href="/life-hub/health" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
    ← Health Overview
  </Link>
</div>
```

**Pages that need this:**
- `/life-hub/health/steps`, `/life-hub/health/heart-rate`, `/life-hub/health/sleep`
- `/life-hub/workouts/history`, `/life-hub/workouts/exercises`, `/life-hub/workouts/stretches`, `/life-hub/workouts/day/[dayIndex]`
- `/life-hub/nutrition/add-food`, `/life-hub/nutrition/log-manual`, `/life-hub/nutrition/encyclopedia`, `/life-hub/nutrition/meal-plan`
- `/life-hub/goals/measurements`, `/life-hub/goals/supplements`, `/life-hub/goals/setup`
- `/study-hub/ccna`, `/study-hub/network-plus`, `/study-hub/security-plus` (→ back to Study Hub)
- `/study-hub/labs/[setId]/[labId]` (→ back to lab set)

**Status: 📋 Fully Specced**

---

#### Check-In Rating Buttons — Mobile Tap Targets (MEDIUM PRIORITY)

**Problem:** The energy/mood rating row renders 5 buttons at `flex: 1` width. On mobile (375px wide) each button is ~62px wide with a sublabel inside at `font-size: 10px`. The sublabels ("Exhausted", "Energized") are unreadable and the tap targets are borderline — Apple's minimum recommended tap target is 44×44px.

**Fix:**
- Move the active sublabel ABOVE the rating row, not inside each button
- The label updates as the user taps (shows the label for the selected value)
- Each button becomes just a number with color background on select — no text inside
- On desktop this stays the same; on mobile the sublabel row disappears and the dynamic label above replaces it

**Pattern (mobile):**
```
Energy — [Energized ✓]   ← dynamic label updates on tap
[1] [2] [3] [4] [5]      ← larger, number-only buttons
```

**Status: 📋 Fully Specced**

---

#### Left-Border Card Pattern — Visual Monotony (MEDIUM PRIORITY)

**Problem:** Every single card in Life Hub uses `borderLeft: 3px solid ${color}`. Status pills, section cards, brief cards, recovery score, check-in card — identical pattern. When everything uses the same visual language, nothing stands out. The eye has no anchor.

**Bevel/Apple approach:** Differentiation through card TYPE:
- Hero cards: filled background tint, large typography
- Data cards: clean white/surface, no borders, subtle shadow
- Action cards: filled color button-like appearance
- Info cards: plain text panel, minimal border

**Proposed card hierarchy:**
- Recovery Score: filled ring card (hero — breaks the pattern entirely)
- Check-in: inset background (slightly different from surface), input-like feeling
- Daily Brief: plain text card, thin full border (not just left), feels like a document
- Status pills: keep left-border, these are navigation elements not data displays
- Section summary cards: remove, replaced by quick stats row

**Status: 💬 Discussed — can be implemented progressively per component**

---

#### Real Exam Crash — Test Generation (CONFIRMED USER-REPORTED BUG)

**Problem:** User attempted to generate a Real Exam for CCNA and it crashed during generation. Real Exam mode requires 120 questions (matches actual CCNA exam count). This is the same class of issue as the template batch crash — large question counts cause the Anthropic API response to truncate or time out before completing.

**Investigation needed:**
- Check `/api/generate-questions/route.js` — does it have a timeout?
- Real Exam generates questions in one API call or multiple? If one call, 120 questions is almost certainly too large for a single response
- Check if the crash is a timeout, a JSON parse error (truncated response), or a 504 from Vercel (10s default serverless timeout)
- The fix pattern from templates: break into batches of 5, use parallel calls, merge results

**Fix approach (after investigation):**
- For Real Exam mode, generate questions in parallel batches (e.g., 6 batches of 20)
- Each batch targets specific domains proportional to exam weight
- Merge + shuffle after all batches resolve
- If any batch fails, retry that batch before surfacing an error
- Add a loading state on the test page that shows progress: "Generating questions... (60/120)"

**Status: 💬 Discussed, needs investigation before spec**

---

#### Visual Hierarchy — Typography and Spacing (LOWER PRIORITY)

**Problem:** Our cards have `padding: 16-24px` with `gap: 10-14px` between cards — tightly packed. Bevel uses 32px+ gaps between sections. The breathing room is what makes their UI feel premium.

**Typography contrast gap:** Hero numbers should be significantly larger than secondary text. Current biggest type is Recovery Score at 42px but it's surrounded by 11-20px text — the contrast ratio isn't dramatic enough. Apple/Bevel use 56-72px for hero numbers.

**Specific fixes:**
- Section gaps on Life Hub landing: increase from `marginBottom: 20px` to `marginBottom: 32px`
- Recovery Score number in ring: 56px
- Section card hero text: increase from 22px to 28px
- Status pill values: increase from 20px to 24px
- Increase sidebar link padding from `7px 12px` to `9px 12px` for better tap targets

**Status: 💬 Discussed — low-risk, can apply during any other page touch**

---

#### Things We Do Better Than All Four Competitors (Keep These)

These are genuine differentiators — don't lose them in any redesign:

1. **AI coaching context depth** — Daily Brief reads 10+ tables before writing. Bevel's AI is generic. Google/Apple have no AI prose.
2. **Cross-domain correlation** — "Low energy followed a calorie deficit" is unique to us. No competitor surfaces this.
3. **Check-in context awareness** — Adapting energy/mood labels after leg day, calorie deficit, or low sleep is more sophisticated than anything in Bevel or Google Health.
4. **Recovery Score breakdown** — The expanded breakdown with per-component tips is more educational than Bevel. They show the score; we explain it.
5. **Nutrition depth** — 38 micronutrients, AI encyclopedia, dietary warnings, TDEE calibration. Fitbit nutrition is a calorie counter. Apple shows macros.
6. **Study integration** — Unique. No health app has this. The correlation between study performance and health habits is a genuine product moat.
7. **The micro-insight after check-in** — "Your last 3 low-energy days all followed a calorie deficit" — this is a feature no competitor has.

---

#### Test Page Mobile — Header Row Overflow (CONFIRMED BUG)

**Problem:** The test page header row (`src/app/study-hub/test/page.js`) contains: cert label + template progress bar + question navigation dots + timer + Pause button — all in a single flex row. On mobile (375px), this row collapses to unreadable. The question nav dots (`maxWidth: 220px` flex-wrap) spill over other content. The Pause button gets pushed off screen. The timer overlaps with the cert label.

**Fix:**
- Mobile: stack header into two rows
  - Row 1: cert label (left) + timer (center) + Pause button (right)
  - Row 2: question nav dots in a horizontally scrollable strip (`overflow-x: auto`)
- Template progress bar only shows on desktop; remove from mobile entirely (redundant with question count chip)
- Nav dots on mobile: smaller (12px × 12px), more spacing-efficient, scroll horizontally rather than wrapping

**Files:** `src/app/study-hub/test/page.js`

**Status: 📋 Specced**

---

#### Test Page — Trainer Chat Panel Mobile Width (CONFIRMED BUG)

**Problem:** The `ChatPanel` component in `src/app/study-hub/test/page.js` is `width: 320px, minWidth: 320px`. On an iPhone (375px viewport), this panel takes up 85% of the screen width, covering the question and answer choices behind it. There's no way to see the question text while the chat is open.

**Fix:**
- On mobile (≤768px): render ChatPanel as a bottom sheet instead of a side panel
- Bottom sheet: `position: fixed; bottom: 0; left: 0; right: 0; height: 60vh; border-radius: 14px 14px 0 0; z-index: 900`
- A drag handle at the top allows expanding to full height
- The 💬 button that opens it stays where it is (bottom-right)
- Desktop keeps the current side panel behavior unchanged

**Files:** `src/app/study-hub/test/page.js` — `ChatPanel` component

**Status: 📋 Specced**

---

#### Cert Guide — Tab Navigation Overflow on Mobile

**Problem:** `src/app/study-hub/cert-guide/page.js` renders 5 tabs: `['Overview', 'Overlap', 'Exam Details', 'Career & Value', 'Study Roadmap']`. These are displayed as a flex row with no overflow behavior. On mobile the tabs are likely wrapping to two rows (awkward) or getting clipped. "Career & Value" and "Study Roadmap" are long labels.

**Fix:**
- Wrap tab container in `overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch`
- Each tab: `display: inline-block` or `flex-shrink: 0` to prevent collapsing
- Shorter labels on mobile: "Overview" / "Overlap" / "Exam" / "Career" / "Roadmap"
- Alternatively: on mobile collapse into a `<select>` dropdown (simpler but less polished)
- A fade-out gradient on the right edge signals that the row is scrollable

**Files:** `src/app/study-hub/cert-guide/page.js`

**Status: 📋 Specced**

---

#### Study Hub Overview — Grid Layouts Break on Mobile

**Problem:** `src/app/study-hub/page.js` uses `display: grid; gridTemplateColumns: repeat(3, 1fr)` for the cert readiness cards and `repeat(4, 1fr)` for the stats row. On mobile these become three 110px columns or four 80px columns — far too narrow to be readable. No `@media` queries exist for mobile reflow.

**Fix:**
- Cert cards: `repeat(3, 1fr)` on desktop → `repeat(1, 1fr)` (single column) on ≤480px, or `repeat(2, 1fr)` on ≤768px with the third card full-width below
- Stats row: `repeat(4, 1fr)` on desktop → `repeat(2, 1fr)` on ≤600px
- Can be done with CSS variables or `@media` inside the inline `style` object, but since we use inline styles only, use the `isMobile` state pattern already established in `LifeHubSidebar.js`

**Files:** `src/app/study-hub/page.js`

**Status: 📋 Specced**

---

#### Settings Page — Tab Row Overflow on Mobile

**Problem:** `src/app/settings/page.js` has 6 tabs: `['Account', 'Notifications', 'Study', 'Data & Reset', 'Security', '⚠ Danger Zone']`. On mobile these almost certainly wrap to a second row, pushing all content down. 6 tabs is too many for a mobile tab row anyway.

**Fix (option A — horizontal scroll):** Same as Cert Guide fix — `overflow-x: auto; white-space: nowrap` on the tab container. Each tab becomes a scrollable pill.

**Fix (option B — dropdown on mobile):** Replace the 6-tab row with a `<select>` dropdown on ≤640px. The dropdown shows the active section name and a chevron. More compact but less discoverable.

**Recommendation:** Option A (scrolling pills) — more consistent with the rest of the app's visual language.

**Files:** `src/app/settings/page.js`

**Status: 📋 Specced**

---

#### Workout Log — Post-Workout Check-in Buttons (SMALL BUG)

**Problem:** The post-workout check-in modal (`PostWorkoutModal` in `src/app/life-hub/workouts/log/page.js`) shows difficulty and energy rating buttons at `flex: 1` each, five in a row. At 375px wide with `gap: 6px` and `padding: 28px 24px` on the container, each button is approximately 51px wide. The sublabels inside each button (`font-size: 9px`) are illegible — "Very Easy", "Exhausted" etc. at 9px on a 51px button is below any readable threshold.

**Fix:** Same as the check-in rating button fix — move the active label ABOVE the button row, show only the number inside each button, update the label dynamically on tap. The `DIFF_LABELS` and `ENERGY_LABELS` arrays are already defined per-value — just elevate the display to a row above.

**Files:** `src/app/life-hub/workouts/log/page.js` — `PostWorkoutModal` component (lines ~153–209)

**Status: 📋 Specced**

---

#### Workout Exercise Detail Modal — Trainer Chat on Small Screens

**Problem:** The exercise detail modal in `src/app/life-hub/workouts/log/page.js` (the `ExerciseModal` component) includes a trainer chat section at the bottom with a `maxHeight: 180px` scrollable history area. On mobile, the modal itself has no `max-height` constraint and contains: an image (220px) + exercise name + tag chips + instructions (variable) + green feel box + red do-not box + chat history + chat input. This can easily require 700-900px of scroll inside a modal that has `alignItems: center` centering it in the viewport. The result is a modal that's taller than the screen, the chat is unreachable without scrolling inside the modal.

**Fix:**
- Modal container: `maxHeight: 90vh; overflow-y: auto; -webkit-overflow-scrolling: touch`
- On mobile (≤640px): collapse the instructions by default behind a "Show instructions" toggle — most users open this to ask the trainer a question, not to read 8 steps
- Chat input should be sticky inside the modal at the bottom (`position: sticky; bottom: 0; background: var(--surface); padding: 10px 0`)

**Files:** `src/app/life-hub/workouts/log/page.js` — `ExerciseModal` component (lines ~60–151)

**Status: 📋 Specced**

---

#### Nutrition Page — Micronutrient Panel Hidden by Default

**Problem:** The micronutrient panel on `src/app/life-hub/nutrition/page.js` is collapsed by default (`microOpen` state starts `false`). This is a 38-field panel covering vitamins, minerals, and tracked micros — arguably the most valuable unique feature of our nutrition tracking. It's buried below the food log, collapsed, with a small toggle chip. Users who never discover it miss the entire encyclopedia integration, the gap report, and the DV% bars.

**Comparison:** Cronometer (our closest competitor on micronutrient depth) shows a prominent "Nutrition Targets" panel that's always visible as a sidebar. MyFitnessPal shows the micronutrient breakdown as the first card after macros.

**Fix options:**
- Open the panel by default (just change `useState(false)` → `useState(true)`)  — but this makes the page very long
- Better: move a "micronutrient snapshot" above the food log — a compact 3-column grid showing the 6 most important nutrients (Vitamin D, Iron, Calcium, Magnesium, Fiber, Protein) as colored bar chips. Clicking any chip jumps to the full micronutrient panel (or encyclopedia page for that nutrient).
- The full 38-field panel stays collapsed but now there's a visible summary above the fold

**Files:** `src/app/life-hub/nutrition/page.js`

**Status: 💬 Discussed — needs design decision on approach**

---

#### Build Order for UI/UX Overhaul

Priority order based on impact and user-reported severity:

```
PHASE A (bugs — do first):
  1. Sidebar bottom scroll bug (100vh → 100dvh) — both sidebars
  2. Real Exam crash investigation + fix
  3. Study Hub mobile text/layout pass (most-used pages first: test, cert guide)
     a. Test page header row stacking on mobile
     b. ChatPanel → bottom sheet on mobile
     c. Cert Guide tabs → horizontal scroll
     d. Study Hub page grid → responsive reflow
     e. Settings page tabs → horizontal scroll

PHASE B (Life Hub home restructure):
  4. Recovery Score ring redesign
  5. Daily Brief → single tabbed card
  6. Life Hub landing zone reorder (ring → check-in → stats → brief → heatmap → section nav)

PHASE C (navigation):
  7. Mobile bottom tab bar (Life Hub)
  8. Breadcrumbs on all sub-pages

PHASE D (polish):
  9. Check-in button tap targets on mobile (Life Hub + workout log PostWorkoutModal)
  10. Typography + spacing pass
  11. Left-border card pattern diversification
  12. Study Hub overview page with recommended action + cert scores
  13. Workout exercise modal — sticky chat input + collapsible instructions on mobile
  14. Nutrition micronutrient snapshot above the fold
```

---

### 🔔 Push Notifications — Status

**Infrastructure:** Fully built and active
- `daily-push` Edge Function deployed, cron runs every 30 min (`*/30 * * * *`), active ✅
- `background-health-sync` Edge Function deployed, cron runs every 2 hours, active ✅
- `generate-coach-memory` Edge Function deployed, cron runs Monday 2am, active ✅
- Settings page has "Enable Notifications" button that requests browser permission and saves subscription

**Why user hasn't received any notifications:**
- `push_subscriptions` table is empty — the browser permission + subscription registration flow has never been completed
- **To fix:** Go to Settings → Notifications section → click "Enable Notifications" → allow browser prompt → subscription saves to DB → Edge Function will find it on next 30-min cron run

---

### 🚪 Hub Gate + Force Sync on App Open (Built 2026-07-09)

- Next.js middleware at `src/middleware.js` intercepts all deep links and redirects to `/` (hub picker) if session cookie `hub_gate` is missing
- Hub page (`/`) sets `hub_gate` cookie on mount and fires background health sync
- Life Hub landing (`/life-hub`) also fires sync on mount with progress bar events
- All three health sub-pages (Overview, Steps, Sleep) force sync on open with shared 2-min cooldown key `health_force_sync_at` in localStorage
- `HealthSyncBar` component at top of screen shows sync progress across all Life Hub pages

---

## Phase Log

### Phase Z — Photo-Based Food Logging — Complete

- New API route `src/app/api/nutrition/ai-photo-log/route.js` — `getUser()` + `is_disabled` check; 10/hr rate limit; accepts `image_base64` + `media_type` + optional `description`; calls claude-sonnet-4-6 with vision; returns `{ status, confidence, confidence_note, retake_reason, items[] }`; image never stored
- Client-side image resizer (`resizeImage()`) in `AddFoodModal.js` — Canvas API, max 800px, outputs JPEG at 85% quality; runs before upload to keep payloads under ~600KB
- New 📷 Photo tab in `AddFoodModal.js` — 4 states: idle (Take Photo / Upload buttons), uploading (thumbnail + spinner text), result (photo thumbnail + confidence chip + item cards + Re-analyze hint field), error (message + Try Again)
- Confidence chip colors: green (high) / yellow (medium) / red (low); `confidence_note` shown as explanation sentence
- Each result item has a "+ Log this" button → flows into existing `LogConfirmModal` via `confirmOtherType = 'photo'`
- Re-analyze field shown when confidence is medium or low — user can type a description hint and re-submit the same photo
- "← Try a different photo" button resets state
- `handleConfirmOtherLog` extended with `photo` branch (logs directly, no save-to-library)
- `src/lib/rateLimit.js` updated with `'nutrition/ai-photo-log': 10`
- Server-side guards: 2MB base64 payload cap + magic byte validation (JPEG/PNG/WebP/GIF signatures checked before sending to Anthropic); client-supplied `media_type` is validated but not trusted alone

### Phase Y — Coach Memory Edge Function Upgrade — Complete

**What was built:**
- Added `getMonday()` helper to `supabase/functions/generate-coach-memory/index.ts` for Deno-compatible week start computation
- Added `my_week` query for current week's schedule — injects day type + workout times as `WEEKLY SCHEDULE:` block in Haiku prompt when rows exist
- Added `daily_briefs` query (last 30 days, up to 60 rows) — keyword-counts 8 topics (protein, sleep debt, sleep score, hydration, streak, recovery, fatigue, calorie); topics with ≥4 mentions injected as `RECURRING COACHING THEMES:` counts (not raw text — token-efficient); Haiku instructed to write a dedicated observation when a topic appears
- `my_week.commitments` field selected but not injected into prompt (user free text — excluded per security rule)
- Deployed as version 3

### Phase X — DV% Display Next to Nutrient Values — Complete

**What was built:**
- Added `DV` to import in `src/app/life-hub/nutrition/page.js`
- Added inline `% DV` in faint text next to each micronutrient value in the viewEntry food detail modal — only shown when `DV[k] != null` and value > 0; capped at 999%
- `NutrientBars` component already displayed `totalPct%` — no change needed there
- Food modal components (AddFoodModal, SearchModal, EditFoodModal) handle nutrient entry forms (input side) not read-only display, so no DV% needed there

### Phase U — Workout Auto-Progression — Complete

**What was built:**
- Auto-progression logic in `src/app/life-hub/workouts/page.js` `load()` — queries last 20 workout sessions' working sets, groups by exercise, detects when user hit ≥ top of rep range in 2+ of last 3 sessions
- "Ready to Progress" card rendered on My Workout Plan page (below Progression Notes) listing qualifying exercises with current weight, rep context, and suggested +5 lb bump
- Card hidden when no exercises qualify; footnote explains the progressive overload principle

### Phase W — Goal Velocity Card — Complete

**What was built:**
- Goal Velocity card on Goals page — queries last 28 days of `body_measurements`, computes actual lb/week change, shows on-track status (green/yellow), lbs remaining to goal, and ETA at current pace
- Hidden when fewer than 2 measurements exist or no target weight set

### Phase V — Food Logging Streak — Complete

**What was built:**
- Streak computed in Nutrition page `load()` from `food_log_entries` created_at over last 60 days
- 🔥 N-day streak chip shown in page header when streak > 0; hidden when no consecutive days logged

### Phase T — Sleep Debt Stat Card — Complete

**What was built:**
- Added `computeSleepDebt()` to `/life-hub/health/sleep/page.js` — queries last 7 days of `health_sleep_sessions` (sums stages JSONB, computes deficit vs `goals_profiles.sleep_hours` target, default 8h), falls back to `daily_checkins.sleep_hours` when no watch data
- Added Sleep Debt card below stage summary cards — color-coded (green <1hr, yellow 1–3hrs, red 3+hrs), includes InfoChip, shows "(based on self-reported sleep)" footnote when using checkin fallback, hidden entirely when no data available

### Phase P — Evening Brief + daily_briefs Schema Migration — Complete

**DB Migration (run in Supabase SQL editor — MCP tool lacked permission):**
```sql
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS window TEXT DEFAULT 'morning';
UPDATE daily_briefs SET window = 'morning' WHERE window IS NULL;
ALTER TABLE daily_briefs DROP CONSTRAINT IF EXISTS daily_briefs_user_id_date_key;
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_user_id_date_window_key UNIQUE (user_id, date, window);
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_window_check CHECK (window IN ('morning', 'afternoon', 'evening'));
```

- `src/app/api/life-hub/daily-brief/route.js` — GET: accepts `?window=` param (validated against `['morning','afternoon','evening']`, default `'morning'`), includes `window` in the `.eq()` query. POST: reads `window` from JSON body (default `'morning'`), routes to separate rate-limit key per window (`life-hub/daily-brief-evening` etc.), handles evening window with a dedicated today-data path (food log totals, steps, water, workout, check-in, sleep score → past-tense 3–4 sentence summary, max_tokens 250). All upserts now include `window` and use `onConflict: 'user_id,date,window'`. `VALID_WINDOWS` constant validates all window inputs.
- `src/app/api/checkin/insight/route.js` — after generating check-in insight, upserts `brief_text` into `daily_briefs` with `window: 'afternoon'` as a side effect. No new AI call — the check-in insight IS the afternoon brief.
- `src/app/life-hub/page.js` — brief state changed from single `brief` to `briefs: { morning, afternoon, evening }` object. `briefExpanded` is now per-window. Loading logic fetches all three windows in sequence; evening only fetches/generates after 6pm (client-side hour check). JSX: single brief card replaced with mapped `BRIEF_CONFIG` array (morning=purple, afternoon=yellow #f59e0b, evening=indigo #818cf8); each card collapsible; afternoon shows only if text exists; evening shows if text exists OR currentHour >= 18; morning always shows.

### Phase S2 — Notification Preferences + Per-User Timing — Complete

- DB: `notification_preferences` JSONB column added to `profiles` (default: briefs ON, nudges OFF); migration applied
- pg_cron: removed 3 fixed-time jobs; added `daily-push-check` running every 30 minutes (`*/30 * * * *`)
- `supabase/functions/daily-push/index.ts` (rewritten): per-user window computation from `goals_profiles.wake_time` + `bedtime` (morning=wake_time, midday=wake_time+6h, evening=bedtime−1h; fallbacks 08:00/23:00); checks `notification_preferences` before each send; 10 notification types each with unique window key for dedup; nudge condition checks: hydration (water_logs vs goal), study streak (question_answers count vs daily_goal), workout (my_week lookup + workout_logs check), supplement (stack timing + supplement_logs), weigh-in (body_measurements last date), body measurement (last non-weight measurement), wrap ready (Saturday weekly + 1st-of-month monthly); each user can receive multiple pushes per window (brief + nudge = separate window keys); per-user errors isolated with try/catch
- `src/app/settings/page.js`: new `🔔 Notifications` tab added between Account and Study tabs; `NOTIF_TYPES` constant defines 2 groups (Daily Briefs + Smart Nudges) with 10 items; push enable/disable card moved from Account tab to Notifications tab; preference toggles (pill-style) shown only when subscribed; `handleTogglePref()` immediately PATCHes `profiles.notification_preferences` on each flip; `prefsSaving` indicator; wake_time/bedtime context note shown when subscribed

### Phase S — Push Notifications + Callout Card Removal — Complete

- DB: `push_subscriptions` table (user_id, endpoint, p256dh, auth_key, user_agent; UNIQUE on user_id+endpoint; RLS: user manages own) + `push_notification_log` table (user_id, sent_date TEXT, `"window"` TEXT quoted, title, body, delivered BOOLEAN; UNIQUE on user_id+sent_date+window; RLS: user SELECT only) — both created via Supabase MCP
- `src/app/api/push/subscribe/route.js` (new): POST upserts to `push_subscriptions` (onConflict: user_id,endpoint); DELETE removes by user_id+endpoint; `getUser()` on both; no AI, no is_disabled
- `public/sw.js`: appended `push` event handler (shows notification via `self.registration.showNotification`) + `notificationclick` handler (focuses existing window or opens new one to `event.notification.data.url`)
- `src/app/settings/page.js`: added `🔔 Notifications` card to Account tab — checks `Notification.permission` on mount, shows Enable/Disable/Blocked states; enable calls `requestPermission()` + `pushManager.subscribe()` + POST to subscribe route; disable calls DELETE + `pushManager.unsubscribe()`; VAPID public key from `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `supabase/functions/daily-push/index.ts` (new): Deno Edge Function; `verify_jwt: false`; determines window from UTC hour (12=morning, 17=midday, 23=evening); loads all push_subscriptions via service role; checks `push_notification_log` dedup before each send; builds VAPID JWT using Web Crypto; sends push via fetch to each endpoint; handles 410/404 (expired — deletes subscription); logs result to `push_notification_log`
- pg_cron: 3 jobs added — `daily-push-morning` (0 12 UTC), `daily-push-midday` (0 17 UTC), `daily-push-evening` (0 23 UTC) — all use `net.http_post` with no Authorization header (verify_jwt: false)
- **VAPID keys generated:** public key stored as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel; private key as `VAPID_PRIVATE_KEY` in Vercel + Supabase Edge Function secrets; subject as `VAPID_SUBJECT`; keys never committed to code
- **Callout cards removed (6 total):**
  - Micronutrient Daily Awareness card — `src/app/life-hub/nutrition/page.js` (suppressed with `false &&`)
  - Post-workout meal window banner — `src/app/life-hub/nutrition/page.js` (block removed)
  - Pre-workout meal reminder banner — `src/app/life-hub/nutrition/page.js` (block removed)
  - Low Energy Today fatigue signal — `src/app/life-hub/workouts/page.js` (block removed)
  - Hydration warning banner — `src/app/life-hub/workouts/log/page.js` (state + JSX removed)
  - Drink timing callout text — `src/app/life-hub/health/water/page.js` (callout message removed; chart kept)

### Phase R — Workout Day Hub — Complete

- **DB migrations:** `stretch_logs.context TEXT CHECK IN ('pre_workout','post_workout','bedtime','standalone')`; `workout_logs.coaching_feedback_read_at TIMESTAMPTZ`
- `src/app/api/workouts/day-hub/route.js` (new): GET `?date=YYYY-MM-DD` — validates date regex, returns `plan_day`, `workout_log`, `workout_sets`, `stretch_logs` (with context), `prev_session` (last same-day-label working sets for hints); `getUser()` only
- `src/app/api/workouts/stretch-log/route.js`: added `context` field to POST insert; validated against `VALID_CONTEXTS` list before insert
- `src/app/life-hub/workouts/day/[dayIndex]/page.js` (new): 4-phase journey (Pre-Stretch → Workout → Post-Stretch → Bedtime); rest day mode; prev session weight hints per exercise; coach feedback card with unread badge + marks read on expand; read-only for past dates; adjacent day prev/next nav; `?date=` param for historical deep links from history page
- `src/app/life-hub/workouts/page.js`: weekly completion bar (X/Y workouts); day cards now show "Open →" link to Day Hub (by sorted dow index); stretching link updated to `/life-hub/workouts/stretches`
- `src/app/life-hub/workouts/history/page.js`: rewritten — week-grouped format (8 weeks/page, Load More); PR section removed; each session row shows "View Day →" linking to Day Hub read-only mode
- `src/app/life-hub/workouts/exercises/page.js`: PR chip in detail modal — `fetchPR(exerciseName)` queries `workout_log_sets` for max working weight; shows "No sets logged yet" when empty
- `src/app/life-hub/workouts/stretches/page.js` (new): moved from `stretching/library/page.js`
- `src/app/life-hub/workouts/stretching/page.js`: deleted (superseded by Day Hub phases)
- `src/components/LifeHubSidebar.js`: removed "Stretching & Mobility" nav item; renamed "Stretch Library" → "Stretch Reference" at new `/life-hub/workouts/stretches` URL

### Phase Q — My Week (Unified Weekly Planning Hub) — Complete

- `src/app/api/life-hub/my-week/route.js` (new): GET `?week=YYYY-MM-DD` returns all rows for that week_start; POST `{ week, day }` upserts one day row (validates day_of_week 0–6, day_type against 4 valid values), syncs day_type back to `goals_profiles.weekly_schedule`; `getMonday()` UTC-safe
- `src/app/life-hub/my-week/page.js` (new): Mon–Sun collapsible day cards; day type pills (active_work=green, desk_work=blue, day_off=purple, travel=orange); expanded detail: meal times (breakfast/lunch/dinner/snacks), workout time+duration, commitments textarea, notes textarea; auto-saves on blur per field via POST; week nav prev/next; "Copy from last week" prefills all fields from prior week's saved data; today highlighted in purple with TODAY badge; quick summary (workout time + breakfast) visible in collapsed state
- `src/components/LifeHubSidebar.js`: "My Week" added under Overview (between Dashboard and Weekly Wrap); "Meal Plan" removed from Nutrition dropdown; `overviewActive` now includes `/life-hub/my-week`
- `src/app/life-hub/goals/page.js`: Weekly Schedule inline edit card replaced with a link card pointing to `/life-hub/my-week`; `scheduleEdit`, `scheduleValue`, `scheduleSaving` state removed; `handleScheduleSave` removed; `GoalsSchedulePicker` component removed
- `src/app/life-hub/nutrition/meal-plan/page.js`: deleted (meal plan UI retired; DB tables and API routes preserved)
- `src/app/api/life-hub/daily-brief/route.js`: `scheduleContext` block now reads `my_week` for today first (falls back to `goals_profiles.weekly_schedule`); injects meal times, workout time, commitments, day_notes into Claude prompt; supplement timing alignment: when `workout_time` is set, computes pre-workout time (−45min) and injects pre-workout supplement timing note
- `src/app/api/life-hub/monthly-wrap/route.js`: fetches `my_week` rows for the month; `scheduleMonthlyContext` uses actual per-day counts from `my_week` when available, falls back to `goals_profiles.weekly_schedule`
- `src/app/api/workouts/generate-plan/route.js`: `async` IIFE reads `my_week` for current week; injects per-day schedule into workout plan prompt; falls back to `goals_profiles.weekly_schedule`
- DB: `my_week` table created with RLS via Supabase MCP tool

### Phase L — Weekly Wrap Page — Complete

- `src/app/api/life-hub/weekly-wrap/route.js` (new): GET returns list of past `week_start` dates or single wrap; POST validates Monday + completed week, gathers 9 tables (checkins, workouts, measurements, goals, water, food, sleep sessions, HR daily, steps hourly), computes 11 summary stats, calls `claude-sonnet-4-6` (max_tokens 350) with required "Next week:" paragraph, upserts to `weekly_wraps`; blocks current week with 400 + `next_monday`; `getUser()` + `is_disabled` check; free text wrapped in `<user_input>` tags
- `src/app/life-hub/weekly-wrap/page.js` (new): prev/next week nav chips, history sidebar (past wrap buttons), "Week in progress" block for current week, AI narrative split into main paragraph + highlighted "Next week:" action block, stat grid (workouts/energy/mood/weight/calories/water/sleep/steps/HR/protein), Generate button for past weeks with no wrap
- `src/components/LifeHubSidebar.js`: added "Weekly Wrap" navLink under Overview section (above Monthly Wrap); `overviewActive` now includes `/life-hub/weekly-wrap`
- DB: `weekly_wraps` table already existed from this session (migration applied earlier)

### Phase N — Background Health Sync Edge Function — Complete

- `supabase/functions/background-health-sync/googleHealth.ts` (new): Deno/TypeScript port of `src/lib/googleHealth.js`; `process.env.X` → `Deno.env.get('X')!`; all 6 exports preserved (`estDateStr`, `getEstHour`, `refreshTokenIfNeeded`, `fetchDataType`, `computeSleepMetrics`, `computeSleepScore`)
- `supabase/functions/background-health-sync/index.ts` (new): service-role Supabase client; queries all `google_health_tokens` rows; processes users **sequentially** with per-user try/catch (isolates failures); full sync logic ported from `POST /api/health/sync/route.js` (steps, intraday HR, 5-min HR, resting HR, HRV, sleep); updates `last_synced_at` after each successful user; returns `{ ok, synced, failed, errors, ts }`
- Deployed to Supabase Edge Functions with `verify_jwt: false` (required for pg_cron — no JWT available)
- pg_cron job added: `cron.schedule('background-health-sync', '0 */2 * * *', ...)` — runs every 2 hours; uses `net.http_post` to call Edge Function URL; schedule ID 2
- **Reminder:** `GOOGLE_HEALTH_CLIENT_ID` and `GOOGLE_HEALTH_CLIENT_SECRET` must be added to Supabase Edge Function secrets (separate from Vercel env vars) for the sync to work

### Phase 80 — Item 22: ℹ️ InfoChip Touchpoints — Complete

- `src/components/InfoChip.js` (new): reusable grey chip component; toggles inline expansion on tap; orange when active; `text` prop rendered in a warm callout box; `label` defaults to "ℹ️"; CSS variables for theme compatibility; works inline next to any label
- 11 touchpoints added across 8 files:
  - `src/app/life-hub/health/sleep/page.js` — Sleep Score (ScoreRing) + Sleep Efficiency % label
  - `src/app/life-hub/health/heart-rate/page.js` — Resting HR + HRV (RMSSD) stat cards
  - `src/app/life-hub/page.js` — Recovery Score subtitle label
  - `src/app/life-hub/goals/measurements/page.js` — Body Composition Signal card header + Navy BF% badge on each history entry
  - `src/app/life-hub/workouts/stretching/page.js` — Dynamic vs Static session type toggle area + Static Stretches section header in standalone mode (before-bed tip)
  - `src/app/life-hub/nutrition/page.js` — "Maintenance (TDEE)" row label
  - `src/app/life-hub/workouts/log/page.js` — "❤️ Heart Rate Zones" heading on workout completion screen

### Phase 79 — Item 21: Micronutrient Daily Awareness — Complete

- `src/app/life-hub/nutrition/page.js` — added `prevDaysEntries` state (yesterday + day-before entries); load() fetches a 3rd day in parallel; unified "🧬 Today's Micro Snapshot" card renders between TDEE card and Food Log tab; two zones: warnings (red/orange/purple) + "✅ Working for you today" (green); warning triggers: over 150% DV (red), under 20% DV after 3pm (orange), absent 3+ consecutive days (purple); good trigger: 70–150% DV shows top 2 by coverage with what the nutrient is actively doing for the body; all copy is static and specific per nutrient (10 micros covered); DVs from `calcMicroTargets(age, sex)` with hardcoded fallbacks; card hidden when nothing to show

### Phase 78 — Item 20: Stretch System Overhaul — Complete

- `src/data/stretches.js` — added `ideal_timing` field to all 38 stretches (`'pre_workout'` / `'post_workout_or_bed'` / `'anytime'`); added `why` field (2–3 sentences per stretch: what muscle/tissue, why it gets tight, consequence if untreated); added `SORE_SPOT_TO_MUSCLE_GROUP` export map (`shoulder→Shoulders`, `hip→Hips`, etc.); updated `getRecommendedStretches()` to use the map for proper group name matching; added `getTimingLabel(ideal_timing)` export returning human-readable guidance
- `src/app/life-hub/workouts/stretching/page.js` — `StretchCard` updated: timing label line below stretch name; "Why?" toggle button reveals `stretch.why` in a purple callout; injury-aware copy block above instructions when `soreSpots.includes(stretch.muscle_group)` ("Your [X] is sore — still do this stretch, but don't push past a 4/10 sensation..."); all `StretchCard` usages now pass `soreSpots` prop
- `src/app/life-hub/workouts/page.js` — imports `getRecommendedStretches`, `getTimingLabel`, `BODY_PART_TO_STRETCH_GROUPS`; fetches `sore_spots` from `daily_checkins` on load; computes `todayBodyParts` from today's plan `day_label`; computes `todayStretches` (top 3 dynamic + top 2 static); renders "🧘 Stretches for Today" card below progression notes — shows stretch chips with timing labels, duration, and "Open →" link to stretching page
- `supabase/functions/generate-coach-memory/index.ts` — added stretch-sleep correlation computation: builds `stretchDates` Set from `stretch_logs`; for each `health_sleep_sessions` row checks if the prior date had a stretch session; computes `avgSleepWithStretch` vs `avgSleepWithoutStretch` (both require ≥3 data points); injects `STRETCH-SLEEP CORRELATION` line into the Haiku data summary so the AI can write a `sleep` category observation when the correlation is notable

### Phase 77 — Feature D + Feature E: Workout Suggestions + Keep Talking — Complete

- DB: `workout_session_overrides` table — `user_id`, `date`, `original_exercise`, `override_exercise`, `reason`, `applied_at`; RLS user-scoped
- `src/app/api/checkin/chat/route.js` (new): POST Keep Talking multi-turn; Haiku; rate-limited 24 turns/day (`checkin-chat-YYYY-MM-DD`); receives frozen `contextSnapshot` from client + `messages[]`; returns `{ message, proposed_actions[] }`; note/context protected by system prompt injection; no DB re-fetch
- `src/components/CheckInSheet.js` updated: after insight displays, shows "💬 Keep Talking" button instead of 5s auto-close; tapping expands to inline chat UI (bubble layout, turn counter, 8-turn max client-enforced); each AI reply may include new `proposed_actions` merged into localStorage `workout_suggestions_${today}`; `contextSnapshotRef` frozen on first save — all chat turns reuse the same snapshot
- `src/app/life-hub/workouts/page.js` updated: reads `workout_suggestions_${today}` from localStorage on load; reads `workout_session_overrides` from DB for already-applied overrides; today's card highlighted with orange border; Suggestions button with orange dot badge appears when pending swaps exist; Suggestions bottom-sheet shows swap cards (original → replacement, reason, Apply/Skip); Apply writes to `workout_session_overrides` + updates `appliedOverrides` state; applied overrides render inline as strikethrough → orange replacement + "Modified" chip
- `src/app/life-hub/workouts/log/page.js` updated: on fresh start (not resume), queries `workout_session_overrides` for today and substitutes exercise names before building the set list — the saved plan is never modified

### Phase 76 — Item 18 + Feature B: Real-Time Check-In Intelligence — Complete

- DB: `afternoon_energy`, `afternoon_mood`, `afternoon_note` columns added to `daily_checkins`; `wake_time` TIME, `bedtime` TIME columns added to `goals_profiles`
- `src/app/api/checkin/insight/route.js` (new): POST, Haiku, rate-limited 2/day (`checkin-insight-YYYY-MM-DD`); saves check-in to `daily_checkins` (morning or afternoon fields); `SORE_CONFLICT_MAP` checks today's planned exercises for conflicts with sore spots; `coach_memory_context` received from client (context snapshot — NOT re-fetched); user note wrapped in `<user_input>` tags; returns `{ insight: "2 sentences", proposed_actions: [{ type, from_exercise, to_exercise, reason }] }`
- `src/components/CheckInSheet.js` (new): bottom-sheet with morning (#f59e0b) and afternoon (#a78bfa) accent colors; energy 1–5 + mood 1–5 raters with emoji/label chips; note textarea; `extractSoreSpots(note)` keyword matcher; on save: 8 parallel Supabase queries assemble context (sleep, yesterday workout, food, water, steps, active plan, 7-day energy history, coach memory); calls `/api/checkin/insight`; shows AI insight for 5s then auto-closes; calls `onInsight(proposed_actions, sore_spots)` callback
- `src/components/LifeHubClientShell.js` updated: fetches `goals_profiles.wake_time` on mount; morning window = within 60min of wake_time (default 7am); afternoon window = wake_time + 7 hours; 30s delay before showing; `hasShownRef` (ref not state — persists across Life Hub navigation); localStorage gate keys `checkin_morning_YYYY-MM-DD` / `checkin_afternoon_YYYY-MM-DD`; dynamically imports CheckInSheet
- `src/app/life-hub/goals/setup/page.js` Step 1: added Wake up + Bedtime `<input type="time">` fields; defaults 07:00/23:00; loaded from profile + saved with upsert

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

---

## Remaining Build Phases — Complete Sequence

**This is the canonical build order. Every phase must be built in this sequence. Do not reorder without reading the dependency map.**

### Final Design Decisions (locked — do not re-litigate)
| Decision | Choice |
|----------|--------|
| Three-brief UI on Life Hub home | All three shown as separate collapsible cards (morning/afternoon/evening); most recent expanded by default |
| Goals 2.0 | Parked — do not build; Goal Velocity uses current goals_profiles data as-is |
| My Week scope | Replaces both Meal Plan page AND weekly_schedule UI on Goals; all AI routes that read weekly_schedule updated to read from my_week (with fallback to goals_profiles.weekly_schedule for users with no my_week entry) |
| Callout card removal timing | All 6 on-page callout cards removed when Phase S (three-brief system) ships — same session |
| Day Hub vs Push Notifications | Day Hub (Phase R) ships first; push notifications (Phase S) come after |
| Polish features to build | DV% display only; photo-based food logging and food water content deferred |
| My Week + weekly_schedule sync | My Week reads goals_profiles.weekly_schedule as a starting default on first creation; saves to my_week table; also updates goals_profiles.weekly_schedule with day_type values so existing AI routes continue working without changes |

### Dependency Map
```
Phase P (evening brief migration)
  └─ Phase S (three-brief system requires daily_briefs.window column)

Phase Q (My Week)
  ├─ Phase S (daily-brief/route reads my_week for richer context — briefs better with My Week live)
  └─ Phase Y (coach memory upgrade reads My Week context)

Phase R (Day Hub) — independent; no upstream deps
  └─ (auto-progression suggestions from Phase U shown in Day Hub Phase 2 cards — can ship placeholder first)

Phase S (push + three-brief + card removal) — requires Phase P; richer if Q is live first

Phase T (sleep debt stat card) — brief content ships in Phase S; stat card is additive standalone

Phase U (workout volume + auto-progression) — independent; ships any time after Phase R is live
Phase V (food logging streak) — fully independent
Phase W (goal velocity) — fully independent
Phase X (DV% display) — fully independent polish pass
Phase Y (coach memory upgrade) — requires Phase Q (My Week) to be live
```

### Recommended Session Order
```
1. Phase P — Evening Brief + Migration    (short session, critical prerequisite)
2. Phase Q — My Week                      (medium session, unlocks best brief quality)
3. Phase R — Workout Day Hub              (large session, 2 subsessions likely)
4. Phase S — Push + Three-Brief + Cards  (large session)
5. Phase T — Sleep Debt Stat Card        (short session)
6. Phase U — Volume + Auto-Progression   (medium session)
7. Phase V — Food Logging Streak         (short session)
8. Phase W — Goal Velocity               (short session)
9. Phase X — DV% Display                 (medium session — many files)
10. Phase Y — Coach Memory Upgrade        (short session)
```

---

### Phase P — Evening Brief + daily_briefs Schema Migration

**Prerequisite:** Must ship before Phase S. Nothing in Phase S works without the `window` column.

**The breaking migration (run all 5 steps as one atomic migration):**
```sql
ALTER TABLE daily_briefs ADD COLUMN window TEXT DEFAULT 'morning';
UPDATE daily_briefs SET window = 'morning';
ALTER TABLE daily_briefs DROP CONSTRAINT IF EXISTS daily_briefs_user_id_date_key;
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_user_id_date_window_key UNIQUE (user_id, date, window);
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_window_check CHECK (window IN ('morning', 'afternoon', 'evening'));
```
Verify the old constraint name before running: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'daily_briefs';` — if it was named differently at creation, `DROP CONSTRAINT IF EXISTS` will silently succeed regardless. Safe to run as-is.

**Files to create/modify:**

| File | Change |
|------|--------|
| `src/app/api/life-hub/daily-brief/route.js` | GET: add `?window=` param (default `'morning'`), include in `.eq('window', window)`. POST: accept `window` in body (default `'morning'`), include in upsert with `onConflict: 'user_id,date,window'`. All existing morning logic unchanged — just thread `window` through. |
| `src/app/life-hub/page.js` | Update morning brief fetch to include `?window=morning`. Add fetch for `?window=evening` for the evening brief card (shown after 6pm client-side). |
| `src/app/api/life-hub/daily-brief/route.js` (evening POST) | New logic when `window === 'evening'`: query TODAY's full food log totals, steps, workout, stretch log, water, check-in. Past-tense framing. Max tokens 250. Rate limit key: `'life-hub/daily-brief-evening'` (1/day). |

**Evening brief data queries (distinct from morning — queries TODAY not yesterday):**
```js
// Today's data only
const today = estDateStr()
const [foodLog, workout, checkin, steps, water, sleepCtx] = await Promise.all([
  supabase.from('food_log_entries').select('calories,protein_g,carbs_g,fat_g,water_g').eq('user_id', userId).eq('date', today),
  supabase.from('workout_logs').select('duration_seconds,post_workout_difficulty,post_workout_energy,post_workout_note,hr_zones').eq('user_id', userId).gte('created_at', `${today}T00:00:00`).maybeSingle(),
  supabase.from('daily_checkins').select('energy_level,mood_level,afternoon_energy,afternoon_mood,sore_spots').eq('user_id', userId).eq('date', today).maybeSingle(),
  supabase.from('health_steps_hourly').select('steps').eq('user_id', userId).eq('date', today),
  supabase.from('water_logs').select('amount_oz').eq('user_id', userId).eq('date', today),
  supabase.from('health_sleep_sessions').select('sleep_score,total_duration_minutes').eq('user_id', userId).eq('date', today).maybeSingle(),
])
```

**Afternoon brief (no new AI call — uses check-in insight):**
The existing `checkin/insight/route.js` already generates a 2-sentence insight. After generating, upsert that text into `daily_briefs` with `window: 'afternoon'`. Change is in `checkin/insight/route.js` — after the Haiku response, add:
```js
await supabase.from('daily_briefs').upsert({ user_id: userId, date: today, window: 'afternoon', brief_text: insight }, { onConflict: 'user_id,date,window' })
```
No new AI call, no new rate limit — the check-in insight IS the afternoon brief.

**Security:**
- `getUser()` + `is_disabled` check on evening POST (same as morning)
- Rate limit evening to 1/day; morning stays at 1/day; no rate limit on afternoon (it's a side-effect of the check-in, which is already rate-limited at 2/day)
- No user-supplied free text injected into evening brief (all data is from DB/APIs)
- `?window=` param: validate against `['morning', 'afternoon', 'evening']` — reject any other value with 400

**Watch out for:**
1. **Constraint name**: The `DROP CONSTRAINT IF EXISTS` must use the exact name Supabase assigned. Safest to check first via the SQL editor before running in migration. Alternatively, use `IF EXISTS` as written — it will silently no-op if the name doesn't match, but then step 4 will fail on duplicate UNIQUE. Test in a branch environment first if possible.
2. **Existing callers**: The GET route defaulting to `'morning'` means all existing callers (Life Hub home page, etc.) continue to work with no changes until they explicitly pass `?window=afternoon` or `?window=evening`.
3. **Evening brief timing**: The brief is generated on-demand (when the user visits Life Hub in the evening) until Phase S ships pg_cron. Use a client-side check: if `Date().getHours() >= 18`, show evening card + trigger POST if not yet generated. Before 6pm: show "Evening summary available after 6pm" placeholder.
4. **Don't regenerate same-day**: POST handler must check for existing `(user_id, date, window)` row before calling Claude. The `upsert` with `onConflict` handles this — it won't regenerate if row exists. But the client should also check the GET response first before firing POST.

---

### Phase Q — My Week (Unified Weekly Planning Hub)

**Purpose:** Replace the Meal Plan page and the Goals weekly_schedule card with a single, richer weekly planning surface. AI routes that previously read `goals_profiles.weekly_schedule` are updated to read from `my_week` instead.

**DB migration:**
```sql
CREATE TABLE my_week (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  week_start DATE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  day_type TEXT CHECK (day_type IN ('active_work', 'desk_work', 'day_off', 'travel')),
  breakfast_time TIME,
  lunch_time TIME,
  dinner_time TIME,
  snack_times TEXT,
  workout_time TIME,
  workout_duration_min SMALLINT,
  commitments TEXT,
  day_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, day_of_week)
);
ALTER TABLE my_week ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON my_week FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
Note: `week_start` must always be a Monday — enforce at API level, not DB level (DB doesn't have day-of-week constraint on date columns without a trigger).

**API routes:**
- `GET /api/life-hub/my-week?week=YYYY-MM-DD` — returns all 7 rows for that week_start. If no rows exist, returns empty array (not 404 — client shows empty grid that can be filled in).
- `POST /api/life-hub/my-week` — body: `{ week: 'YYYY-MM-DD', days: [{ day_of_week, day_type, breakfast_time, ... }] }`. Validates week is a Monday. Upserts all 7 rows. Also syncs day_type values back to `goals_profiles.weekly_schedule` (see sync logic below).
- Both routes: `getUser()` + no `is_disabled` check (no AI call here).

**Sync to goals_profiles.weekly_schedule:**
When POST saves a My Week entry, also PATCH `goals_profiles.weekly_schedule` with the new day_type values:
```js
const scheduleMap = { 0: 'mon', 1: 'tue', 2: 'wed', 3: 'thu', 4: 'fri', 5: 'sat', 6: 'sun' }
const weekly_schedule = {}
days.forEach(d => { weekly_schedule[scheduleMap[d.day_of_week]] = d.day_type })
await supabase.from('goals_profiles').update({ weekly_schedule }).eq('user_id', userId)
```
This keeps existing AI routes working without changes. The `goals_profiles.weekly_schedule` becomes the "last saved My Week day types" — a shadow copy for backward compatibility.

**Pre-fill from existing weekly_schedule:**
When user opens My Week for a week with no existing entries, fetch `goals_profiles.weekly_schedule` and pre-populate the day_type pills. User sees their existing schedule rather than blank fields. Meal times and other fields start empty.

**Page: `/life-hub/my-week/page.js`**

Layout: A horizontal Mon–Sun grid with a date header per column (e.g. "Mon · Jul 7"). Each column has collapsible sections:

```
MON · Jul 7          TUE · Jul 8          ...
─────────────────    ─────────────────
[DAY TYPE PILL]      [DAY TYPE PILL]
  ○ active_work        ● desk_work
  ○ desk_work          ...
  ○ day_off
  ○ travel
─────────────────
⏰ MEALS
  Breakfast: [07:00]
  Lunch:     [12:00]
  Dinner:    [18:30]
  Snacks:    [text]
─────────────────
🏋️ WORKOUT
  Time:     [18:00]
  Duration: [60] min
─────────────────
📅 COMMITMENTS
  [text area]
─────────────────
📝 NOTES
  [text area]
```

On mobile: vertical stack of day cards (Mon → Sun). Each day card is collapsible. Tapping the header expands the sections.

"Copy from last week" button: fills current week grid from previous week's my_week entries. If no previous week entries exist, button is hidden.

Auto-save: each field saves on blur (not a full form submit). Each day row upserts independently on change. No "Save" button needed for the whole page.

**Sidebar changes:**
- Remove "Meal Plan" from Nutrition dropdown in `LifeHubSidebar.js`
- Add "My Week" under Overview section (after Dashboard, before Weekly Wrap)
- Update `overviewActive` condition to include `/life-hub/my-week`

**Goals page changes:**
- Remove "Weekly Schedule" card + inline edit widget from `src/app/life-hub/goals/page.js`
- Add a small "Manage your weekly schedule in My Week →" link card in its place pointing to `/life-hub/my-week`

**Retire meal plan page:**
- Delete `src/app/life-hub/nutrition/meal-plan/page.js`
- Keep `meal_plans` + `meal_plan_entries` tables and API routes (data preserved, just UI removed)
- Remove "Meal Plan" reset row from Settings if present
- Update CLAUDE.md directory structure

**Update AI routes to read from my_week:**

*`daily-brief/route.js`:*
```js
// Replace existing goals_profiles.weekly_schedule read with:
const today = estDateStr()
const monday = getMonday(today)
const { data: myWeekRows } = await supabase
  .from('my_week')
  .select('*')
  .eq('user_id', userId)
  .eq('week_start', monday)

const todayDayOfWeek = (new Date(today).getDay() + 6) % 7 // Mon=0
const todayMyWeek = myWeekRows?.find(r => r.day_of_week === todayDayOfWeek)

// Build scheduleContext from myWeekRows (if exists) or fall back to goals_profiles.weekly_schedule
if (todayMyWeek) {
  scheduleContext = [
    `Today (${dayLabel}): ${todayMyWeek.day_type}`,
    todayMyWeek.breakfast_time ? `Breakfast scheduled: ${todayMyWeek.breakfast_time}` : null,
    todayMyWeek.lunch_time ? `Lunch scheduled: ${todayMyWeek.lunch_time}` : null,
    todayMyWeek.dinner_time ? `Dinner scheduled: ${todayMyWeek.dinner_time}` : null,
    todayMyWeek.workout_time ? `Workout scheduled: ${todayMyWeek.workout_time} (${todayMyWeek.workout_duration_min ?? '?'} min)` : null,
    todayMyWeek.commitments ? `Today's commitments: <user_input>${todayMyWeek.commitments}</user_input>` : null,
    todayMyWeek.day_notes ? `Notes: <user_input>${todayMyWeek.day_notes}</user_input>` : null,
  ].filter(Boolean).join('\n')
} else if (goalsProfile?.weekly_schedule) {
  // legacy fallback
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun']
  const dayType = goalsProfile.weekly_schedule[dayKeys[todayDayOfWeek]]
  scheduleContext = dayType ? `Today: ${dayType} (no My Week entry for this week)` : null
}

// Supplement timing alignment when workout_time is set:
if (todayMyWeek?.workout_time) {
  const [h, m] = todayMyWeek.workout_time.split(':').map(Number)
  const preTime = `${String(h === 0 ? 23 : h - 1).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  suppContext = supplements.filter(s => s.timing === 'pre_workout').map(s =>
    `${s.name} (${s.dose}) — take at ${preTime} (45min before ${todayMyWeek.workout_time} workout)`
  ).join('\n')
}
```

*`monthly-wrap/route.js`:*
```js
// Replace goals_profiles.weekly_schedule read with my_week aggregate for the month
const { data: myWeekMonth } = await supabase
  .from('my_week')
  .select('day_type, day_of_week')
  .eq('user_id', userId)
  .gte('week_start', `${month}-01`)
  .lte('week_start', monthEnd)

const dayTypeCounts = { active_work: 0, desk_work: 0, day_off: 0, travel: 0 }
myWeekMonth?.forEach(r => dayTypeCounts[r.day_type]++)
scheduleMonthlyContext = myWeekMonth?.length > 0
  ? `Monthly schedule: ${dayTypeCounts.active_work} active_work, ${dayTypeCounts.desk_work} desk_work, ${dayTypeCounts.day_off} day_off, ${dayTypeCounts.travel} travel days`
  : goalsProfile?.weekly_schedule ? `Default schedule (from goals): ${JSON.stringify(goalsProfile.weekly_schedule)}` : null
```

*`generate-plan/route.js`:*
```js
// Replace goals_profiles.weekly_schedule read with:
const monday = getMonday(new Date().toISOString().split('T')[0])
const { data: myWeekRows } = await supabase.from('my_week').select('day_of_week, day_type').eq('user_id', userId).eq('week_start', monday)
const dayTypeByIndex = {}
myWeekRows?.forEach(r => { dayTypeByIndex[r.day_of_week] = r.day_type })
// Falls back to goals_profiles.weekly_schedule if myWeekRows is empty (handled in AI prompt)
```

**Security:**
- `commitments` and `day_notes` are user free text → always wrap in `<user_input>` tags in every AI prompt injection (shown above for daily-brief)
- `week_start` validation: `const d = new Date(week); if (d.getDay() !== 1) return NextResponse.json({ error: 'week_start must be a Monday' }, { status: 400 })` — Monday = day index 1
- `day_of_week` validation: reject values outside 0–6
- `day_type` validation: reject values outside the 4 allowed strings (DB CHECK constraint covers this, but also validate at API level before hitting DB for clear error messages)
- PATCH to `goals_profiles.weekly_schedule` must only update that one column — never re-save full goals_profiles row (risk of overwriting other user data)
- RLS on `my_week`: `user_id = auth.uid()` — standard pattern

**Watch out for:**
1. The `getMonday()` function must handle timezone correctly. `new Date('2025-07-08').getDay()` gives UTC day, which could be wrong for EST users. Use a consistent timezone-safe Monday calculation: `const d = new Date(dateStr); d.setUTCHours(0,0,0,0); const day = d.getUTCDay(); d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().split('T')[0]`
2. Auto-save on blur: if the user fills breakfast time and immediately tabs to lunch without touching anything else, only the breakfast field upserts. The day row may not exist yet — the upsert must INSERT if no row exists for that `(user_id, week_start, day_of_week)` combination.
3. "Copy from last week": compute last week's Monday as `current Monday - 7 days`. If no data exists, show "No previous week to copy" state.
4. The Goals page still shows the lifestyle card (activity level, daily steps, timeline) — that's separate from the weekly schedule card being removed. Only the "Weekly Schedule" card with the 7-day grid is removed.
5. Supplement timing in the brief: `workout_time` is a Postgres TIME column stored as "HH:MM:SS". Parse as `split(':')` → `[h, m]`. The pre-workout time calculation must handle midnight boundary (workout at 00:30 → pre-workout at 23:45 previous day — edge case, just show "take [X] minutes before your workout" without computing a specific time if the result crosses midnight).

---

### Phase R — Workout Day Hub (Full Architecture)

**Prerequisite:** None. Independent build. Auto-progression content (Phase U) can be added to Phase 2 cards after Phase U ships — Day Hub ships with placeholder ("Progression suggestions coming soon") if U isn't done yet.

This phase is fully specced in the Future Features section under "22. Workout Day Hub." This section adds the missing security specs, connection points, and exact file list.

**DB migrations required (in same session):**
```sql
-- 1. Add context field to stretch_logs
ALTER TABLE stretch_logs ADD COLUMN context TEXT CHECK (context IN ('pre_workout', 'post_workout', 'bedtime', 'standalone'));

-- 2. Add coaching_feedback_read_at to workout_logs
ALTER TABLE workout_logs ADD COLUMN coaching_feedback_read_at TIMESTAMPTZ;

-- 3. No new table needed — Day Hub reads from existing: workout_plans, workout_logs, workout_log_sets, stretch_logs, exercises
```

**New route:**
`GET /api/workouts/day-hub?date=YYYY-MM-DD` — returns:
- Today's plan day (exercises, sets, rep_ranges, context_notes from plan JSONB)
- workout_logs entry for today (if any) — completion status, HR zones, duration
- workout_log_sets for today's workout (for "previous session hints" fallback — pull last session for same day_label)
- stretch_logs for today (session_type + context)
- coaching response from workout_logs.ai_coaching_response (if exists)
- `proposed_actions` from localStorage — client-side only (not from this route)
`getUser()` — no is_disabled check (no AI call in this route itself).

**New page: `/life-hub/workouts/day/[dayIndex]/page.js`**
URL: `/life-hub/workouts/day/0` = Monday, `/life-hub/workouts/day/4` = Friday.
Optional `?date=YYYY-MM-DD` for historical read-only mode.

Active vs read-only mode: if `date` param is in the past → read-only. All "Start" buttons hidden. Phase status shown as final state.

**Updates to existing files:**
- `src/app/life-hub/workouts/page.js` — add date under each day card heading; tap on day card navigates to `/life-hub/workouts/day/[index]` instead of inline expand; add 4-dot phase progress indicator per day card; add weekly completion bar at top of page
- `src/app/life-hub/workouts/history/page.js` — restructure to week-grouped format; remove PR section; add "View Day →" links to Day Hub read-only mode
- `src/app/life-hub/workouts/exercises/page.js` — add "Your PR" section to detail modal: query `workout_log_sets` for max working set weight per selected exercise
- `src/components/LifeHubSidebar.js` — update Workouts dropdown: My Plan / History / Exercise Library / Stretch Reference (4 items, remove "Stretching & Mobility")
- `src/app/api/workouts/generate-plan/route.js` — add `context_note` per exercise to the generation prompt output format; stored in plan JSONB
- Retire `src/app/life-hub/workouts/stretching/page.js` (delete)
- Rename Stretch Library: `src/app/life-hub/workouts/stretching/library/page.js` → `src/app/life-hub/workouts/stretches/page.js`

**Security:**
- `?date=YYYY-MM-DD` param: validate format with `/^\d{4}-\d{2}-\d{2}$/` before any DB query. Reject malformed dates with 400.
- Historical Day Hub (read-only): the API route must verify ownership via `getUser()` and only return data for that user — no way to see another user's day by changing the date param
- `coaching_feedback_read_at`: only the row owner can update — protected by workout_logs RLS (`user_id = auth.uid()`)
- `context` column on stretch_logs: DB CHECK constraint enforces valid values; API also validates before insert
- `context_note` in plan JSONB: generated by AI (Claude), not user-supplied. Does NOT need `<user_input>` wrapping. It IS AI-generated content.

**Watch out for:**
1. Day index → date calculation: Monday of current week + `dayIndex` days. Must handle DST-safe. Use UTC date arithmetic.
2. `coaching_feedback_read_at` badge: only mark as read when the collapsible panel is opened in expanded state (not just when the page renders). Use an IntersectionObserver or a manual "expand" handler that fires the PATCH.
3. The "4-dot progress indicator" on the plan page reads from `stretch_logs` + `workout_logs`. This adds 2 extra queries per page load on the plan page. Batch them: single query `SELECT date, session_type, context FROM stretch_logs WHERE user_id = X AND date = today` covers all 4 stretch phases.
4. Phase 4 (bedtime stretches) completion: `stretch_logs` entry with `context = 'bedtime'` for today. The "Start Bedtime Stretches" button must pass `context=bedtime` as a query param to the stretch flow, and the stretch POST must include `context: 'bedtime'` in the insert.
5. Rest day Day Hub: the plan has rest days (`exercises: []`). Day Hub in rest-day mode shows a recovery note (static, not AI), light movement suggestion, and Phase 4 (bedtime stretches) only. No Phase 1/2/3.
6. History page restructure: week-grouping requires fetching all `workout_logs` (could be many rows). Paginate by fetching 8 weeks at a time. "Load more" button for older history.
7. Retiring the stretching page: any links within the app to `/life-hub/workouts/stretching` must be updated to the new Day Hub Phase 1/3 buttons. Search the codebase before deleting: `grep -r "workouts/stretching" src/`.
8. PR query in Exercise Library: `SELECT exercise_name, MAX(weight_lbs) as max_weight, MAX(created_at) as set_date FROM workout_log_sets WHERE user_id = X AND set_type = 'working' AND exercise_name = $1 GROUP BY exercise_name`. Weight of 0 (bodyweight) → show "Bodyweight" instead of "0 lbs".

---

### Phase S — Push Notifications + Three-Brief System + Callout Card Removal

**Prerequisites:** Phase P (daily_briefs.window column must exist). Phase Q ideally live first (brief quality).

**The three-brief UI on Life Hub home:**
Replace the current single brief card with three cards. State: whichever windows have generated today show their content; windows not yet generated show a placeholder.

```jsx
// Morning card — always show if generated, else show placeholder
<BriefCard
  window="morning"
  brief={briefs.morning}
  placeholder={`Morning brief generates at ${formatTime(wakeTime)}`}
  defaultExpanded={mostRecentWindow === 'morning'}
  accentColor="var(--accent-purple)"
  icon="☀️"
/>
// Afternoon card — show after wake_time + 7hr
{shouldShowAfternoon && (
  <BriefCard window="afternoon" brief={briefs.afternoon} ... />
)}
// Evening card — show after 6pm client-side
{currentHour >= 18 && (
  <BriefCard window="evening" brief={briefs.evening} ... />
)}
```

`BriefCard` component: collapsible, left border in window accent color (morning=purple, afternoon=yellow, evening=indigo), shows brief_text when expanded, "generated at X:XX" timestamp in footer, manual "🔄 Refresh" button fires POST on demand (1/day limit per window).

`mostRecentWindow`: determined by which brief was generated most recently (check `created_at` across the three rows). That window starts expanded; others start collapsed.

**Phase M technical spec:** Already fully documented in the "Phase M" section of the Master Build Plan above. Refer to that for VAPID keys, push_subscriptions table, service worker handlers, Edge Function logic, pg_cron schedules, and security design. This section adds only what's missing from that spec.

**Missing spec additions for Phase M:**

*`push_notification_log` table tweak:*
The existing spec shows `UNIQUE on (user_id, date(sent_at), window)`. Use TEXT date not `date()` function to avoid timezone issues: `UNIQUE(user_id, sent_date TEXT, window TEXT)`. Insert: `{ user_id, sent_date: estDateStr(), window: 'morning' }`.

*Three-brief pg_cron schedule (EST):*
```sql
SELECT cron.schedule('morning-brief', '0 13 * * *', $$SELECT net.http_post(...)$$); -- 8am EST (UTC-5 winter)
-- Afternoon brief: handled by check-in insight route → no pg_cron needed
SELECT cron.schedule('evening-brief', '0 0 * * *', $$SELECT net.http_post(...)$$);  -- 7pm EST
```
The Edge Function checks `goals_profiles.wake_time` and only generates if "now" is within 30 minutes of the user's personal window.

*Personalized timing check in Edge Function:*
```ts
const wakeHour = parseInt(wakeTime?.split(':')[0] ?? '7')
const currentHour = new Date().getUTCHours() - 5  // EST offset (simplified)
// Morning: generate if currentHour is within 1hr of wakeHour
// Evening: generate if currentHour is within 1hr of (bedtimeHour - 2)
```

**Callout cards to remove in this same session:**

| Card | File | Lines (approx) | Replacement |
|------|------|----------------|-------------|
| Micronutrient awareness card | `src/app/life-hub/nutrition/page.js` | ~120 lines | Absorbed into morning brief micronutrient section |
| Pre-workout meal advisor banner | `src/app/life-hub/nutrition/page.js` | ~30 lines | Afternoon brief fuel window section |
| Post-workout meal advisor banner | `src/app/life-hub/nutrition/page.js` | ~30 lines | Evening brief protein synthesis window section |
| Fatigue signal callout | `src/app/life-hub/workouts/page.js` | ~20 lines | Morning brief energy + recovery section |
| Hydration reminder banner | `src/app/life-hub/workouts/log/page.js` | ~25 lines | Afternoon brief hydration step-count section |
| Drink timing callout | `src/app/life-hub/health/water/page.js` | ~40 lines | Afternoon brief hydration timing section |

When removing: delete the JSX render, delete the associated state variables, delete the logic that computes whether to show them (e.g. `hydrationWarning` state + its fetch logic in `log/page.js`). Do NOT remove the underlying data fetches if the same data is used elsewhere on the page.

**Security (additions to Phase M spec):**
- Service worker: handle HTTP 410 Gone from push endpoint → DELETE from `push_subscriptions` table via a POST to `/api/push/subscribe` with method DELETE
- Handle HTTP 429 Too Many Requests from push service → log to `push_notification_log` with `delivered: false`, don't retry
- VAPID keys: document clearly in env var setup that `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is safe to expose; `VAPID_PRIVATE_KEY` is secret and must be in BOTH Vercel env vars and Supabase Edge Function secrets
- Brief text generated by Claude for push notification body: truncate to 90 characters max (lock screen display limit). Extract first sentence from `brief_text`.
- iOS Safari push: only works if installed as PWA ("Add to Home Screen"). Show this explicitly in the Settings notification UI: "On iOS, push notifications require installing the app from Safari → Share → Add to Home Screen."
- Brief manual refresh: rate limit the manual "🔄 Refresh" to 1/day per window (separate from scheduled generation). Track in `api_rate_limits` with key `'daily-brief-refresh-morning'` / `'daily-brief-refresh-evening'`.

**Watch out for:**
1. The afternoon brief (check-in insight upserted to daily_briefs) may fire at different times for different days — morning users at 3:30am have their "afternoon" check-in around 10:30am. The brief card must check the `created_at` timestamp, not assume 1pm.
2. pg_cron + DST: UTC-5 in winter, UTC-4 in summer. Fixed UTC times means morning brief shifts 1 hour. Acceptable — document this. Alternatively, use `AT TIME ZONE 'America/New_York'` in the Edge Function timestamp comparison.
3. Multiple devices: when a user has 2 subscriptions (phone + tablet), the Edge Function loops both and sends to both. Both will show the notification. This is correct behavior — user gets it on whichever device they have.
4. Service worker update: if `public/sw.js` already exists (it does — installed as PWA), APPEND the push handlers. Don't replace the file. Read it first, verify no duplicate `push` event listener before adding.

---

### Phase T — Sleep Debt Stat Card

**Prerequisites:** None (brief content for sleep debt is baked into Phase S brief prompts; this phase adds the visual card to the Sleep Tracker page).

**What to build:**
- Single stat card on `/life-hub/health/sleep/page.js` — add as a 4th stat card alongside "Total Sleep," "Deep Sleep," "REM"
- Card label: "Sleep Debt" · Value: e.g. "3.5 hrs" · Color: green (0–1hr), yellow (1–3hrs), red (3+hrs)
- Formula: `SUM(target_sleep_hours - actual_sleep_hours)` for last 7 days, floored at 0. `actual` = `total_duration_minutes / 60` from `health_sleep_sessions`. `target` = `goals_profiles.sleep_hours` (default 8 if null).
- Fallback for non-Health users: sum `(target - daily_checkins.sleep_hours)` for last 7 days. If both sources null → hide card entirely.
- ℹ️ chip on the card: "Short-term sleep debt accumulates over 7 days. 2–3 nights of full sleep typically clears most of it — recovery is faster than the debt built up."

**Security:** No AI call, no user-supplied input, no new DB table. Pure read of existing data. Standard `getUser()` at route level (if this becomes a route) or handled client-side (preferred — same Supabase client already initialized on the page).

**Watch out for:**
- If `health_sleep_sessions` has no data for some days within the 7-day window (user didn't wear watch), those days contribute their full target to the debt calculation — that overstates the debt. Better to only include days where data EXISTS. Formula: `SUM(target - actual) WHERE actual IS NOT NULL`, capped at 7 days.
- `sleep_hours` from `daily_checkins` is self-reported — less accurate than Health data. Show a footnote "(based on self-reported sleep)" when using the checkin fallback.

---

### Phase U — Workout Volume Tracking + Auto-Progression

**Build together — same `workout_log_sets` data, same session.**

**Volume Tracking:**
- New function in the Weekly Wrap API (`weekly-wrap/route.js`): compute total volume load per muscle group for the week. Formula: `SUM(weight_lbs × reps) WHERE set_type = 'working'` joined to `exercises` on `exercise_name` for `body_part`. Add to `report_data` JSONB as `volume_by_muscle`.
- Volume chart on History page (after Day Hub is built): simple grouped bar chart (chest/back/legs/shoulders/arms) showing current week vs 4-week average. Inline in the history page weekly group header.
- coach_memory Edge Function addition: add volume computation to the 90-day data query. Write observations about persistent imbalances.

**Auto-Progression:**

New helper function in the workout log page or a shared utility: `computeProgressionSuggestions(exerciseName, lastTwoSessions)`

```js
function computeProgressionSuggestions(exerciseName, sessionA, sessionB) {
  // sessionA = older, sessionB = more recent
  const workingSetsA = sessionA.filter(s => s.set_type === 'working' && s.exercise_name === exerciseName)
  const workingSetsB = sessionB.filter(s => s.set_type === 'working' && s.exercise_name === exerciseName)
  if (!workingSetsA.length || !workingSetsB.length) return null
  
  const weight = workingSetsB[0]?.weight_lbs
  const repRangeParts = (workingSetsB[0]?.rep_range ?? '').split('-')
  const topOfRange = parseInt(repRangeParts[1] ?? repRangeParts[0])
  if (isNaN(topOfRange)) return null
  
  const cleanB = workingSetsB.every(s => s.reps >= topOfRange)
  const cleanA = workingSetsA.every(s => s.reps >= topOfRange) && workingSetsA[0].weight_lbs === weight
  
  if (!cleanA || !cleanB) return null
  
  const increment = ['legs', 'glutes', 'hamstrings'].includes(bodyPart) ? 10 : 5
  return { exerciseName, currentWeight: weight, suggestedWeight: weight + increment, readySince: sessionA.date }
}
```

**Where suggestions surface:**
1. Day Hub Phase 2 (workout phase) — each exercise card shows a small "↑ Try [X]lbs" chip if a progression suggestion exists. Chip is tappable to see explanation.
2. Morning brief on training days — coach_memory includes the progression observation (generated by weekly Edge Function); brief cites it.
3. Post-workout completion screen — if any exercise was progression-ready AND the user matched or exceeded the suggested weight, note it: "Barbell rows at 190lbs — that's your first session at the new weight."

**Data fetch for suggestions:**
On Day Hub load, fetch the last 2 `workout_logs` entries for the same `day_label` (e.g. last 2 "Pull Day" sessions). Join with `workout_log_sets` for both sessions. Run `computeProgressionSuggestions` for each exercise in today's plan. Store results in component state.

**Security:**
- Rep range string parsing: `split('-')`, `parseInt()` — both must handle null/undefined gracefully with `?? ''` and `isNaN()` guards
- Progression suggestions never write to `workout_plans` — component state only
- Volume computation in Weekly Wrap: bodyweight exercises (`weight_lbs = 0`) tracked separately as rep count, not included in lbs-based volume total

**Watch out for:**
1. "2 consecutive sessions for the SAME exercise" — not 2 calendar sessions. Must filter `workout_log_sets` by `exercise_name` AND by the `day_label` that includes that exercise. A user who trains Push twice a week needs 2 Push sessions, not just any 2 sessions.
2. Weight comparison between sessionA and sessionB: sessions only count as "consecutive at the same weight" if `workingSetsA[0].weight_lbs === workingSetsB[0].weight_lbs`. A user who already went up in weight between the two sessions doesn't need another nudge.
3. Volume chart must handle exercises with no matching `exercises` table entry (custom exercises added mid-workout). Group these as "Other" in the volume breakdown rather than crashing.

---

### Phase V — Food Logging Streak

**Independent. Short build — no new DB table, no AI.**

**Implementation:**
- On nutrition page load, client fetches `SELECT DISTINCT date FROM food_log_entries WHERE user_id = X ORDER BY date DESC LIMIT 60` via existing Supabase client
- Walk backward from today counting consecutive days where log appears (existence check — any entry that day counts)
- "Logged" definition: `date appears in the result set`. Simple — no calorie threshold needed (even logging one coffee counts as "active day"). This avoids punishing users who had a light day.
- Display: small "🔥 [N] day streak" chip in the nutrition page header, next to the date picker
- Personal best: `localStorage.getItem('food_log_streak_best')`. Compare on load. If current > stored, update + show a one-time toast: "🏆 New record — [N] days straight"
- If streak = 0 or 1: don't show the chip (no need to call attention to no streak)
- If streak ≥ 3: show the chip

**Brief/coach_memory integration:**
The weekly coach_memory Edge Function already reads `food_log_entries`. Add: count distinct logging days per week, split weekday vs weekend. Write observation if pattern is clear (e.g. "Logs consistently Mon–Fri but rarely Sat–Sun — weekend data is likely incomplete").

**Security:** No user input, no AI call, no new DB writes. Client-side `localStorage` for personal best — not sensitive. Standard `getUser()` at page level already applies.

**Watch out for:**
- "Today" must be EST date, not UTC. Use the existing `estDateStr()` pattern.
- The DISTINCT date query should include a date range filter (last 60 days) to prevent O(n) scans on large `food_log_entries` tables.
- Don't show "streak broken" text. Simply show the current streak number. Absence is neutral.

---

### Phase W — Goal Velocity

**Independent. Does not require Goals 2.0 — uses existing goals_profiles data.**

**What to build:**
New card on `/life-hub/goals/measurements/page.js` below the weight chart, titled "📈 Weight Trajectory."

**Data required:**
- `body_measurements`: `weight_lbs` + `date`, last 90 days, ordered by date ASC
- `goals_profiles`: `target_weight_lbs`, `goals[]` (to check if weight goal applies)

**Display logic:**
```
≤ 3 data points: "Log your weight a few more times to see your trajectory"
No target_weight_lbs set: "Set a target weight in Goals Setup to see your trajectory"
goals[] doesn't include weight-related goal: don't show this card
```

**Trajectory calculation (linear regression):**
```js
function linearRegression(points) { // points = [{ x: dayIndex, y: weight }]
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)  // lbs/day
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

const lbsPerWeek = slope * 7
const currentWeight = latestMeasurement.weight_lbs
const weeksToGoal = Math.abs(currentWeight - targetWeight) / Math.abs(lbsPerWeek)
const estimatedDate = new Date(Date.now() + weeksToGoal * 7 * 24 * 60 * 60 * 1000)
```

**Card content:**
- Current pace: "[+/-]X.Xlbs/week over the last [N] weeks"
- Projection: "At this pace, you'll reach [targetWeight]lbs by approximately [Month Year]"
- If pace going wrong direction: "Your weight is trending in the opposite direction of your goal. Recent data is [X measurements] — if this is accurate, reviewing your nutrition targets may help."
- Never say "you're behind" — reframe as "the trend tells us you'll get there in [N] weeks at current pace"
- If `lbsPerWeek` near 0 (< 0.1 abs): "Your weight has been stable over the last [N] weeks — recomposition may be happening (muscle gain offsetting fat loss). Check your measurements for more signal."

**Security:**
- Weight data is personal health data — never log to console
- Linear regression is client-side math — no AI call, no DB write
- Minimum data guard: `if (weights.length < 4) return <placeholder />` — prevents meaningless projections from 1–2 data points

**Watch out for:**
1. Outlier measurements (e.g. 195lbs one day, 165lbs next from a typo) massively distort linear regression. Apply a simple outlier filter: exclude any measurement more than 10 lbs from the 7-day rolling average before regressing. Or just use median-based smoothing.
2. The projection breaks when `lbsPerWeek` is near 0 (division by near-zero). Guard: if `Math.abs(lbsPerWeek) < 0.05`, show the "weight stable" message instead of projecting.
3. Weight goals: check `goals_profiles.goals` array for values like `'lose_weight'`, `'gain_weight'`, `'maintain'`. The card is irrelevant for `'maintain'` (no target to project toward) — hide it.
4. Recomp signal: if waist measurement is trending down AND weight is flat → show "Recomposition signal: your waist is shrinking while weight holds. This is the goal working — muscle is replacing fat." This is higher value than a velocity projection in this case.

---

---

### Cross-Phase Security Audit

Items that apply across ALL remaining phases:

| Rule | Applied to |
|------|-----------|
| `getUser()` not `getSession()` on all routes | Phase P (evening brief), Phase Q (my-week API), Phase R (day-hub API), Phase S (push/subscribe) |
| `is_disabled` check before any AI call | Phase P (evening brief POST), Phase S (brief Edge Functions — check before generating) |
| User free text in `<user_input>` tags | Phase Q (commitments, day_notes in all brief injections), Phase Y (my_week commitments in Edge Function) |
| New DB table = RLS in same migration | Phase Q (my_week), Phase S (push_subscriptions, push_notification_log) |
| Rate limit on all AI routes | Phase P (1/day per window), Phase S (1/day per window for manual refresh) |
| No `SELECT *` in production queries | Phase R (day-hub route), Phase U (workout_log_sets query) — select only needed columns |
| Validate URL params before DB use | Phase R (`?date=` param), Phase Q (`?week=` param) |
| Never log health data to console | All phases — no `console.log(weight, steps, sleep_score, hrv)` |

### Post-Build: CLAUDE.md and build-notes.md Updates Required Per Phase

Each phase must update both files in the same commit:

| Phase | CLAUDE.md changes | build-notes.md changes |
|-------|------------------|----------------------|
| P | Update `daily-brief/route.js` description (add window param) | Move Phase O spec to Phase Log |
| Q | Add `my_week` table to DB Tables section; add `/life-hub/my-week/page.js` to directory; remove meal-plan/page.js; update sidebar description; remove weekly_schedule UI from goals/page.js note | Add `my_week` to Database Tables; move My Week spec to Phase Log; update Future Features (remove Meal Plan references) |
| R | Update workouts section (Day Hub page, stretches URL, sidebar 4 items); mark stretching/page.js as retired | Move Day Hub spec to Phase Log; update workout_logs table (coaching_feedback_read_at); update stretch_logs table (context column) |
| S | Add push_subscriptions + push_notification_log to DB Tables; add daily-push Edge Function; update daily_briefs table description (window column) | Move Phase M spec to Phase Log; update daily_briefs table description; update Security Status table (add push notification security rows) |
| T | Update sleep/page.js description | Phase Log entry |
| U | Update weekly-wrap/route.js description; update history/page.js description | Phase Log entry |
| V | Update nutrition/page.js description (streak chip) | Phase Log entry |
| W | Update measurements/page.js description (trajectory card) | Phase Log entry |
| X | Update nutritionUtils.js exports (NUTRIENT_UNITS, formatNutrientWithDV) | Phase Log entry |
| Y | Update generate-coach-memory Edge Function description | Phase Log entry |

**Standing Rule (enforced every session):** Before finalizing any new feature spec, scan ALL existing Future Features items and the extended queue below. If a new idea correlates with, conflicts with, duplicates, or depends on anything already specced → STOP. Ask the user before writing anything new. This prevents designing features in isolation that later fight each other or unknowingly duplicate work.

---

### Step 21 — Goal Progress Velocity (G)

**Status:** 💬 Discussed — Design session required before building. See design notes below.

**The core value:** Right now, goals are labels ("lose weight"). The user picks a goal, sees a TDEE number, and has no visibility into whether they're on pace, off pace, or pointed at the wrong target entirely. Goal velocity turns that label into a live trajectory: "At your current rate, you'll reach your target weight in 19 weeks. You're 3 weeks ahead of schedule."

**The problem that must be solved first — Goals 2.0:**
Current goals setup captures labels, not computational targets. "Lose weight" with a target weight of 180lbs set 6 months ago may no longer reflect what the user actually wants. Before projecting velocity toward a goal, the goal itself must be well-defined, understood by the user, and confirmed by the AI.

**Why a separate design session is required before building:**
- Users often set a goal without understanding what it implies (1lb/week loss = 500 cal deficit/day permanently)
- Users who don't have tracking tools (food scale, tape measure, smart watch) may have goals that require data they can't produce
- AI-assisted goal confirmation is the right UX but needs careful design — see Goals 2.0 notes below

**What Goal Velocity includes (once Goals 2.0 is ready):**
1. **Weight trajectory card** on the Goals/Measurements page: plot actual weight measurements against a projected trend line toward target weight. Show weeks ahead/behind. If no weight data for 14+ days, show "Update your weight to see your trajectory" prompt.
2. **Pace signal in Daily Brief:** "You're averaging -0.6lbs/week over the last 4 weeks. Your target is -1.0lbs/week. Closing the gap is a protein + deficit alignment issue — you're hitting your calorie target but protein often falls short, which affects muscle retention during loss."
3. **Recomp signal:** If waist is trending down AND arms are trending up AND weight is flat → "You're in active recomposition. Don't chase the scale right now — this is the goal working."
4. **Velocity formula:** Use last 28 days of weight measurements (minimum 4 data points). Linear regression gives lbs/week rate. `weeksToGoal = (currentWeight - targetWeight) / rate`. Show as range (min/max based on variance in the trend).

**Watch out for:**
- Negative velocity framing: never show "you're 8 weeks behind" without context. Always explain why (data gap, plateau, diet adherence pattern) and what one action closes the gap.
- Missing data: if user has 0–3 weight measurements, don't project — show "log weight a few more times to see your trajectory."
- Users not on a weight goal: velocity doesn't apply to "build strength" or "run a 5k" goals — skip the weight trajectory card entirely for those users. Show a strength velocity metric instead (PR progression rate for main lifts).

---

### Goals 2.0 Design Notes (prerequisite to Step 21 + long-term foundation)

**Status:** 💬 Design discussion required. Do not build Goal Velocity until this is resolved.

**The problem with current goals setup:**
- User picks "lose weight" + enters a target weight → system computes TDEE − deficit → done
- No confirmation that the user understands what that deficit means in practice
- No account for users who don't have the tools to track progress accurately
- No clarifying questions — user says "lose weight" and AI accepts it as a complete goal
- Goals can be set once and become stale (target set 6 months ago at a different weight)

**What Goals 2.0 must solve:**

*1. AI-assisted goal clarification (chat interface):*
Instead of dropdowns → user types a free-form goal statement in a text field: "I want to lose belly fat and get stronger."
AI responds with clarifying questions:
- "When you say lose belly fat, are you focused on the scale going down, or more on your waist measurement shrinking? These are related but the best strategy differs slightly."
- "You mentioned getting stronger — are you currently lifting weights, or would you be starting from scratch?"
User answers each question conversationally. AI synthesizes answers into computational targets before saving.
Before saving, AI shows a confirmation card: "Based on what you told me: [exact strategy]. Does this match what you're going for?"
User confirms → goals_profiles updated. User corrects → AI asks one more follow-up.

*2. Equipment/access awareness:*
AI must ask: "Do you have a food scale to weigh portions?" → If no → calorie targets are estimates; logging accuracy will be lower; AI must caveat nutrition commentary accordingly and not make precise statements about deficits.
"Do you have a tape measure?" → If no → body measurement goals can't be tracked; AI must note this and suggest proxy measures (how clothes fit, photos).
"Do you have a bathroom scale?" → If no → weight trajectory (Step 21) is impossible; AI must route around it.
Store these as boolean fields on `goals_profiles`: `has_food_scale`, `has_tape_measure`, `has_bathroom_scale`. All three default to `true` for existing users (assume they have the basics). AI commentary adjusts based on these flags throughout the app.

*3. Regular goal re-confirmation:*
Once per month (or triggered by significant weight change), the Daily Brief (or a separate prompt) should ask: "You set your goal 6 weeks ago to reach 175lbs by April. You're at 181lbs now — do you want to update your target or timeline?"
This is a brief-level check-in, not a full setup re-run. One question, one answer, one DB update.

*4. Concern documented — users not understanding implications:*
When a user says "I want to lose 20lbs in 3 months," AI must be honest: "That's about 1.7lbs/week, which requires a ~850 calorie/day deficit. Most people find that difficult to sustain without hitting hunger. A more comfortable pace is 0.5–1.0lbs/week — would you prefer a longer timeline at a less aggressive deficit?" Let user decide but make the math visible.

**Not building yet.** Before Goals 2.0 is built, plan a dedicated design session covering the exact conversation flow, the data model changes, and how it integrates with the existing 5-step setup page.

---

### Step 22 — Sleep Debt Tracking (E)

**Status:** 📋 Specced, ready to build after Phase O (evening brief + daily_briefs migration)

**What it does:**
Accumulates a running "sleep debt" balance based on actual sleep vs the user's target (`goals_profiles.sleep_hours`). Displays it in the morning brief and optionally on the Sleep Tracker page.

**Formula:**
```
sleepDebtTonight = target_sleep_hours - actual_sleep_hours (last night)
rollingDebt7Day = sum of (target - actual) for last 7 days, floored at 0
```
A debt of 0 means the user is caught up or ahead. A debt of 5 hours means they've averaged 42 minutes short per night this week.

**Data source:** `health_sleep_sessions` for users with Google Health connected. `goals_profiles.sleep_hours` as the target. For users without Google Health: use the `sleep_hours` field from `daily_checkins` (manual entry). If both are null, skip sleep debt calculation entirely.

**Where it surfaces:**

*Morning brief:*
- Debt < 1 hour: mention briefly if relevant to low energy check-in. "Your sleep has been on target this week."
- Debt 1–3 hours: "You're carrying about [X] hours of sleep debt from the past week. This tends to compound — energy and focus dip more each day it accumulates."
- Debt > 3 hours: leads the morning section. "You're carrying [X] hours of sleep debt from this week. That's the main driver of how you're likely feeling right now. One night of good sleep recovers about 25–30% of short-term debt — tonight matters more than usual."

*Missing check-in data (no morning energy rating):*
If it's past noon and no morning check-in was logged AND sleep debt > 2 hours, the afternoon brief should note: "I noticed you didn't do a morning check-in — if today has felt off, that's likely the sleep debt talking."
**Do not show a prompt asking for the missed morning check-in.** That's annoying. Just acknowledge it in the afternoon brief naturally.

*Sleep Tracker page:*
Add a "Sleep Debt" stat card showing `rollingDebt7Day` with a color indicator: green (0–1hr), yellow (1–3hrs), red (3+hrs). Include a one-line ℹ explanation: "Short-term sleep debt (accumulated over 7 days) affects reaction time, hunger hormones, and recovery. It recovers faster than chronic debt — 2–3 nights of full sleep typically clears it."

**Watch out for:**
- `sleep_hours` from `daily_checkins` is the user's self-reported actual sleep — it's already in hours (NUMERIC 4,1). `health_sleep_sessions` stores total_duration_minutes. Convert: `actual_hours = total_duration_minutes / 60`.
- Don't inject sleep debt into every AI route — it only belongs in the morning brief, afternoon brief (debt > 2 hours), and evening brief (debt > 3 hours, because tonight matters). Don't inject into nutrition commentary, workout coaching, etc.
- HRV is bonus data for sleep quality context but sleep debt calculation uses duration only. HRV can accompany the callout but is not part of the debt formula.

---

### Step 23 — Workout Volume Tracking (A)

**Status:** 📋 Specced, ready to build after Day Hub (Step 22 in existing queue)

**The problem:** Current workout history shows sessions and PRs but has no concept of volume over time. A user training harder this month than last month has no visibility into that — the data is there but unread.

**What it adds:**
1. **Weekly volume metric:** Total sets × weight × reps (volume load) per muscle group per week. Stored in coach_memory as a baseline ("User's baseline weekly back volume is ~12,000 lbs — current week is 14,200 lbs, tracking 18% above baseline").
2. **Volume trend in Weekly Wrap:** "Your total training volume this week was 42,000 lbs across all exercises — up 15% from your 4-week average. That's a meaningful increase; watch recovery signals this week." Requires `workout_log_sets` data already collected.
3. **Volume-by-muscle-group chart on history page:** Simple bar chart — chest/back/legs/shoulders/arms per week, 4-week comparison. Shows if the user is consistently under-training a group.
4. **Coach Memory integration:** The weekly Edge Function reads `workout_log_sets` and computes per-muscle-group volume. Writes observations like "Leg volume (12,000 lbs avg) is consistently 40% lower than push volume (20,000 lbs avg) — potential imbalance building." This feeds into Daily Brief and weekly wrap commentary.

**Data already collected:** `workout_log_sets` has `exercise_name`, `weight_lbs`, `reps`, `set_type`. Volume formula: `SUM(weight_lbs × reps) WHERE set_type = 'working'` per muscle group per week. Muscle group can be derived from joining to `exercises` table on `exercise_name`.

**Watch out for:**
- Bodyweight exercises have `weight_lbs = 0`. Volume for push-ups = 0 × reps = meaningless. Use rep count as a proxy for bodyweight exercises: track reps only, don't mix with weighted volume in the same chart.
- Exercise names in `workout_log_sets` are denormalized strings. The join to `exercises` table must handle name mismatches (mid-workout added exercises, custom names). Best approach: fuzzy match or just skip unmatched exercises rather than crash.

---

### Step 24 — Workout Plan Auto-Progression (C)

**Status:** 📋 Specced, ready to build in same session as Step 23 (they share data patterns)

**Design principle:** Auto-progression must be a suggestion, never automatic. The user controls their plan. The AI notices when progression may be appropriate and presents it on the Day Hub completion screen or in the morning brief.

**Rep consistency signal (the correct readiness indicator):**
- Do NOT use post-workout difficulty rating to judge individual exercise readiness. Difficulty is workout-level (how the whole session felt), not exercise-level.
- Instead: track completion rate per exercise across the last 2 sessions.
- "Clean completion" = user hit the TOP of the rep range on ALL working sets for that exercise in that session.
- "Near completion" = hit the top on 2/3 or more working sets.

**Progression rules:**
```
2 consecutive clean completions at current weight → suggest adding weight (5lbs for upper body, 10lbs for lower body as defaults)
2 consecutive clean completions + post-workout difficulty was 5/5 (max effort) → suggest progression but note "you know it's possible — hold one more session to confirm it's repeatable, not a peak day"
Rep count declined across sets within a session (e.g. 12 → 10 → 8) → not ready; hold current weight
Rep count inconsistent across sessions → not ready; hold
```

**Where the suggestion surfaces:**
1. **Morning brief (training day):** "Yesterday's bench press — you hit 12 reps on all 3 sets at 135lbs. That's two consecutive clean completions. You may be ready to move to 140lbs."
2. **Day Hub workout phase:** Each exercise card shows "Suggested: ↑ to 140lbs" chip next to the exercise name on progression-ready exercises. This is the primary surface — it's right where the user plans their sets.
3. **Post-workout completion screen:** "You hit 12/12 on all bench sets again. Moving to 140lbs next session looks right."

**The suggestion is the deliverable — not an auto-update.** Suggestions live in component state. If the user wants to apply it permanently, they use the existing "Edit Plan" flow or regenerate a plan section. The suggestion does NOT write to `workout_plans`.

**Data needed:**
- `workout_log_sets`: last 2 sessions per exercise, set_type='working', weight_lbs, reps, rep_range
- Parse `rep_range` (stored as "8-12" format) to get `topOfRange`
- Clean completion: all working sets have `reps >= topOfRange`

**Coach Memory integration:**
When a progression suggestion is generated, the weekly Edge Function writes it to coach_memory: "User has hit clean completions on barbell rows at 185lbs for 2 sessions. Progression to 190lbs is recommended." This way the morning brief can reference it without recomputing from raw set data each time.

**Watch out for:**
- Rep range parsing: "8-12" → `parseInt('12')`. Handle edge cases ("8" single number, "AMRAP", null).
- "2 consecutive sessions" means 2 training days for that specific exercise — not 2 calendar days. An exercise trained once/week needs 2 training weeks.
- Deload weeks: if coach_memory notes user is fatigued or sleep debt is > 3 hours, suppress progression suggestions for that day even if the rep data says ready.

---

### Step 25 — Food Logging Streak (I)

**Status:** 📋 Specced, low complexity, high motivation value

**The problem:** There's no positive feedback loop for consistent logging. Users who log 5 days straight have no visibility into that consistency, and no gentle signal when the streak breaks.

**What it adds:**
1. **Logging streak counter** on the Nutrition page (near the page header or under the calorie ring): "🔥 7-day logging streak." Definition: "logged" = 3+ food entries OR 1,200+ calories logged for that day. Not punitive — one missed day breaks the streak but doesn't erase history.
2. **Personal best badge:** "🏆 New record — 21 days straight" when user beats their previous longest streak. Shown once per new record as a brief toast.
3. **Streak context in coach_memory:** The weekly Edge Function notes logging consistency patterns. "User logs consistently on weekdays (87% of days) but drops to 23% on weekends. Weekend log gaps mean weekend nutrition data is unreliable." This gets injected into Daily Brief and Monthly Wrap automatically.
4. **Daily Brief nudge (when streak at risk):** If it's 7pm and no food logged today AND user has a 5+ day streak, the evening brief includes: "You haven't logged yet today — worth a quick backfill if you're tracking. Your [N]-day streak is still active until midnight."

**Implementation:**
- Streak computed client-side from `food_log_entries` query on nutrition page load: `SELECT DISTINCT date FROM food_log_entries WHERE user_id = X ORDER BY date DESC`. Walk backwards from today counting consecutive days where `entries.length >= 3 OR total_calories >= 1200`.
- Personal best: store in `localStorage` as `food_log_streak_best` (an integer). On each load, compare current streak to stored best. If current > stored best → update localStorage + show toast.
- No new DB table needed. Streak is computed from existing data.

**Watch out for:**
- Timezone: `date` in `food_log_entries` is the user's local date (EST stored as text). Comparing "today" to the most recent logged date must use the same timezone reference.
- Don't show "streak broken" as a negative message. Simply reset the counter. The streak is a positive signal; its absence is just neutral.

---

### Step 26 — Phase M: Push Notifications + Three-Brief System

**Status:** 📋 Fully Specced (see Master Build Plan Phase M above for complete technical spec)

**Prerequisites before building:**
1. Phase O must be built first — `daily_briefs` UNIQUE constraint migration from `(user_id, date)` to `(user_id, date, window)`. This is a breaking change.
2. Evening brief route and content must exist before M-B wires push into it.

**Phase M-0 — daily_briefs schema migration (prerequisite):**

```sql
-- Step 1: add column with default (safe — no constraint yet)
ALTER TABLE daily_briefs ADD COLUMN window TEXT DEFAULT 'morning';

-- Step 2: backfill all existing rows
UPDATE daily_briefs SET window = 'morning';

-- Step 3: drop old unique constraint
ALTER TABLE daily_briefs DROP CONSTRAINT IF EXISTS daily_briefs_user_id_date_key;

-- Step 4: add new unique constraint
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_user_id_date_window_key UNIQUE (user_id, date, window);

-- Step 5: add check constraint
ALTER TABLE daily_briefs ADD CONSTRAINT daily_briefs_window_check CHECK (window IN ('morning', 'afternoon', 'evening'));
```

All 5 steps in ONE migration — never split them (step 4 fails if step 2 didn't run first).

**Files that touch `daily_briefs` and must be updated in the same migration commit:**
- `src/app/api/life-hub/daily-brief/route.js` — GET: add `?window=` param (default 'morning'); POST: accept `window` in body, include in upsert with new `onConflict: 'user_id,date,window'`
- `src/app/life-hub/page.js` — add `?window=morning` to brief fetch
- Any future evening/afternoon brief generators inherit the new schema automatically

**Summary of remaining Phase M work:** See the full Phase M spec in the Master Build Plan section above. It covers M-A (VAPID keys, push_subscriptions table, subscribe route, Settings UI, service worker), M-B (wiring push sends into brief generators), and M-C (nudge Edge Function). All of that spec stands — the Phase M-0 migration documented here is the additional prerequisite discovered when designing the three-brief system.

---

### Step 27 — Coach Memory Edge Function Upgrade

**Status:** 💬 Discussed, spec in progress

**Current state:** The `generate-coach-memory` Edge Function runs weekly and generates 5–10 observations. It works but doesn't yet benefit from My Week data (Step 28) or the extended brief system (Step 26).

**What this step adds:**

*A. My Week context injection:*
Once My Week (Step 28 below) is built, the Edge Function should read the user's My Week entry for the current week and inject it as additional context. This allows observations like: "User's My Week shows they have commuting commitments on Tuesday and Thursday — their workout logging gaps on those days are schedule-driven, not motivation gaps."

*B. Brief pattern analysis:*
After 4+ weeks of morning briefs existing, the Edge Function should analyze patterns in what the brief has been noting repeatedly. If the morning brief has mentioned "protein under target" 12 of the last 14 days, that's a persistent pattern worth a coach_memory observation. The Edge Function currently doesn't read `daily_briefs` — add it to the 90-day data pull.

*C. Conversation signal integration:*
When the Keep Talking chat feature (Phase H) has accumulated conversation data, the Edge Function should read any signals stored from those conversations (applied suggestions, push-backs, body part mentions). This bridges ephemeral conversations into long-term memory. Requires a `conversation_signals` table or similar — defer this part until Phase H has been live for a few weeks.

---

### Step 28 — My Week Page (replaces existing Meal Plan page)

**Status:** 💬 Discussed, design complete, ready to spec for building

**Decision:** The existing `/life-hub/nutrition/meal-plan` page (food-only weekly planning grid) is retired entirely and replaced by "My Week" — a broader weekly context hub that becomes the primary input for all brief windows. This is not an upgrade to meal plan; it is a different feature with a different purpose.

**What My Week is:**
A place where the user tells the AI what their week looks like BEFORE it happens. Not after-the-fact logging — forward-looking context. The AI uses this as the primary context lens for all three brief windows throughout the week.

**What users enter in My Week:**

```
For each day of the week:
  - Estimated meal times (breakfast: 7am, lunch: 12pm, dinner: 6:30pm)
  - Workout time (if workout day): specific time + duration estimate
  - Work schedule: which activity type (from existing weekly_schedule field — pulls in automatically)
  - Other commitments: short text field ("dentist at 2pm", "kids' soccer at 5pm", "long commute Tuesdays")
  - Notes/context: anything else the AI should know ("planning to eat out for dinner Wednesday", "might be traveling Friday")
```

**Why this matters for AI quality:**
Without My Week:
- Morning brief: "You have a workout today."
- With My Week: "Your workout is at 6pm today. You have a dentist at 2pm and dinner planned out. That means your pre-workout fuel window is 3:30–4:30pm — you want 30–40g carbs in that window. Your dental appointment is before that, so eat before 1pm."

The specificity difference is the difference between a generic AI response and a genuine personal assistant.

**How briefs use My Week data:**
My Week entry for the day is fetched alongside all other brief context. Every brief window gets:
- `scheduled_meal_times` (breakfast/lunch/dinner as HH:MM strings)
- `workout_scheduled_at` (HH:MM or null)
- `commitments` (free text)
- `day_notes` (free text)

These are injected into the brief system prompt as: "TODAY'S SCHEDULE (user-provided): [formatted schedule block]"

**UI design:**
- Week view (Mon–Sun columns) with date headers
- Each day column has expandable sections: ⏰ Meal Times, 🏋️ Workout, 📅 Commitments, 📝 Notes
- Quick-fill patterns: "Same as last week" button copies previous week's entry
- Workout time auto-populates from today if a workout was logged at that time last week (learning pattern)
- Overview card at the top of Life Hub home: "This week at a glance" — shows committed times and any notes for today

**DB:**
```sql
CREATE TABLE my_week (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  week_start DATE NOT NULL,  -- always Monday
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mon
  breakfast_time TIME,
  lunch_time TIME,
  dinner_time TIME,
  workout_time TIME,
  workout_duration_min SMALLINT,
  commitments TEXT,
  day_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, day_of_week)
);
ALTER TABLE my_week ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON my_week USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Sidebar placement:** Under Overview section (alongside Dashboard, Weekly Wrap, Monthly Wrap). Remove "Meal Plan" from Nutrition dropdown entirely (the page is retired).

**Existing meal_plans + meal_plan_entries tables:** Keep them for now (don't drop). The food-level meal planning that was on that page is not being migrated anywhere — it's just retired. If users want food planning, they use the Nutrition → Food Log. The meal plan data remains in the DB but the UI is removed.

**Watch out for:**
- `week_start` must always be Monday. Use the same `getMonday()` helper already in the weekly-wrap route.
- My Week data becomes stale quickly (what you planned Monday may change by Wednesday). The brief should read it but never present it as "what happened" — always frame it as "what you had planned." Distinguish: "You had dinner scheduled for 6:30pm — if you ate around then, that timing is solid for muscle protein synthesis overnight."
- The food-level meal plan grid (the part being retired) will break if anything still imports from `meal_plans` or `meal_plan_entries`. Audit before removing the page.
- `commitments` and `day_notes` are user-supplied free text → wrap in `<user_input>` tags in all AI prompts.

---

### Brief Format Spec — Extended Depth Guidelines

**Status:** 📋 Design approved. Apply when building Phase M (three-brief system) and any brief content upgrades.

**Approved length targets:**
- Morning brief: ~500–700 words (substantially longer than the current single-paragraph format)
- Afternoon brief: ~400–500 words
- Evening brief: ~400–500 words

The existing brief is too conservative — the AI has access to rich data but underuses it. The goal is a brief that feels like reading a note from a coach who actually studied your week, not a quick summary card.

**What each window must include:**

**Morning brief — required sections (in this order):**

1. *Sleep + recovery opening:* Sleep score, resting HR, HRV if available. Translate these into plain English: "Last night was a 68 — your body got solid deep sleep (72 minutes) which is above your average. HRV held at 44ms, which is in your normal range. Recovery looks good."
2. *Sleep debt context (if accumulated):* Reference Step 22. "You've had a tough sleep week — cumulative debt around 3.5 hours since Monday. Today will likely feel better than yesterday but not your sharpest."
3. *Work schedule context:* Read `weekly_schedule` for today's day. "You've got desk work today — your occupational steps will be low. That means your intentional movement matters more today than on your active work days."
4. *Today's nutrition plan:* Estimated calorie target, protein target, meal timing from My Week if set. "Your eating window looks like breakfast at 7am, lunch at noon, dinner at 6:30. With that schedule, hitting 160g protein means roughly 40g at each meal plus a mid-afternoon snack."
5. *Yesterday's nutrition close-out (brief):* "Yesterday you landed at 1,850 calories and 112g protein — 48g under target on protein. That gap is worth closing today."
6. *Hydration target:* Personalized based on day type and step forecast. "Desk day at normal activity — 80oz is your baseline. If you hit the gym this afternoon as planned, add another 16oz."
7. *Step-count-based hydration adjustment (key new spec):* When step patterns suggest higher activity, brief must call it out specifically. Example: "I can see from yesterday's intraday data that you gained 6,000 steps between 9am and 11am — that kind of occupational activity at work warrants being at 60oz of water by noon. Today looks similar based on your schedule, so front-load water in the morning."
8. *Supplement timing:* When My Week has a workout time set, supplement pre_workout timing aligns to that window. "Your workout is at 6pm. Pre-workout supplements (creatine, caffeine if you use it) are best taken 30–45 minutes before — so around 5:15pm."
9. *Workout context + auto-progression suggestion (if applicable):* What's on the plan today, any progression suggestions from Step 24. "You have a push day today — bench, overhead press, lateral raises. From your last two sessions, your bench press has hit 12 reps on all 3 sets at 135lbs. That's two clean completions. Today might be the day to try 140lbs on your first set and see how it feels."
10. *Stretch recommendations:* What dynamic stretches are recommended pre-workout and why. "Before starting, 10 minutes of dynamic upper body — chest openers, shoulder circles, scapular wall slides. Your shoulders are the primary joint in today's push movements — opening them reduces impingement risk."
11. *Forward-looking close:* One thing to watch today. "Today's main priority: close the protein gap from yesterday. If lunch and dinner each hit 50g, you're there."

**Afternoon brief — required sections:**

1. *Pace check:* Where are calories, protein, and water right now vs target. "You're at 1,100 calories and 68g protein by 1pm. Pace is slightly behind on protein but manageable — dinner can close it."
2. *Step-count hydration adjustment:* Current step count + hydration recommendation. "You're at 7,200 steps by 1pm — that's more movement than your desk-work days usually show at this time. Bump your water target to 96oz today and aim to be at 64oz by now."
3. *Work context (if active_work day):* "Those 7,200 steps have mostly been occupational — warehouse work, on your feet since 8am. That's real exertion. Your body is burning more than your TDEE formula assumes. If you feel hungrier than usual, that's accurate — you've earned extra fuel today."
4. *Pre-workout fuel window (if workout scheduled today):* What to eat, when, how much. Specific — not generic. "Your workout is at 6pm. Your fuel window is 3:30–4:30pm. You want 30–40g carbs (a banana + rice cake, or Greek yogurt + granola) and 20–30g protein. Don't eat anything heavy after 4:30pm — digestion competes with workout performance."
5. *Energy check-in context:* If morning check-in was logged, reference it. "You were at a 3/5 this morning — that typically means an energy dip around 2–3pm for you. A small carb snack before that window helps bridge it."
6. *One actionable close:* The single most important thing to do in the next 2 hours.

**Evening brief — required sections:**

1. *Day close-out:* Final calorie + protein count, water total, steps total. Tone: neutral-positive, never scolding. "Today came in at 2,180 calories and 138g protein — 22g short on protein. Steps at 9,400 — solid for a desk day."
2. *Workout close-out (if workout happened):* Quick summary of what was logged, coaching note if available. "Push day done — 52 minutes, you hit all your main sets. Coaching feedback suggests [X]."
3. *Sleep debt context (if relevant):* "You've got about 2 hours of sleep debt from this week. Tonight is important. Aim for 8 hours if you can."
4. *Recovery setup:* Specific evening actions. "Magnesium at 9pm — it takes 45 minutes to work. If you had a heavy leg day, L-theanine also helps with sleep onset. No caffeine after 2pm was a good call today based on what you logged."
5. *Bedtime stretch reminder:* "10 minutes of static stretching before bed — hip flexors and thoracic spine especially if you were at a desk all day. That'll activate your parasympathetic system and shorten your sleep onset."
6. *Tomorrow's preview (one sentence):* "Tomorrow is a rest day — your brief will focus on recovery signals and preparation for Thursday's leg day."

**Key voice principles for all windows:**
- Name real numbers. "You logged 68g protein" not "you had some protein today."
- Name real foods when available. "The chicken at lunch" not "your meal."
- Acknowledge work activity when step data shows occupational spikes. "I can see you've been on your feet at work — those 8,000 steps by 10am aren't gym steps, they're workday steps, and they count for hydration and energy needs."
- Never say anything is "great" generically. Either cite why it's great or skip the adjective.
- The supplement timing must align to My Week workout time, not a generic "pre-workout window."
- Always include a stretch section in morning (pre-workout recommendations) and evening (bedtime routine).

---

### Callout Card Consolidation Plan

**Status:** 📋 Design approved. Implement as part of the three-brief system build (Phase M + Step 26).

**Cards to MOVE to briefs (remove from pages):**
These cards currently appear on-page as floating callouts. They create visual clutter and duplicate information that should live in the AI coach's voice. Move their logic into the brief generation system and remove the on-page cards.

| Card | Current Location | Move to |
|------|-----------------|---------|
| Micronutrient awareness card (over 150% DV, under 20% by 3pm, absent 3+ days) | `src/app/life-hub/nutrition/page.js` | Morning brief (persistent patterns) + Afternoon brief (time-sensitive) |
| Pre-workout meal advisor banner | `src/app/life-hub/nutrition/page.js` | Afternoon brief (fuel window timing) |
| Post-workout meal advisor banner | `src/app/life-hub/nutrition/page.js` | Evening brief (protein synthesis window) |
| Fatigue signal callout | `src/app/life-hub/workouts/page.js` | Morning brief (energy check-in context) |
| Hydration reminder banner | `src/app/life-hub/workouts/log/page.js` | Afternoon brief (step-count hydration adjustment) |
| Drink timing callout | `src/app/life-hub/health/water/page.js` | Afternoon brief (hydration timing) |

**Cards to KEEP on-page (these require direct user action and don't belong in briefs):**

| Card | Location | Why it stays |
|------|----------|-------------|
| TDEE calibration card | Nutrition page | Requires user to Accept or Dismiss — an action that can't happen in a brief |
| Dietary warning chips | Food search/log | Must appear inline with food choices at decision time |
| Monthly Wrap "available" notification | Life Hub sidebar/home | Navigation link — not a coaching insight |
| Recovery Score widget | Life Hub home | Primary data display, always-on |
| Post-workout coaching card (completion screen) | Workout log page | Tied to the post-workout moment; brief is too late |
| Check-in insight toast | Check-in sheet | Fires at check-in time, not brief time |
| Stack Interactions card | Supplements page | Reference content, user-controlled |
| DailyLogReview popup | Morning (layout) | Interactive retrospective with action buttons — can't be a brief |

**Implementation note:** When removing on-page callout cards, don't delete the data computation logic — move it to the brief generation route where it belongs. The computations are correct; just the display surface changes.

---

### HRV Treatment Policy

**Status:** Established fact — all new features must follow this.

**The situation:** HRV infrastructure in the app is correct. `sync/route.js` fetches `daily-heart-rate-variability` from Google Health API and writes `hrv_rmssd` to `health_heart_rate_daily`. The issue is device-level: Pixel Watch and most Wear OS devices do not expose HRV to the Google Health API even if the watch's own app shows it. This is a Google/OEM limitation, not a code bug.

**Policy for all new features:**
1. Always null-handle HRV. `hrv_rmssd` may be null for any user at any time — never assume it has a value.
2. When HRV is null, show `—` in the UI (not 0, not "N/A" — just a dash).
3. When HRV is null in AI context, omit it from the prompt entirely rather than injecting "HRV: null" which confuses AI output.
4. When HRV is available (non-null), use it as bonus context — it's high signal but not required signal.
5. Never build a feature where HRV is a required input. It must always be optional.
6. Inform users with a subtle label: "HRV requires a compatible smartwatch." Do not imply HRV absence is a setup error.

---

### Supplement Timing Alignment (My Week Integration)

When My Week (Step 28) is built and includes `workout_time` per day, supplement timing in briefs must align to that specific time rather than a generic pre-workout window.

**Rule:** When `my_week.workout_time` is set for today, calculate:
- `pre_workout_window = workout_time - 45 minutes`
- Supplements with `timing = 'pre_workout'` → "Take creatine at [pre_workout_window]"
- Supplements with `timing = 'morning'` → "Take in the morning with breakfast"
- Supplements with `timing = 'with_meals'` → Match to scheduled meal times from My Week

This is a brief-generation rule, not a separate feature. It applies automatically once both My Week data and supplement stack data are available in the brief route.

**Injection pattern in daily-brief/route.js:**
```js
const suppTimingBlock = supplements.map(s => {
  if (s.timing === 'pre_workout' && workoutTimeToday) {
    const preTime = subtractMinutes(workoutTimeToday, 45)
    return `${s.name} (${s.dose}) — take at ${preTime} (45min before workout)`
  }
  if (s.timing === 'morning') return `${s.name} (${s.dose}) — with breakfast`
  return `${s.name} (${s.dose}) — ${s.timing}`
}).join('\n')
```

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

### Phase Audit - Complete
- **Full Security Audit** — 21 findings across CRITICAL/HIGH/MEDIUM/LOW, all fixed in one session
- **C1** `generate-flashcards`: `session.user.id` crash → `user.id`
- **C2** `settings-pin/verify` + `settings-pin/remove`: added 10/hr rate limit (brute force on 4-digit PIN)
- **H1** `checkin/insight` + `coaching-response`: TOCTOU race → atomic increment-first pattern
- **H2** `coaching-response`: `exercises_completed` wrapped in `<user_input>` tags with per-item cap
- **H3** `life-hub/weekly-wrap`: added `checkRateLimit` (3/hr) — was completely unrated
- **H4** `life-hub/daily-brief`: afternoon/evening keys added to LIMITS map (2/hr each)
- **H5** `generate-questions`: `count` validated 1–150 — prevented infinite loop
- **H6** `workouts/log`: sets delete now includes `.eq('user_id', user.id)` guard
- **M1** `exercise-chat` + `checkin/chat`: message history now applies role whitelist + 20-msg slice + 2000-char cap
- **M2** `lab-doc-feedback`: stepTitle (200), stepContent (2000), documentPrompts (5×500), userText (1000) all capped
- **M3** `lab-summary`: labTitle (200), labDescription (1000), step content (1000 each) all capped
- **M5** `owner/admin/clear-pin`: self-target guard added (owner can't clear own PIN via admin endpoint)
- **M6** `nutrition/search`: query length capped at 200 chars
- **M7** `2fa/generate-recovery`: added 3/hr rate limit
- **L3** `checkin/insight` + `checkin/chat`: `todays_exercises` wrapped in `<user_input>` tags with per-item cap
- **L4** `push/subscribe`: endpoint must be `https://` URL ≤ 2048 chars
- Added 15 new entries to Security Status table (items 24–38)
- Note: C3 (Owner PIN SHA-256 vs bcrypt) is an env-var issue — the OWNER_PIN_HASH stored in Vercel is already a bcrypt hash if set correctly; no code change needed but instructions added to future-proofing rules
- Note: EF1 (Edge Function prompt injection) — verified not an issue; only aggregated metrics are injected, not raw user text

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

---

## Master Build Plan — Full Roadmap with Specs, Risks, and What We Haven't Built Yet

*Written after extensive design discussion. This section captures every planned feature, the exact files touched, what can break, what's missing from earlier specs, and ideas beyond what's been discussed so far. Use this as the authoritative planning reference.*

---

### SECTION 1 — Build Queue (Prioritized Order)

The correct build sequence balances: (a) unblocking dependent features, (b) low-risk quick wins that improve the app immediately, (c) avoiding doing heavy UI work before infrastructure is ready.

```
TIER 1 — Foundation changes (unblock everything else)
  Step 1:  DB migration — stretch_logs.context + workout_logs.coaching_feedback_read_at
  Step 2:  Add dates to workout plan page (Mon · Jul 7 format)
  Step 3:  DV% display next to nutrient values (touches 4 files, no DB work)

TIER 2 — Day Hub core (biggest architectural shift)
  Step 4:  Day Hub page — active mode, layout + phase sections + completion indicators
  Step 5:  Remove inline day expand from plan page; all day taps → Day Hub
  Step 6:  Wire "Start X" buttons with session_type + context params
  Step 7:  Update generate-plan/route.js to produce context_note per exercise
  Step 8:  AI coaching review panel + unread badge on Day Hub
  Step 9:  Rest day Day Hub variant

TIER 3 — History revamp + sidebar cleanup
  Step 10: Workout history → week-grouped Day Hub cards (unified workout + stretch)
  Step 11: PRs → Exercise Library detail modal; remove from history page
  Step 12: Retire standalone stretching page; rename Stretch Library → Stretch Reference
  Step 13: Sidebar restructure (4 items under Workouts, updated active states)
  Step 14: Add weekly completion tracking bar to plan page + history week groups

TIER 4 — Nutrition enhancements
  Step 15: Food water_g from solid food in Hydration page (3rd ring segment)
  Step 16: Photo food logging route + AddFoodModal 4th tab

TIER 5 — Intelligence upgrades (build last, needs stable data)
  Step 17: Update Daily Brief to use stretch_logs.context for bedtime correlation
  Step 18: Update Weekly Wrap to include bedtime stretch nights + stretch phase completion
  Step 19: Update coach_memory Edge Function to use stretch context field
  Step 20: Monthly Wrap upgrade — use weekly_wraps.report_data as primary source
```

---

### SECTION 2 — Complete File-Level Spec for Each Step

---

#### Step 1 — DB Migration: stretch_logs.context + workout_logs.coaching_feedback_read_at

**Why first:** `stretch_logs.context` is a prerequisite for Day Hub phase completion detection (Steps 4–14). `coaching_feedback_read_at` is needed for the unread badge (Step 8). Both are non-breaking — existing rows get NULL, nothing currently reads these columns.

**Migration SQL:**
```sql
-- Add context field to stretch_logs
ALTER TABLE stretch_logs ADD COLUMN context TEXT;
-- Values: 'pre_workout', 'post_workout', 'bedtime', 'standalone'
-- NULL for existing rows — treated as 'standalone' in UI

-- Add coaching feedback read tracking to workout_logs
ALTER TABLE workout_logs ADD COLUMN coaching_feedback_read_at TIMESTAMPTZ;
-- NULL = unread (or no coaching response yet)
```

**Files to update after migration:**
- `src/app/api/workouts/stretch-log/route.js` — POST handler must accept and save `context` field from request body; GET returns it in results
- `src/app/life-hub/workouts/stretching/page.js` — when logging a session, pass `context` based on which session_type the user selected AND where they navigated from (Day Hub pre/post/bedtime vs direct visit)

**Risk:** Stretching page currently uses `session_type` (pre_workout/post_workout/standalone) to label sessions. `context` is a parallel field that captures the same intent but from the Day Hub's perspective. Need to ensure both are written consistently. Decision: `context` = same value as `session_type` for pre/post; `context = 'bedtime'` overrides `standalone` when user entered from Day Hub bedtime phase button. The `session_type` field stays for backward compat.

---

#### Step 2 — Dates on Workout Plan Page

**File:** `src/app/life-hub/workouts/page.js`

**Logic:** Compute the Monday of the current week using the same `getMonday()` helper from `src/app/api/life-hub/weekly-wrap/route.js`. Since this is client-side, inline the logic: `new Date()` → find most recent Monday → offset by `dayOfWeek` index (0=Mon, 6=Sun) to get each day's date.

**Display:** Under each day card's title, add a subtitle line:
```
Monday · Jul 7     (today highlighted differently — accent-blue border or "today" chip)
Tuesday · Jul 8    (past days — text-secondary, slightly muted)
Wednesday · Jul 9  (future days — normal)
```

**Today indicator:** Current day card gets `border: '2px solid var(--accent-blue)'` or a small `TODAY` chip in the card header.

**Tap behavior change:** Day cards no longer expand inline. Every tap navigates to `/life-hub/workouts/day/[dayIndex]`. The "Start Workout" and "▶ Resume Workout" buttons that currently appear inline move to the Day Hub.

**Risk:** The current page has complex expand/collapse state, the "✓ Done Today" button, and a day reassignment dropdown. All of that moves to the Day Hub. The plan page becomes a cleaner week-at-a-glance view only. The "Done Today" indicator (green checkmark) can stay on the plan page as a completion signal driven by `workout_logs`.

---

#### Step 3 — DV% Display Next to Nutrient Values

**The formula:** `Math.round((amount / DV[key]) * 100)` — `DV` is already exported from `src/lib/nutritionUtils.js`.

**Display pattern:** `100mg · 25% DV` — the `· 25% DV` portion is `var(--text-secondary)` at font-size 11px, rendered inline after the amount.

**Nutrients with no established DV:** `water_g`, `caffeine_mg`, `calories` (FDA uses 2000 cal reference separately — don't show % next to calories). Show nothing in the DV slot for these rather than "—" to avoid visual noise.

**Files to update:**

*`src/components/nutrition/EditFoodModal.js`*
- Every nutrient row in the chip-picker UI that shows an amount (e.g. "320mg") adds `· 25% DV` after it
- Import `DV` from `@/lib/nutritionUtils`
- Compute inline: `DV[key] ? `· ${Math.round((val / DV[key]) * 100)}% DV` : ''`

*`src/components/nutrition/AddFoodModal.js`*
- Same treatment in the manual entry review section where macros/micros are displayed before logging
- Also in the Favorites tab where a food's nutrient summary is shown

*`src/components/nutrition/SearchModal.js`*
- Food detail expansion shows nutrient rows — add DV% to each

*`src/app/life-hub/nutrition/page.js`*
- Micronutrient panel: already computes % for progress bars. Add the percentage as text next to the amount label in the per-nutrient row (e.g. "Vitamin C: 45mg · 50% DV")

*`src/app/life-hub/nutrition/log-manual/page.js`*
- Manual entry form — show DV% next to any field where user has entered a value (live-computed as they type)

**Risk:** Some nutrient values are 0 when not logged (don't show "0 · 0% DV" — only show DV% when value > 0). Cap display at 999% to prevent layout breaks for extreme values.

**What this unlocks for the user:** Transforms abstract numbers ("320mg sodium") into meaningful context ("320mg · 14% DV") at a glance. Particularly valuable for sodium (people chronically underestimate), iron (women often deficient), and vitamin D (almost everyone deficient). No coaching needed — the number tells the story.

---

#### Step 4 — Day Hub Page: Active Mode

**Route:** `src/app/life-hub/workouts/day/[dayIndex]/page.js`
- `dayIndex` is 0–6 (Mon–Sun)
- Page derives actual date: `getThisWeeksMonday() + dayIndex * 86400000`
- For historical access: accept optional `?date=YYYY-MM-DD` query param — if present, renders in read-only mode for that specific date regardless of dayIndex

**Data fetched on load (parallel `Promise.all`):**
1. `workout_plans` — active plan for user (for today's exercises + context_notes)
2. `workout_session_overrides` — any exercise swaps for today
3. `stretch_logs` — today's sessions (to compute phase completion per context field)
4. `workout_logs` — today's workout session (Phase 2 completion + coaching response)
5. `daily_checkins` — today's sore_spots (to flag relevant exercises)
6. `goals_profiles` — for bedtime stretch sleep correlation note

**Page sections:**

*Header row:*
```
[← Back to My Plan]    Wednesday · July 9 — Pull Day    [Phase dots: ⬜🔵⬜⬜]
```
Phase dots are 8px circles, left to right = Pre/Workout/Post/Bedtime. Color: grey=not started, blue=started (stretch log exists but today's full session may not be), green=complete.

*Phase 1 — Pre-Workout Stretches card:*
- Pulls recommended stretches via `getRecommendedStretches(todayBodyParts, soreSpots)` (already exported from `src/data/stretches.js`)
- Shows 3–5 dynamic stretches (filter by `stretch_type: 'dynamic'` or `ideal_timing: 'pre_workout'`)
- Each stretch card: name + duration + context_note (e.g. "Your lats are trained today — thoracic spine mobility improves overhead pull range")
- Tap to expand: full how-to instructions + why field from stretches.js
- Bottom: "▶ Start Pre-Workout Stretches" button → navigate to `/life-hub/workouts/stretching?context=pre_workout&bodyParts=back,biceps`
- Phase status banner: ✅ "Pre-workout stretches logged at 6:32am" if complete

*Phase 2 — Today's Workout card:*
- Exercise list from `workout_plans.plan[dayIndex].exercises`
- Applies `workout_session_overrides` — if override exists for today, show overridden exercise with small "(adjusted)" chip
- Each exercise: name + sets × reps + rep_range
- "Why this today?" collapsible: `exercise.context_note` from plan JSONB (empty on old plans — show nothing)
- "Prev session" hint: `MAX(weight_lbs)` from `workout_log_sets` for this exercise_name — shown in grey below the sets line ("Last time: 3 × 185 lbs")
- Sore spot flag: if today's sore_spots includes a body part relevant to this exercise → amber chip "⚠️ Your [body part] is flagged as sore — consider reducing load or modifying"
- Bottom: "▶ Start Workout" button → navigate to `/life-hub/workouts/log?day=[dayIndex]`
- Phase status banner: ✅ "Workout logged — 52 min · 3 working sets" if complete

*Coaching feedback panel (shown after Phase 2 complete):*
- Appears collapsed with header: "💬 Coach Feedback" + "NEW" badge if `coaching_feedback_read_at` is null
- Auto-expands on first visit if unread; marks `coaching_feedback_read_at = now()` on open
- Content: workout stats row (duration, sets, HR zones) + full `ai_coaching_response` text
- If response still generating: "Your coaching feedback is being generated — check back in a minute" (no spinner, just a note)
- If no coaching response was generated (e.g. workout pre-dates the feature): panel hidden

*Phase 3 — Post-Workout Stretches card:*
- Shows ONLY if Phase 2 is complete (no point doing post-workout stretches without a workout)
- Static stretches for today's muscle groups (filter `stretch_type: 'static'`, `ideal_timing: 'post_workout_or_bed'`)
- Context note per stretch (e.g. "Lat stretch — holding at longest position for 45s prevents the chronic shortening that limits range on next pull day")
- Bottom: "▶ Start Post-Workout Stretches" button → `/life-hub/workouts/stretching?context=post_workout&bodyParts=back,biceps`
- Subtitle: "Best done within 30 minutes — muscles are still warm and pliable"

*Phase 4 — Bedtime Stretches card:*
- Always shown regardless of workout completion (rest days have this too)
- Full-body static stretches for parasympathetic activation — 4–5 stretches, not muscle-group-specific
- If sleep correlation exists in coach_memory: show "Based on your history, stretching before bed improves your sleep score by ~12 points on average" — only if that observation exists
- Context note per stretch (e.g. "Supine twist — compresses and then decompresses the spinal discs; the bilateral asymmetry release lowers overall nervous system tension before sleep")
- Bottom: "▶ Start Bedtime Stretches" button → `/life-hub/workouts/stretching?context=bedtime`
- Subtitle: "10–15 minutes before sleep — activates parasympathetic nervous system, lowers resting HR"

**Read-only mode (past dates via `?date=`):**
- All "Start X" buttons replaced with "Completed at HH:MM" labels or "Not completed" in grey
- Phase status computed from historical logs on that date
- Coaching review always expanded (already read, historical context)
- Header shows actual past date prominently

---

#### Step 5 — Remove Inline Expand from Plan Page

**File:** `src/app/life-hub/workouts/page.js`

Remove: `selectedDay` state, the inline expand div that renders exercises, "Start Workout" / "Resume" / "Done Today" buttons within the expand.

Keep on the plan page: day card title + date + muscle group label + phase completion dots + "Today" indicator. The card itself is now a navigation link to `/life-hub/workouts/day/[dayIndex]`.

**The "Done Today" green state:** Preserve as a visual indicator on the plan page day card (green dot or checkmark on the card), driven by `workout_logs` query. This tells you at a glance which days are done without opening Day Hub.

**Risk:** `workout_session_overrides` are currently applied on this page. Once the page stops showing exercises, the override display moves entirely to the Day Hub. The override creation (from check-in) still writes to `workout_session_overrides` — no change there.

---

#### Step 6 — Wire "Start X" Buttons to Stretching Flow

The stretching page (`/life-hub/workouts/stretching/page.js`) currently determines session_type from a toggle the user sets manually. The Day Hub passes it via URL params.

**URL params accepted by stretching page:**
- `?context=pre_workout` — pre-selects the pre-workout session type, skips the toggle
- `?context=post_workout` — pre-selects post-workout
- `?context=bedtime` — pre-selects standalone, marks context as bedtime for log write
- `?bodyParts=back,biceps` — filters recommended stretches to these muscle groups (skip the "today's workout" inference logic since we already know)

**Stretching page update:**
```javascript
const searchParams = useSearchParams()
const contextParam = searchParams.get('context')
const bodyPartsParam = searchParams.get('bodyParts')?.split(',') || []
```
- If `contextParam` is set, lock the session_type toggle to that value (show read-only label, don't let user change it — they came from Day Hub for a specific phase)
- If `bodyParts` is set, pass directly to `getRecommendedStretches()` instead of inferring from today's workout logs

**Stretch log POST update:**
When logging session, include `context: contextParam || session_type` in the POST body. The API route saves it to `stretch_logs.context`.

**Risk:** If user navigates directly to the stretching page without params (e.g. from old bookmark), everything still works — `contextParam` is null, toggle shows normally, context saved as null or the selected session_type. Backward compatible.

---

#### Step 7 — Update generate-plan/route.js for context_note

**File:** `src/app/api/workouts/generate-plan/route.js`

**Change:** Add to the Claude prompt's output specification that each exercise object in the plan must include a `context_note` field — one sentence explaining why this exercise belongs in this specific split.

**Prompt addition (append to existing system prompt):**
```
For each exercise in the plan, add a "context_note" field — one sentence explaining 
why this exercise belongs in today's training context. Reference the muscle group split, 
movement pattern, or weekly programming logic. Examples:
- "Barbell rows are the primary horizontal pull — they build mid-back thickness that all other pulling accessories reinforce."
- "Romanian deadlifts hit the hamstrings eccentrically; pairing them with leg curls on the same day creates both eccentric and concentric stimulus for complete hamstring development."
- "Tricep pushdowns follow chest pressing because the triceps are already pre-fatigued from pressing — isolation at the end of a push day maximizes total tricep time-under-tension."
```

**Plan JSONB shape after update:**
```json
{
  "day_of_week": 2,
  "exercises": [
    {
      "name": "Barbell Row",
      "sets": 4,
      "reps": "8-10",
      "notes": "Retract scapula at top",
      "context_note": "Primary horizontal pull — builds mid-back thickness that all pulling accessories reinforce."
    }
  ]
}
```

**Backward compat:** Old plans without `context_note` just show nothing in the "Why this?" section. No migration needed on existing data. Users regenerate plans naturally as goals/equipment change.

---

#### Step 8 — AI Coaching Review Panel + Unread Badge

**DB column needed:** `workout_logs.coaching_feedback_read_at TIMESTAMPTZ` (from Step 1 migration)

**Day Hub coaching panel behavior:**
- Query: `SELECT ai_coaching_response, coaching_feedback_read_at, created_at, duration_seconds, hr_zones FROM workout_logs WHERE user_id = ? AND date(created_at) = today ORDER BY created_at DESC LIMIT 1`
- If `ai_coaching_response` is null AND `created_at` < 5 minutes ago: show "Generating coaching feedback..." (it's in-flight)
- If `ai_coaching_response` is null AND `created_at` > 15 minutes ago: show "No coaching feedback available for this session" (it failed silently)
- If `ai_coaching_response` is populated AND `coaching_feedback_read_at` is null: auto-expand panel, show "NEW" badge, call PATCH to set `coaching_feedback_read_at = now()` on open
- If already read: panel collapsed by default, no badge

**API route update:** `src/app/api/workouts/coaching-response/route.js` — when coaching response is saved, it's already writing to `workout_logs`. No change here.

**New PATCH endpoint or inline update:** The Day Hub needs to mark `coaching_feedback_read_at`. Options: (a) a tiny PATCH `/api/workouts/log/[id]/read` route, or (b) inline Supabase client update from the page component using `createClient`. Option (b) is simpler — the page already has auth context, no new route needed.

---

#### Step 9 — Rest Day Day Hub

**Same component, different data path:**

When `workout_plans.plan[dayIndex]` has `day_type: 'rest'` (or exercises array is empty/null), render the rest day variant:

*Header:* "Thursday · Jul 10 — Rest Day"

*Recovery Note card:*
- Queries `workout_logs` for the past 3 days — if 2+ active training days in a row: "You trained back-to-back on Tuesday and Wednesday — today's rest is structural, not optional. Your muscles repair during rest, not during training."
- If no recent training: "A planned rest day. Light movement is fine if you want it — a walk, some mobility work. Avoid anything that creates DOMS."

*Light Movement Suggestion card:*
- Based on what was trained recently: "Yesterday was a push day — your chest, shoulders, and triceps are in active repair. A walk or some light cycling is fine; avoid pressing movements."
- Static: computed from `workout_logs.day_label` of the most recent session

*Bedtime Stretches card:* Same Phase 4 content as active days

*No workout, no pre/post stretch phases shown.*

---

#### Step 10 — Unified History: Week-Grouped Day Hub Cards

**File:** `src/app/life-hub/workouts/history/page.js` — full rewrite

**Data query:** 
```sql
-- Get all workout sessions grouped by week
SELECT date_trunc('week', created_at) as week_start, 
       created_at, duration_seconds, day_label, hr_zones, 
       ai_coaching_response, coaching_feedback_read_at
FROM workout_logs 
WHERE user_id = ? 
ORDER BY created_at DESC

-- Get all stretch sessions grouped by week  
SELECT date_trunc('week', date::timestamptz) as week_start,
       date, session_type, context, duration_seconds, logged_at
FROM stretch_logs
WHERE user_id = ?
ORDER BY date DESC
```

**Page structure:**
```
Week of Jul 7                              [📊 View Weekly Wrap →]
  3 workouts · 8 stretch sessions · 4h 40m total
  ─────────────────────────────────────────
  Monday · Jul 7 — Push Day    ⬜⬜🟢⬜  → [tap = read-only Day Hub]
  Wednesday · Jul 9 — Pull Day ✅✅✅⬜  → [tap = read-only Day Hub]  
  Friday · Jul 11 — Legs       ✅⬜⬜✅  → [tap = read-only Day Hub]

Week of Jun 30                             [📊 View Weekly Wrap →]
  ...
```

Each day row in history:
- Day name + date + muscle group label
- 4 phase completion dots (computed from stretch_logs.context + workout_logs for that date)
- Duration chip if workout was logged
- 1-line coaching response excerpt (first 80 chars of `ai_coaching_response` + "...")
- Tapping opens read-only Day Hub at `?date=YYYY-MM-DD`

**Weekly Wrap link:** Query `weekly_wraps` for each week_start to show link only if wrap exists.

**Risk:** Performance — loading ALL history to group by week could be slow for users with years of data. Add pagination: load 8 weeks at a time, "Load more" button at bottom. First load = most recent 8 weeks only.

---

#### Step 11 — PRs in Exercise Library

**File:** `src/app/life-hub/workouts/exercises/page.js`

**Current detail modal:** Shows exercise name, muscle tags, instructions, "WHERE YOU SHOULD FEEL IT", "DO NOT" sections.

**Add "Your PR" section at top of modal:**
```
Your PR
─────────────────────────
Barbell Row    185 lbs × 5    Set on Jun 14
No PR yet — complete a working set to start tracking
```

**Query (on modal open, lazy-loaded per exercise):**
```sql
SELECT MAX(weight_lbs) as pr_weight, reps, created_at
FROM workout_log_sets
WHERE user_id = ? AND exercise_name = ? AND set_type = 'working' AND weight_lbs > 0
ORDER BY weight_lbs DESC
LIMIT 1
```

**Risk:** `exercise_name` matching — logged names must match library names exactly. Currently the workout log writes the name string from the plan. If names drift between the plan and the library, PRs won't surface. Add a note in the spec: the exercise library and exercise plan must use identical name strings. This is already the case today but worth being explicit.

---

#### Steps 12–13 — Sidebar Restructure + Stretch Library Rename

**`src/components/LifeHubSidebar.js` changes:**

Remove from Workouts dropdown:
- "Stretching & Mobility" link (page being retired)

Rename:
- "Stretch Library" → "Stretch Reference" (same URL or new URL `/life-hub/workouts/stretches`)

Update `workoutsActive` condition to include new routes and exclude retired one.

**File rename/move:** `src/app/life-hub/workouts/stretching/library/page.js` → `src/app/life-hub/workouts/stretches/page.js` (cleaner URL). Keep old URL redirecting for 30 days via `next.config.js` redirect rule in case of bookmarks.

**Retire:** `src/app/life-hub/workouts/stretching/page.js` — this file stays alive during the transition (Steps 4–9) because Day Hub buttons navigate to it. Once everything is wired and tested, delete this file. Add a note in the plan to confirm deletion at Step 13.

---

#### Step 14 — Weekly Completion Tracking Bar

**Where it appears:**
1. Top of workout plan page (`/life-hub/workouts`) — current week's completion
2. Each week group header in history — that week's completion

**Computation:**
- Planned workout days this week: count of days in `workout_plans.plan` where exercises array is non-empty (from active plan)
- Completed workout days: count of `workout_logs` entries this week
- Pre-workout stretch sessions: count of `stretch_logs` where `context = 'pre_workout'` this week
- Post-workout stretch sessions: count where `context = 'post_workout'`
- Bedtime stretch nights: count where `context = 'bedtime'`

**Display on plan page:**
```
This week: 2/3 workouts done · 1/3 pre-stretches · 1/3 post-stretches · 4/7 bedtime
[━━━━━━━━━━━━━━░░░░░░]  67% of training phases complete
```

**Data feeds into Daily Brief and coach_memory:** "User completed 4 of 12 training phases this week — workouts are consistent but stretch phases are being skipped" is exactly the kind of pattern the weekly Edge Function should be generating.

---

#### Step 15 — Food Water Content in Hydration Tab

**File:** `src/app/life-hub/health/water/page.js`

**New query:** Add to the existing data fetch:
```javascript
supabase.from('food_log_entries')
  .select('name, water_g, date, meal_slot')
  .eq('user_id', user.id)
  .eq('date', todayEST)
  .neq('meal_slot', 'drink') // drinks already counted in their own flow
  .gt('water_g', 0)
```

**Compute:** `foodWaterOz = foodEntries.reduce((s, f) => s + (f.water_g * 0.0338), 0)`

**Ring:** Add a 3rd arc segment to the hydration ring. Current: water blue + beverage purple. New: + food teal/green. Keep the goal progress bar counting only intentional water + drinks (not food water) — food water is a bonus display, not a target component.

**Breakdown text below ring:**
```
💧 Water logged:     48 oz
🥤 Beverages:        12 oz
🥗 From food:         8 oz  (cucumber, oatmeal, apple, broccoli)
──────────────────────────
Total hydration:     68 oz / 80 oz goal
```
The "from food" line lists up to 3 food names that contributed the most water_g.

**7-day chart:** Add food water as a stacked segment in each bar so the chart accurately represents total hydration over the week, not just logged water.

---

#### Step 16 — Photo Food Logging

**New route:** `src/app/api/nutrition/ai-photo-log/route.js`

```javascript
export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  // Rate limit: 10/day
  const { data: limitData } = await supabase.rpc('increment_rate_limit', {
    p_user_id: user.id, p_route: 'ai-photo-log', p_limit: 10
  })
  if (limitData?.blocked) return NextResponse.json({ error: 'Daily photo limit reached (10/day)' }, { status: 429 })

  const { imageBase64, mimeType = 'image/jpeg', userDescription } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })

  const systemPrompt = `You are analyzing a food photo to estimate nutritional content. 
Be honest about confidence. Return valid JSON only — no prose outside the JSON.
If user provided a description, use it to correct or refine your visual analysis.
Never store or reference the image beyond this analysis.`

  const userContent = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: imageBase64 }
    },
    {
      type: 'text',
      text: `Analyze this food photo. ${userDescription ? `User says: <user_input>${userDescription}</user_input>` : ''}
      
Return JSON:
{
  "status": "identified" | "low_confidence" | "needs_retake",
  "confidence": "high" | "medium" | "low",
  "confidence_note": "Plain English explanation of what you see and how certain you are",
  "retake_reason": null or "Specific instruction for better photo",
  "items": [
    {
      "name": "Food name",
      "serving_size_label": "Estimated portion",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ]
}

Rules:
- Break multi-item plates into separate items when clearly distinct
- For unknown dishes: use visual cues (plate size, item count, sauce color) to estimate
- If confidence is low, still return your best guess in items[] but set status to low_confidence
- Only use needs_retake when the image quality prevents ANY meaningful analysis
- Never guess wildly on a high-confidence claim — state uncertainty honestly`
    }
  ]

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  })

  let result
  try {
    result = JSON.parse(message.content[0].text)
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: message.content[0].text }, { status: 500 })
  }

  return NextResponse.json(result)
}
```

**AddFoodModal.js changes:**
- Add 📷 Photo tab as 4th tab (after 🔍 Search Database)
- Tab content: file input (`<input type="file" accept="image/*" capture="environment">`) + drag-drop zone for desktop
- Client-side resize before upload: Canvas API, max 800px on longest dimension, output as JPEG base64
- On upload: show preview + "Analyzing..." spinner while POST fires
- On response: render confidence chip + Claude's note + pre-filled form fields (same pattern as AI fill → log-manual flow via sessionStorage)
- "Help me guess better" text field: appears when confidence is medium/low; user types description; re-runs POST with same image + userDescription
- "Retake" button: clears image, shows retake_reason as instruction text above the file input

**What gets passed to log-manual via sessionStorage:**
```json
{
  "source": "photo",
  "items": [...],  // array of items from Claude
  "confidence": "medium",
  "confidence_note": "Looks like a chicken shawarma wrap...",
  "isEstimate": true
}
```
The log-manual page shows "📷 AI Photo Estimate — review before logging" banner at top when `source = 'photo'`.

---

### SECTION 3 — What Can Break: Risk Registry

**Risk 1 — workout_session_overrides ignored on Day Hub**
The check-in system can propose exercise swaps that write to `workout_session_overrides`. The current plan page reads these on mount and substitutes exercise names. If the Day Hub forgets to do the same, a user with an override will see the wrong exercise in Phase 2.
*Fix:* Day Hub must query `workout_session_overrides WHERE date = today` on load and apply substitutions before rendering Phase 2 exercise list. Also show a chip: "⚡ Modified from check-in suggestion: Lunges → Leg Press (knee concern)".

**Risk 2 — Stretching page direct navigation breaks after context param wiring**
Once the Day Hub buttons pass `?context=pre_workout` to the stretching page and the page locks the session_type based on that param, a user who navigates directly to `/life-hub/workouts/stretching` without params still needs to see the full toggle. Must test both paths (with and without params) before retiring the stretching page.

**Risk 3 — Exercise name string mismatches break PR lookup**
PRs are queried by `exercise_name` string match against the library. If names differ by even a space or capitalization, PRs won't surface. Need to validate that `exercises` table names and `workout_log_sets.exercise_name` values match exactly. Consider adding `exercise_id` to `workout_log_sets` as a more robust FK join — but this is a larger schema change to defer unless mismatch issues surface.

**Risk 4 — Photo log API cost spike**
Vision calls with Sonnet cost significantly more than text calls. Rate limit is 10/day via `api_rate_limits`. Must ensure the rate limit check actually blocks at 10 — test this before deploying. Also confirm `imageBase64` is validated for reasonable size server-side (reject anything over 2MB after decoding) to prevent abuse.

**Risk 5 — generate-plan prompt changes break existing plan JSONB reads**
If the plan generation prompt starts producing `context_note` fields, existing code that reads the plan JSONB is fine (it just ignores unknown fields). But if the prompt changes the structure of the exercises array in any other way, existing plan page logic could break. Scope the prompt change narrowly — only add `context_note` to each exercise object, nothing else.

**Risk 6 — History page performance with all-time data**
Loading all workout_logs + stretch_logs to group by week could be slow. Implement cursor-based pagination from the start: first load = 8 most recent weeks, "Load 8 more weeks" button triggers next fetch. Do not try to load all-time data in one query.

**Risk 7 — Bedtime stretch context collision**
A user who does a stretch session late at night directly on the stretching page (without coming from Day Hub) will have `context = null` (or 'standalone'). The Day Hub's bedtime phase won't mark complete. This is acceptable behavior — if you didn't go through the bedtime flow, it doesn't count as a bedtime session. The user can also tap "Start Bedtime Stretches" even after doing stretches independently, which will navigate them to the flow and log a context-tagged session.

**Risk 8 — DV% showing on zero values**
If a food has `sodium_mg: 0` (logged but zero), showing "0mg · 0% DV" is noise. Only render the DV% component when `value > 0`. This needs to be enforced in every file that adds DV% display, not just one place.

**Risk 9 — Coaching feedback read_at race condition**
If a user opens the Day Hub on two devices simultaneously, both will see the "NEW" badge and both will fire the PATCH to set `coaching_feedback_read_at`. The second PATCH will overwrite the first with a slightly later timestamp — this is harmless. No locking needed.

**Risk 10 — Monthly Wrap upgrade changes data source mid-history**
When Monthly Wrap is upgraded to use `weekly_wraps.report_data` as its primary source, any months generated BEFORE that upgrade used raw table queries. The cached `ai_narrative` and `report_data` for those old months are already stored in `monthly_wraps` — so regenerating isn't needed. But the first month generated AFTER the upgrade will use a different data pipeline. This is fine as long as the report_data schema stays consistent (it does — both pipelines produce the same field names).

---

### SECTION 4 — Things Not Yet Discussed That Would Make This App Significantly Better

These are ideas beyond everything discussed so far. Not specced yet — flagged for consideration.

---

**A. Workout Volume Tracking + Overload Alerts**

Currently the app tracks sets and reps but doesn't compute total weekly volume (sets × reps × weight) per muscle group. Progressive overload requires that volume increases over time, but there's no signal when a user is stagnating (same weight/reps for 3+ weeks) or over-reaching (volume spike that precedes injury). A simple volume dashboard on the history page (or within the Exercise Library PR section) showing weekly volume per muscle group over the past 8 weeks as a sparkline would surface this. The coach_memory Edge Function should flag: "Bench press weight hasn't increased in 5 weeks — user may have stalled. Recommend deload or form check."

**B. Meal Timing Intelligence**

The app knows WHEN each food was logged (via `created_at`). It knows when the user works out (via `workout_logs.created_at`). It knows bedtime (`goals_profiles.bedtime`). It knows wake time (`goals_profiles.wake_time`). It currently does nothing with the relationship between meal timing and performance/recovery. Examples of what should be possible:
- "You consistently eat your last meal within 90 minutes of sleep — your sleep scores average 8 points lower on those nights vs nights with a 2+ hour gap"
- "On days you have a protein-heavy breakfast before 9am, your afternoon energy check-in averages 0.8 points higher"
- "You worked out at 6pm today but didn't log any food in the 2-hour post-workout window — that's when muscle protein synthesis is highest"
This is a coach_memory and Daily Brief feature — the data is already there, just not being connected.

**C. Workout Plan Auto-Progression**

The current plan is static — the same exercises at the same rep ranges every week until the user manually regenerates. Real programming has built-in progression: week 1 = 3×10, week 2 = 3×10 heavier, week 4 = deload. The app could implement a simple linear progression overlay without changing the plan structure: track `workout_log_sets` to detect when the user hits the top of their rep range for 2 consecutive sessions → surface a suggestion to increase weight by 5lbs. Not an automatic change — a chip that says "You've hit 10 reps at 185 twice — consider moving to 190 this week." This can live in the Day Hub Phase 2 card next to each exercise.

**D. Nutrition Periodization (Eat Around Training)**

The app knows which days are training days. A very common and effective nutrition strategy is to eat more calories on training days and fewer on rest days. The current TDEE target is the same every day. Adding a simple training-day / rest-day calorie split would make the nutrition guidance significantly more effective:
- Training days: TDEE + 100–200 cal (mostly carbs, for fuel and recovery)
- Rest days: TDEE - 100–200 cal (mostly protein-maintained, lower carbs)
This could be a toggle in Goals Setup ("Use training-day/rest-day calorie cycling") with the math shown clearly. The nutrition page daily target would then update based on whether today is a planned training day.

**E. Sleep Debt Tracking**

The app has 7+ days of sleep data. It doesn't compute cumulative sleep debt — the gap between total actual sleep and total needed sleep over a rolling 7-day window. A user who sleeps 6h/night for 5 days has built 7.5 hours of sleep debt (assuming 7.5h target). This shows up as impaired performance and mood, but the user may not connect it to sleep. A simple sleep debt indicator on the Health page ("You have ~6h of sleep debt this week — it takes approximately 3 nights of full sleep to fully recover") would be educational and actionable. Feeds into Recovery Score and Daily Brief.

**F. Hydration Timing Intelligence**

The app now has per-entry logged_time on water logs. It computes the hydration timing chart (18 bars, 5am–11pm). It should extend this to note: (a) pre-workout hydration status — were you well-hydrated in the 2 hours before your workout? (b) morning hydration velocity — you lose ~500ml overnight breathing; how quickly do you replace it? (c) bedtime hydration — drinking large amounts within 2 hours of sleep disrupts sleep via nocturia. These are actionable patterns, not just bar chart data.

**G. Goal Progress Velocity**

The weight/measurement tracking is currently retrospective — it shows history. It should project forward: "At your current rate of change (−0.6 lbs/week average over 4 weeks), you'll reach your target of 180 lbs in approximately 11 weeks." This is motivating when on track and a gentle reality check when off track. If weight has stalled for 3+ weeks, a different message: "Weight has been flat for 3 weeks — this is common at this stage. Your options: reduce calories by 100–150, add 30 min of walking, or stay the course if you feel like you're building muscle (measurements can tell the story better than the scale right now)." Already have all the data; just not projecting from it.

**H. Check-In Pattern Analysis**

The check-in system collects energy + mood 1–5 twice daily. After 30+ days, there are patterns: worst energy day of week, time-of-month patterns, correlation with workout days/rest days, correlation with sleep scores. None of this is surfaced. A simple "Your Patterns" card on the Life Hub home page after 30+ days of check-in data: "Your Tuesday energy averages 2.1 — lowest day of the week. Your Friday energy averages 4.3 — highest. This pattern holds regardless of workout schedule." This is the kind of personal insight that makes the app feel like it actually knows you.

**I. Food Logging Streak + Consistency Score**

Study hub has a 30-question/day streak. Life Hub has no equivalent engagement mechanic. A food logging consistency score (percentage of days with ≥ 3 meal slots logged, rolling 7-day) on the Nutrition page would motivate the habit without being punitive. Not a streak (which breaks when you miss a day and feels bad) but a rolling average: "You've logged 6/7 days this week — that's your best consistency in a month." Feeds into coach_memory and Daily Brief framing.

**J. Cross-Feature Correlation Cards**

The app sits on top of an unusually complete personal dataset: sleep, workouts, nutrition, hydration, steps, HR, mood, energy, weight, supplements, stretches. No other app has all of this for one person. The unique value is surfacing correlations across these dimensions that the user would never notice themselves. A "Patterns Discovered" section on the Life Hub home or Overview page — max 2 cards, rotated weekly by the coach_memory Edge Function — showing things like:
- "On days you hit 8k+ steps, your dinner logged calories are 340 lower on average — you naturally eat less when you're more active."
- "Your sleep scores are 14 points higher when you log 80g+ protein. This may be related to tryptophan availability for serotonin/melatonin production."
- "Your highest energy check-ins all occur within 36 hours of a strength workout — your energy pattern is training-response, not sleep-response."
These are real discoveries from real data. This is the feature that would make a user show this app to everyone they know.

---

### SECTION 5 — Master DB Change Tracker for All Planned Work

| Column/Table | Change | Required By | Migration Timing |
|---|---|---|---|
| `stretch_logs.context` | ADD TEXT | Day Hub phase completion | Step 1 — before any Day Hub work |
| `workout_logs.coaching_feedback_read_at` | ADD TIMESTAMPTZ | Day Hub unread badge | Step 1 — before Day Hub Step 8 |
| `workout_log_sets.exercise_id` | Possible future ADD | PR robustness | Deferred — only if name mismatch becomes a problem |
| `push_subscriptions` | NEW TABLE | Phase M (push notifications) | Phase M — separate build |
| `push_notification_log` | NEW TABLE | Phase M | Phase M |

All other planned features use existing tables and columns. No schema changes beyond what's listed above are required for Steps 2–20.

---

### SECTION 6 — CLAUDE.md Updates Required When Each Step Ships

These are directory structure and feature description updates that must happen in the same commit as each step:

- **Step 2** (dates on plan page): update workout/page.js description to mention date display + Day Hub navigation
- **Step 4** (Day Hub): add `day/[dayIndex]/page.js` to directory structure under `life-hub/workouts/`
- **Step 12** (retire stretching page): remove `stretching/page.js` from directory structure; rename `stretching/library/page.js` → `stretches/page.js`
- **Step 13** (sidebar): update `LifeHubSidebar.js` description to reflect 4-item Workouts dropdown
- **Step 16** (photo log): add `ai-photo-log/route.js` to directory structure under `api/nutrition/`
- **Every step**: update relevant page and route descriptions when behavior changes

