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
| `food_cache` | Shared OFFs results — barcode (unique), full macro + micro fields (27 total), servings_per_container, source; cached permanently (ODbL license); no RLS |
| `my_foods` | User food library — name, brand, serving_size_label, servings_per_container, all 27 nutrition fields, last_logged_at, log_count, is_pinned, is_drink; RLS user-scoped |
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

---

## Untested — Needs QA
Remove items once tested and confirmed working.

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

**4. Orphaned Inputs — Wire Up Remaining** — ✅ Built (Phase 55)
- `biggest_obstacles` → workout plan AI prompt (injury-aware adjustments)
- `primary_motivations` + `why_goals` → Daily Brief personalization (tone shaping)
- `sleep_hours` → Daily Brief sleep target vs actual gap when relevant

---

### 🍎 Nutrition

**5. Pre/Post Workout Meal Advisor** — ✅ Built (Phase 51)

**10. Supplement Logs Table + Adherence Tracking** — ✅ Built (Phase 51)

---

### 🧘 Stretching & Mobility

**11. Full Stretching & Mobility Section** — ✅ Built (Phase 54)

---

### ❤️ Health & Recovery

*(Soreness tracking and chronic pain follow-up are covered under Stretching & Mobility above. No additional items currently.)*

---

### 🏋️ Workouts

*(No new items. Yoga/flexibility exercises will be added to the `exercises` table and `stretches` table as part of the Stretching & Mobility section.)*

---

### 📊 Cross-Cutting Intelligence

*(Age-adjusted micronutrients and dietary preference wiring above cover the main cross-cutting intelligence work. No additional items currently.)*

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
- PWA conversion — service workers require HTTPS
- Barcode scanner — camera API requires HTTPS in most browsers

---

## Phase Log

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
