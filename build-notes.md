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

### 🔔 Push Notifications + App Personality — 📋 Fully Specced

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
