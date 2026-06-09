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
- **MD notes are enforced by a pre-push git hook** (`.githooks/pre-push`) — pushes that change code files without updating `CLAUDE.md` and `build-notes.md` are blocked automatically. Run `npm run setup-hooks` once after cloning to activate it.
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
| `goals_profiles` | User's health goals profile — goals TEXT[], height_inches, weight_lbs, age, sex, body_composition, activity_level, daily_steps, target_weight_lbs, timeline, notes, ai_overview; UNIQUE on user_id |
| `body_measurements` | *(planned Phase 32)* Per-user dated body measurements — waist_in, hips_in, chest_in, left/right arm/thigh, neck_in; all NUMERIC nullable |
| `weight_logs` | *(planned Phase 32)* Per-user dated scale weight entries — weight_lbs NUMERIC; one entry per user per day |
| `daily_checkins` | *(planned Phase 33)* Energy + mood ratings per day — energy_level SMALLINT(1–5), mood_level SMALLINT(1–5), notes TEXT; UNIQUE on user_id + date |
| `water_logs` | *(planned Phase 34)* Per-user water intake entries — logged_at TIMESTAMPTZ, amount_oz NUMERIC; aggregate to daily total in queries |
| `supplement_stack` | *(planned Phase 35)* User's supplement list — name, dose, timing, nutrients JSONB, is_active; feeds micronutrient totals to nutrition dashboard passively |
| `supplement_profiles` | *(planned Phase 35)* Cached AI-generated supplement info cards — keyed by normalized supplement name, shared across all users |
| `progress_photos` | *(planned Phase 32)* User progress photo gallery — photo_url, taken_at DATE, description TEXT |
| `daily_briefs` | *(planned — Correlation Engine)* Cached daily "what should I do today" AI paragraph — keyed by user_id + date; regenerated once per day on first Life Hub load |
| `monthly_wraps` | *(planned)* Cached monthly wrap-up reports — report_data JSONB (aggregated stats across both hubs), ai_narrative TEXT; generated once on first visit, never re-called; UNIQUE on user_id + month |
| `nutrient_profiles` | *(planned)* Cached AI-generated nutrient encyclopedia entries — keyed by nutrient name, shared across all users; sections: what it does, cool facts, deficiency signs, toxicity, food sources, supplement notes |

---

## Recommended Build Order
*Each tier depends on the previous. Do not skip tiers — later features rely on data generated by earlier ones.*

**Tier 1 — Foundation (everything downstream depends on these)**
1. Phase 31 — Goals Setup Depth Fields (obstacles, motivations, dietary prefs, sleep hours, goal story) — richer AI context for every feature that follows
2. Phase 32 — Body Measurements + Weight Logging + Progress Photos — sets up trend data for wrap-ups and daily brief
3. Phase 33 — Daily Check-In Widget — the sooner this is live, the more data accumulates for readiness score and monthly wrap-ups

**Tier 2 — The Workout Loop (builds on Tier 1)**
4. Post-workout logging (with plan pre-loaded, inline plan reference, MET calorie burn)
5. Workout history + PR detection — build same session as logging
6. Progressive overload detection — ships with workout history
7. Travel mode per-day toggle — small add-on, build same session as logging
8. Yoga & stretching planner + library — needs active plan JSONB; build planner first, library second

**Tier 3 — Health Wiring**
9. Phase 34 — Water Intake Tracker
10. Heart Rate Tracker page (data already syncing, just needs UI)
11. Vercel Cron Job auto-sync (removes dependency on user visiting for fresh data)
12. Life Hub landing page — wire overview cards + readiness score (needs check-in, steps, sleep, HR all live)

**Tier 4 — Nutrition (biggest build — needs Tiers 1–3 complete)**
13. Phase 35 — Supplement Stack (build BEFORE nutrition dashboard so connection is native)
14. Full nutrition build — TDEE + weight loss rate selector + food logging + barcode scanner + My Foods + dashboard
15. Nutrient Encyclopedia (build alongside or right after nutrition dashboard — "are you getting enough?" needs logging data)

**Tier 5 — Intelligence Layer (needs real data from Tiers 1–4)**
16. Concept blind spot detection (needs wrong answer history — can build anytime but richer with more data)
17. "What should I do today?" AI daily brief (wait until sleep, steps, HR, check-in, workout history, nutrition, and study scores are all flowing — the paragraph is only as good as the data behind it)
18. Correlation Engine — daily snapshots + AI insights + correlation charts
19. Monthly Wrap-Up page (build the page structure early so it's ready; real reports won't populate until data exists)

**Tier 6 — Study Hub Enhancements (self-contained, interleave anytime)**
20. Focus / Pomodoro mode
21. "Explain this card" on flashcards
22. Advanced CCNA lab set
23. PWA conversion (last — after all features are stable)

---

## Future Features

> **Format:** Each item includes user intent, UX spec, data model notes, and AI context impact so it can be built the next day without re-discussing.

---

### Phase 31 — Goals Setup: Depth Fields
*Adds the context fields that make the AI overview and workout plan genuinely personalized rather than generic.*

**Biggest Obstacle(s)**
- Multi-select (pick all that apply): Time / Consistency / Diet & Nutrition / Past Injuries / Low Motivation / Not Sure Where to Start / Burnout / Stress / Lack of Support / Sleep
- After selecting, an optional text box appears: "Want to tell us more about your situation?" — free text, 3-row textarea
- Saves to `goals_profiles.obstacles TEXT[]` and `goals_profiles.obstacle_notes TEXT`
- AI impact: overview directly addresses what's gotten in the way before; workout plan avoids over-scheduling someone who cited "time" as obstacle

**Primary Motivation**
- Multi-select (pick all that apply): Look Better / Get Stronger / Live Longer & Healthier / Improve Athletic Performance / Reduce Pain or Discomfort / Mental Health & Stress Relief / Set a Good Example (family/kids) / Compete or Train for a Sport / Confidence
- After selecting, optional text: "Anything specific driving this?" — free text
- Saves to `goals_profiles.motivations TEXT[]` and `goals_profiles.motivation_notes TEXT`
- AI impact: changes the *tone* and framing of all recommendations — aesthetics-focused vs longevity-focused vs performance-focused people need completely different language and priorities

**Why These Goals?**
- Single open-ended textarea: "Tell us what's behind your goals — what made you decide to make a change, or what are you working toward?" — 4-row textarea, optional
- Saves to `goals_profiles.goal_story TEXT`
- AI impact: gives the AI the human context it needs to write an overview that actually resonates instead of sounding like a form letter

**Dietary Preference**
- Multi-select (pick all that apply): No Restrictions / Vegetarian / Vegan / Pescatarian / Keto / Low-Carb / Gluten-Free / Dairy-Free / Intermittent Fasting / Halal / Kosher / Other
- Optional text: "Anything specific about how you eat?" — free text
- Saves to `goals_profiles.dietary_prefs TEXT[]` and `goals_profiles.dietary_notes TEXT`
- AI impact: nutrition section recommendations, supplement advice, and calorie framing all depend on this heavily

**Sleep Hours**
- Simple number input: "How many hours of sleep do you typically get?" — range 3–12, step 0.5
- Saves to `goals_profiles.sleep_hours NUMERIC`
- AI impact: under-slept users get explicitly different recovery volume and intensity advice; maps to better_sleep goal if present

**DB migration needed:** Add columns `obstacles TEXT[], obstacle_notes TEXT, motivations TEXT[], motivation_notes TEXT, goal_story TEXT, dietary_prefs TEXT[], dietary_notes TEXT, sleep_hours NUMERIC` to `goals_profiles`

**UX:** Add these as a new **Step 3 — Your Context** between the current Starting Point and the finish. Step count goes from 3 → 4. Progress bar updates to 4 segments. All fields optional so nobody gets blocked.

---

### Phase 32 — Body Measurement Tracking (own page)
*Separate page at `/life-hub/goals/measurements`. Tracks waist, hips, chest, arms, thighs etc. over time — the only reliable way to see body composition change independent of scale weight.*

**The Problem It Solves**
Scale weight is a terrible progress indicator when building muscle + losing fat simultaneously. Someone can work hard for 3 months and see no weight change while losing 2 inches off their waist. This page makes that progress visible.

**Page: `/life-hub/goals/measurements`**
- Sidebar nav entry under Goals dropdown: "Measurements"
- Header: "Body Measurements" with a "Log Today's Measurements" button
- Explainer section at the top (collapsible after first visit): what measurements to take, what equipment you need (just a soft tape measure), and how to do each one correctly with brief instructions. Cover:
  - Waist: measure at the narrowest point, usually just above the belly button, exhale normally before measuring — do not suck in
  - Hips: widest point of your hips/glutes, feet together
  - Chest: across the fullest part, arms relaxed at sides, after a normal exhale
  - Left Arm / Right Arm: flexed, at the peak of the bicep
  - Left Thigh / Right Thigh: mid-thigh, standing, weight evenly distributed
  - Neck: just below the Adam's apple
  - Note: always measure the same time of day (morning before eating is best), same amount of clothing, same body position
- Log form: date picker (defaults today) + inputs for each measurement in inches (all optional — log only what you want to track)
- History: table of past logs sorted newest-first with change indicators (green ↓ for waist/hips if losing, green ↑ for arms if building)
- Chart view: line chart per measurement over time (toggle which measurements to show)

**Weight logging** — "Log Today's Weight" input lives on this page alongside body measurements, not on the Goals page. goals_profiles holds only the one-time starting weight; actual tracked weight over time lives in a separate `weight_logs` table with dated entries. Show a line chart of weight over time with the target weight from goals_profiles as a goal line — this is the only real way to see if you're moving toward your target. Change indicators on the history table: green ↓ if trending toward goal weight, red ↑ if moving away.

**DB:** New tables:
- `body_measurements` — user_id, logged_at DATE, waist_in, hips_in, chest_in, left_arm_in, right_arm_in, left_thigh_in, right_thigh_in, neck_in (all NUMERIC nullable)
- `weight_logs` — user_id, logged_at DATE, weight_lbs NUMERIC; one entry per day

**Progress photos** — "📸 Progress Photos" button on the measurements page opens a modal gallery. Grid of all photos, newest first, each card shows thumbnail + date + first line of description. Click any photo to expand full-size with full description below and an edit pencil for the description. "Add Photo" button in the top corner of the gallery — clicking it shows a two-step flow: Step 1 is photo tips (shown automatically on first visit, collapsed after that so it doesn't get in the way every time), Step 2 is the upload form (pick photo, date picker defaulting to today, optional description). Photo tips content to include: same spot every time (blank wall or bathroom mirror, not a messy background); same time of day every time (morning before eating — your body looks meaningfully different morning vs evening); same lighting (natural light from a window in front of you); three angles minimum: front, side profile, back — these tell completely different stories; consistent outfit or no shirt — comparing tank top to no shirt makes changes impossible to see; natural posture for "before" photos, don't suck in or flex; if flexing for a comparison photo, flex the same way every time; hold phone at chest height, not below (below creates distortion). Framing: "You'll thank yourself later for taking these seriously now. A blurry photo at a weird angle six months from now tells you nothing. Two minutes of setup today makes the comparison genuinely meaningful." DB: `progress_photos` table — user_id, photo_url, taken_at DATE, description TEXT, created_at.

**AI integration:** Latest measurements and recent weight trend injected into generate-plan context — "waist trending down 1.5in over 60 days" or "weight down 6 lbs in 8 weeks" tells the AI the plan is working and should maintain current approach

---

### Phase 33 — Daily Check-In Widget (Life Hub Home)
*30-second daily log on the Life Hub landing page. Seeds the correlation engine data layer.*

**Widget on `/life-hub`**
- Shows at top of Life Hub home if not yet checked in today
- Two sliders or emoji-tap rows: Energy today (1–5) and Mood today (1–5)
- Optional one-liner: "Anything notable today?" — single-line text input
- Submit button saves and dismisses widget for the day
- After submission: shows today's check-in as a compact summary row

**History / Trends**
- 28-day heatmap below the widget (similar to DailyStreak) — color intensity by average energy+mood
- Visible patterns: "You've averaged 3.2 energy on Mondays vs 4.1 on Fridays"

**DB:** New table `daily_checkins` — user_id, date DATE (unique per user), energy_level SMALLINT (1–5), mood_level SMALLINT (1–5), notes TEXT, created_at

**Correlation engine hook:** Check-in data eventually joins with sleep, steps, test scores for AI insight generation

---

### Phase 34 — Water Intake Tracker
*Simple, high-engagement daily hydration tracker. Lives on the Life Hub home or its own page.*

**UX**
- Daily goal defaulting to 8 cups (64 oz) — user can adjust in settings or inline
- Big tap-to-add button: "+ 1 Cup" (8 oz) with a secondary "+ Custom" for other amounts
- Progress ring or bar showing cups today vs goal
- Green ring fills as you log; completes with a small animation when goal hit
- Today's log list: timestamps of each entry with delete option
- 7-day history: daily totals as a small bar chart below today's tracker

**DB:** New table `water_logs` — user_id, logged_at TIMESTAMPTZ, amount_oz NUMERIC; aggregate to daily in query

**AI context:** daily average hydration passed into generate-overview and nutrition recommendations — under-hydrated users get hydration called out explicitly

---

### Phase 35 — Supplement Stack
*Not a daily check-off tracker — a persistent stack that feeds nutrition data automatically and gives the AI full context on what the user takes.*

**What it is**
The user maintains a list of supplements they take regularly (their "stack"). These are not logged daily — they're set-and-forget entries that automatically contribute their nutrients to the nutrition dashboard every day. If someone takes creatine with BCAAs, those amino acids count toward their daily totals without re-logging. Vitamin D, magnesium, zinc — all passively add to micronutrient tracking.

**UX**
- My Supplement Stack: list of supplements the user takes (name, dose, timing: morning/afternoon/evening/with meals, nutrient content)
- Add supplement form: name + dose + timing + optional nutrient data (user can enter what's on the label — e.g. vitamin D: 2000 IU, zinc: 15mg); if they don't know nutrient content, they can leave it blank and the AI card will still show general info
- Edit / remove any supplement at any time
- AI info card per supplement (generated on demand, cached): what it does, typical dosing, best time to take, synergies with other supplements, common interactions, food sources if applicable — uses claude-sonnet-4-6

**Nutrition connection**
When the nutrition dashboard loads, it queries the user's supplement stack and adds each supplement's nutrient content to that day's micronutrient totals. No action needed from the user — it just works. This must be built as a connected system from day one, not bolted on after.

**DB:** New tables:
- `supplement_stack` — user_id, name, dose, timing, nutrients JSONB (nutrient_name → amount + unit), is_active, created_at
- `supplement_profiles` — supplement name (normalized), ai_profile TEXT, generated_at (shared/cached across all users — same pattern as question_templates)

---

### Life Hub — Health (remaining)
- **Heart Rate Tracker page** — hourly HR chart, resting HR, peak HR, zone breakdown (Rest/Fat Burn/Cardio/Peak)
- **Vercel Cron Job auto-sync** — scheduled server-side job syncing Google Health data every 30–60 min without user loading the page
- **Health Overview wiring** — connect landing page cards with live Supabase data
- **Weekly/monthly sleep trends** — avg sleep per night over 7/30 days, trend line, goal line (8h)

---

### Life Hub — Nutrition (full build)
- **Calorie & macro target calculation (TDEE)** — daily calorie goal is NOT hardcoded; it is calculated from goals_profiles using the Mifflin-St Jeor formula (height, weight, age, sex → BMR, then multiplied by activity level multiplier). Macro splits adjust by goal: muscle building = higher protein target (~0.8–1g per lb bodyweight), weight loss = moderate deficit, maintain = at TDEE. This runs at goals setup completion and whenever the profile is updated. No personalized calorie goal = nutrition dashboard is meaningless.
- **Weight loss rate selector** — user picks their target pace: 0.5 / 1.0 / 1.5 / 2.0 / 2.5 lbs per week. The deficit is calculated from this (1 lb/week = ~500 cal/day deficit). Hard floors enforced regardless of selection: never below 1,200 cal/day for women, 1,500 cal/day for men — if the selected pace would push below that floor, warn the user and cap it. Also show a note that anything above 1.5 lbs/week increases the risk of muscle loss, nutrient deficiencies, and burnout. Surface a recalibration prompt after 2 weeks of consistent logging if actual weight change doesn't match predicted pace — this is how the system self-corrects rather than staying wrong forever.
- **Calorie burn / net calories** — post-workout logging captures estimated calories burned using MET values by workout type applied to bodyweight and duration: strength training MET 3.5–5, moderate cardio MET 5–7, HIIT MET 8–10; ALWAYS use the LOW end of each MET range intentionally (underestimate, never overestimate — an overestimate causes someone to eat back calories they didn't actually burn and flatlines their deficit). Nutrition dashboard shows gross calories eaten AND net calories (eaten minus burned). Critical for accurate deficit/surplus tracking.
- **Food logging** — calories, macros, micronutrients (B12, magnesium, potassium, vitamin D, iron, zinc, calcium, omega-3, fiber, sodium) tracked against RDVs; each meal entry includes a timestamp and meal type (breakfast/lunch/dinner/snack) so timing context is available for IF users and workout nutrition timing
- **Barcode scanner** — scan packaging via phone camera, auto-populate from Open Food Facts; full nutrition preview shown before saving — user can manually add or edit any missing/incorrect fields before confirming
- **Manual food entry** — full nutrition fields form when no barcode available
- **My Foods library** — personal library of frequently eaten foods, organized by category, one-tap logging; user can add new foods, remove foods, and edit/update nutrition facts on any saved food at any time
- **Supplement stack → nutrition integration** — supplements are NOT a daily check-off tracker; instead the user maintains a supplement stack (name, dose, timing, nutrient content) that feeds automatically into the nutrition dashboard. Creatine with BCAAs contributes to amino acid totals; vitamin D supplement counts toward vitamin D RDV; all supplements on their stack add to micronutrient totals passively every day without re-logging. AI can see the full supplement stack when generating recommendations. DB: `supplement_stack` table — user_id, name, dose, timing, nutrients JSONB (nutrient name → amount per dose). Build nutrition dashboard and supplement stack as connected from day one — do not silo them.
- **Daily nutrition dashboard** — calories eaten vs goal, net calories (eaten minus burned), macro ring charts, meal history by day, micronutrient progress bars against RDVs (supplement contributions included)
- **Nutrition history** — past days/weeks, average macros, trend charts; targets personalized using goals_profiles (dietary_prefs, weight goal, body composition)
- **Vitamin/nutrient encyclopedia** — full reference page at `/life-hub/nutrition/encyclopedia`. Three entry points coexist on the same page without competing:

  **Rotating symptom prompts (top of page)** — a soft banner that cycles through everyday-language symptom questions with a gentle fade transition every few seconds while the user browses. Written the way people actually think, not clinically: "Do your muscles cramp at night?" / "Do you feel anxious for no real reason?" / "Is your hair thinning?" / "Do you get sick more than twice a year?" / "Do you wake up tired even after a full night's sleep?" / "Do you have trouble focusing?" / "Are your nails brittle?" / "Do you feel sluggish in the afternoon?" Each prompt is clickable — tapping it goes straight to the relevant nutrient entries. The rotation keeps cycling while they browse so different prompts catch their eye on different visits. This creates awareness people didn't have when they landed — most people don't self-identify as having symptoms; they just think everyone feels that way until a specific question makes them pause.

  **"Find My Symptoms" button** — always visible, sticky at top right. For the user who already knows they want to investigate something specific. Opens a full symptom selector grid — tap everything that applies, see ranked nutrient results with a one-line explanation of the connection per result.

  **Browse section** — full encyclopedia below the prompt banner. Searchable by name. Filterable by category (Vitamins / Minerals / Amino Acids / Fatty Acids) and by goal (Sleep / Energy / Muscle & Recovery / Fat Loss / Immune Health / Mental Focus / Bone Health / Heart Health). Each nutrient shown as a card with name, one-sentence description, and personalized relevance badge if it connects to their goals_profiles data.

  **Individual nutrient entry** — opens as a full page or large modal. Sections in this order:
  - **What it actually does** — plain English paragraph, written like explaining to a friend, no jargon
  - **Cool facts** — 2–3 genuinely interesting things most people don't know (e.g. "Magnesium is involved in over 300 enzymatic reactions in your body" / "Your body stores almost no vitamin B12 — it relies entirely on regular intake") — the things that make people go "huh" and actually remember it
  - **Signs you might not be getting enough** — specific and honest, not vague ("muscle twitches especially at night, difficulty sleeping, anxiety, constipation" — not just "fatigue")
  - **What happens if you get too much** — the section nobody includes and everybody should; some nutrients are harmless in excess, others are genuinely dangerous (vitamin A toxicity, iron overload, too much zinc suppresses copper); being honest about this builds trust
  - **How to get it from food** — actual foods with approximate amounts per serving, not just "eat vegetables"
  - **Supplement notes** — typical dosing, best time of day, what to take it with or avoid, interactions; cross-references their supplement stack if they have one ("You take calcium and iron together — these compete for absorption; consider spacing them 2 hours apart")
  - **Relevance to you** — personalized section at the bottom; shows which of their goals connect to this nutrient; shows their 30-day average intake vs RDV once nutrition logging is active; supplement stack interaction warnings if applicable

  **Generation & caching** — each entry generated once via claude-sonnet-4-6 and cached in a shared `nutrient_profiles` table keyed by nutrient name (same pattern as supplement_profiles — one entry shared across all users, never regenerated unless manually triggered). Personalized elements (relevance badges, intake comparison, stack warnings) calculated client-side from the user's own data — no AI call needed for those.

---

### Life Hub — Workouts (remaining)
- **Post-workout logging** — opens with today's active plan pre-loaded (pulls from workout_plans JSONB for today's day_of_week); the log screen shows the planned sets/reps/weight from the plan as a visible reference right next to the input fields (e.g. "Plan: 3×10 @ 25 lbs" displayed beside the actual inputs) so the user never has to jump between pages mid-workout; user fills in actual sets/reps/weight done; "Complete Workout" saves session, triggers AI check-in, and logs estimated calories burned (duration + workout type using MET underestimate approach)
- **Progressive overload detection** — after each workout is logged, check each exercise: if the user hit the top of their rep range (e.g. logged 12 reps when plan says 10–12) for 3 consecutive sessions at the same weight, surface a suggestion on the workout log complete screen: "You've maxed your rep range on Dumbbell Bench Press 3 sessions in a row — consider moving to 25 lbs next session." Store per-exercise overload state in workout history. Do not suggest increasing weight if the user didn't hit the top of the range — only flag genuine readiness to progress. This is the single most common thing coaches do manually that no app does automatically.
- **Travel / bodyweight-only mode** — per-day toggle on each workout day card on the plan page: "✈️ Traveling today." Switches just that day to a bodyweight-only version of the same workout. Does not affect any other day and does not overwrite the saved plan — the original day reverts automatically the next time that day comes around. Generates the travel version on demand using the existing generate-plan route with equipment forced to bodyweight only.
- **Pre/post workout nutrition timing** — add optional workout time field to each workout day card on the plan page (e.g. "6:00 PM"). When a time is set, the card shows a collapsible "Nutrition Timing" section explaining specifically what to eat and when, with the "why it matters" reasoning included — not just instructions: Pre-workout (shown as a calculated time window, e.g. "4:30–5:30 PM"): 30–40g protein + moderate carbs — "carbs spare muscle glycogen so you're not running on empty by set 4." Post-workout (within 60 min of finishing): 30–40g protein, limit fat in this window — "muscle cells are most receptive to amino acids in this window; this is when protein synthesis peaks." Content adjusts by workout type (strength vs cardio have different fueling needs). On the post-workout log complete screen, show a one-line reminder of the post-workout window with the reasoning. No push notifications needed — the value is contextual education, not timed alerts.
- **Workout history** — past sessions with volume over time, PRs per exercise; PR = heaviest weight ever logged for that exercise (single definition — no 1RM/5RM complexity); surface a PR badge on the workout complete screen when a new max is hit; show per-exercise PR history on the workout history page
- **Yoga & stretching planner** — AI-generated rolling weekly plan (always shows 7 days ahead from today); queries active workout_plans JSONB to determine muscle groups scheduled each day BEFORE generating stretches — arm day gets shoulder/bicep/tricep stretches, leg day gets hip flexor/quad/hamstring stretches, rest days get full-body recovery flows; includes pose name, hold duration, and form tips; re-generates when the active workout plan changes
- **Yoga & stretching library** — organized by body region targeted (shoulders, chest, hips, hamstrings, quads, lower back, etc.); card/modal pattern same as exercise library; each entry has photo, hold duration, step-by-step form instructions, what to feel, and common mistakes to avoid

---

### Life Hub — Landing Page
- **Wire overview cards** — connect all landing page cards with live data from every connected source (steps, HR, sleep, nutrition, check-in)
- **Daily readiness score** — composite 0–100 score on the Life Hub home; 6 components, each a named constant in code so weights are tunable without re-architecting. Starting weights: sleep quality last night (0–20), sleep consistency rolling 3-night average — one bad night after 6 good ones is very different from a third consecutive bad night (0–15), resting HR vs personal 30-day rolling baseline — scored relative to the user's own typical HR, not an absolute number (0–15), steps vs daily goal (0–15), workout recovery load — reduces score based on how hard the user trained in the last 48 hours and how many consecutive training days they've had; requires workout logging to be built first, defaults to neutral until data exists (0–20), subjective energy/mood from daily check-in — self-reported feel is one of the strongest readiness signals and conflicts between objective score and low self-report should be surfaced explicitly, not ignored; defaults to neutral on days with no check-in (0–15). Total = 100. Hydration component (from Phase 34 water tracker) to be added when that data exists — redistribute weights at that time. Each component weight is a single named constant; tuning is a one-line change.
- **"What should I do today?" AI recommendation** — one short paragraph on the Life Hub home, generated fresh each day, that reads ALL available data (readiness score, sleep last night, last workout logged, steps trend, nutrition completeness, check-in energy/mood, exam date countdown from study hub) and gives a single actionable recommendation. Not a dashboard — a *paragraph*. Examples: "Your readiness is 58 and you trained legs hard yesterday. Today do a light upper body session or go for a walk — don't push heavy. Your CCNA is in 34 days and your sleep has been under 6 hours 4 of the last 7 nights; that's affecting your study retention more than your workout volume is." This is the feature no competitor has — it connects fitness data to study performance in plain language. Generated via claude-sonnet-4-6 with the full data context injected. Cache result for the day (regenerate once per day at first page load) — do not call the API on every visit. Store in `daily_briefs` table keyed by user_id + date.

---

### Monthly Wrap-Up Page
*A full-picture monthly report spanning both hubs — the feature that makes users feel like the app actually knows them.*

**Page: `/wrap-up`** (top-level, not nested under Study or Life Hub — it spans both)
- Sidebar entry in both hubs or the main nav
- On first visit before any month has completed: page is greyed out with a lock icon and a countdown — "Your first wrap-up unlocks in X days." Shows a skeleton preview of what the report will look like so users know what they're working toward, not just a blank page.
- After the first month completes: one card per completed month, newest at top. Click any card to open that month's full report. Each card shows month name + a one-line AI teaser (e.g. "Your strongest study month yet — accuracy up 11%").

**Report sections (each section is omitted gracefully if that data doesn't exist yet, with a nudge to start logging for future wrap-ups):**

*Study* — total questions answered, avg accuracy vs prior month (delta shown), domains that improved most, domains still weak, predicted score change, total study time, streak days hit

*Fitness* — workouts completed vs planned (e.g. "9 of 12"), PRs hit this month with exercise names, progressive overload milestones reached, total volume lifted if trackable

*Health* — avg nightly sleep vs prior month, avg daily steps vs prior month, avg resting HR vs prior month, best sleep week, most active week

*Nutrition* — avg daily calories vs target, macro consistency score, days on target (section omitted until nutrition is built)

*Body* — weight change if logged (start vs end of month), measurement changes if logged, progress photo from this month if any (thumbnail shown inline)

*Mindset* — avg energy and mood from daily check-ins, best week vs worst week, any notable patterns (e.g. "Energy averaged 4.2 on days with 10k+ steps vs 2.8 on sedentary days")

**AI narrative** — the report closes with a 3–4 sentence AI-written paragraph synthesizing the whole month across both hubs. Not bullet points — a *story*. Example: "January was your strongest study month yet — accuracy up 11% — and it coincided with your best sleep average in three months. You hit 9 of 12 planned workouts and set two PRs. The one pattern worth watching: your energy check-ins dropped in the last week alongside your sleep dipping below 6 hours. February's opportunity: protect your sleep in the back half of the month and your study scores will follow." Generated via claude-sonnet-4-6 with the full month's aggregated data injected as context.

**Generation logic** — generated once on the first visit to that month's report, then cached permanently. Never re-calls the API on repeat visits. If a section has no data, it is skipped with a one-line nudge to enable that feature for next month's report.

**DB:** New table `monthly_wraps` — user_id, month (YYYY-MM), report_data JSONB (aggregated stats), ai_narrative TEXT, generated_at TIMESTAMPTZ; UNIQUE on user_id + month

---

### Correlation Engine
- **Daily snapshots** — background job saves combined study + health data to Supabase daily
- **AI insights** — Claude surfaces patterns (e.g. "test scores 12% higher after 7+ hours sleep", "energy avg 4.1 on days with 10k+ steps")
- **Correlation charts** — scatter plots / trend lines: study score vs sleep, steps, protein, HR, energy check-in
- **Morning brief page** — daily summary: yesterday's health snapshot + today's study recommendation + one AI insight

---

### Study Hub (remaining)
- **Focus / Pomodoro mode** — distraction-free timed study session. Setup: pick cert, content type (questions / flashcards / mixed), duration (15 / 25 / 45 min). Once started: full-page layout — no sidebar, no nav, no floating chat, just the content centered on screen with a small countdown timer in one corner and an "End Session Early" button that requires a confirm click so it can't be fat-fingered. Questions work exactly like practice mode (answer → feedback → next, keep generating until timer ends); flashcards cycle through weak ones first; mixed alternates concept card → question. Timer cannot be paused — only ended early with a confirm. When timer hits zero, session ends automatically and drops into a summary screen: time studied, questions answered, accuracy, domains covered, streak contribution. The summary screen is what makes users feel accomplished and return tomorrow.
- **"Explain this card" on flashcards** — single 🤖 button on every flashcard in a study session; fires a Claude prompt explaining the concept on that card in plain language with an example; response shown inline in a small panel below the card without leaving the session. No competitor does this. Anki doesn't, Quizlet doesn't. Cached per card so repeat visits don't re-call the API.
- **Concept blind spot detection** — not just weak domains, but weak *concepts within domains*. After enough wrong answers accumulate, surface a "Your Blind Spots" section per cert: "You've missed 7 questions about OSPF cost calculation in the last 14 days — here's a quick explanation." AI-generated, specific to the exact concept the question_snapshot data reveals they're missing. Lives on the cert overview page below the domain chart.
- More concept cards in Study Mode
- Exam countdown timer with target date
- Advanced CCNA lab set (spanning tree deep dive, advanced OSPF, BGP intro)
- PWA conversion (add to home screen, offline support)

---

### Settings — Reset Pattern (enforced rule)
Every new Life Hub feature that generates loggable data **ships with a reset row in Settings → Data & Reset in the same build session**. Do not finish a feature and leave the reset for later. Features that will need reset rows when built: water_logs, supplement_stack, daily_checkins, body_measurements, weight_logs, nutrition food logs, workout sessions. Use the same button style and confirmation modal pattern already established in Phase 28.

---

### Security
- Two-factor authentication (placeholder exists in Settings → Security section)
- Password change from within the app

---

## Phase Log
*(Newest phase first)*

### Phase 30d - Complete
Activity level revamp + daily steps field:
- `ACTIVITY_LEVELS` descriptions rewritten around total daily movement (steps/day ranges baked in) rather than gym sessions only; someone with 15k steps/day now clearly lands in "Very Active"
- `daily_steps` INTEGER column added to `goals_profiles` via migration
- `goals/setup/page.js`: daily steps optional input added to Step 2 (Starting Point) below activity level; prefills from existing profile
- `goals/page.js`: Daily Steps row shown in Lifestyle card
- `generate-overview/route.js` + `generate-plan/route.js`: daily_steps appended to activity level context line; workout plan prompt notes strong cardio base if steps are high

### Phase 30c - Complete
Goals gate overlay + body composition selector + BMI disclaimer:
- Gate pages now show a centered overlay ("Complete your Goals Setup first" + "Take me there →") instead of hard-redirecting — applies to workouts, workouts/setup, and nutrition
- Body composition selector added to Step 1 (Your Body) — sex-dependent options with plain-language labels and body fat % ranges; clearing sex resets body composition selection
- Male-only "💀 Holy Sh*t" option (50%+) triggers a meme modal: "You must be kidding me" — confirms remaps to 'obese' before advancing; "No wait, I lied" lets them go back and fix it
- BMI disclaimer added to Goals overview page below weight: warns that BMI doesn't account for muscle mass
- Body composition label shown in Body Metrics card on Goals page
- `generate-overview/route.js`: body_composition passed to AI with muscle-specific note (lean/athletic builds told to ignore BMI as indicator)
- `generate-plan/route.js`: body_composition included in body context block with workout-specific guidance (e.g. obese → joint-friendly progressions)
- `goals_profiles` table: `body_composition TEXT` column added via migration

### Phase 30b - Complete
Goals profile reset added for testing:
- `src/app/api/reset/route.js`: added `goals_profile` scope — deletes `goals_profiles` row for the user
- `src/app/settings/page.js`: Goals section added at the bottom of Data & Reset with a Reset button and confirmation modal

### Phase 30 - Complete
Goals & Body Metrics — full setup flow, overview page, gating, and AI integration. Current state after all 30a–30d sub-phases:

**What's built and live:**
- `goals_profiles` table: goals TEXT[], height_inches, weight_lbs, age, sex, body_composition, activity_level, daily_steps, target_weight_lbs, timeline, notes, ai_overview; RLS user-scoped; UNIQUE on user_id
- `src/app/life-hub/goals/setup/page.js`: 3-step onboarding
  - Step 1 — Your Goals: multi-select 8 goal options
  - Step 2 — Your Body: height, weight, age, sex, body composition (sex-dependent selector with % ranges; Male has "💀 Holy Sh*t" 50%+ option that triggers meme modal → remaps to obese), target weight
  - Step 3 — Starting Point: activity level (descriptions include step ranges, not just gym sessions), daily steps optional input, timeline, notes
  - Supports `?redirect=<path>` — routes back to intended destination after finish
  - Prefills from existing profile on revisit
- `src/app/api/goals/generate-overview/route.js`: POST — builds personalized prompt from full profile including body_composition and daily_steps context, calls Claude, saves to ai_overview column
- `src/app/life-hub/goals/page.js`: shows AI overview panel, active goals chips, body metrics card (BMI + disclaimer noting muscle mass caveat + build label), lifestyle card (activity level + daily steps + timeline), notes
- `src/components/LifeHubSidebar.js`: Goals dropdown (My Goals + Setup) added between Overview and Health; auto-opens on `/life-hub/goals/*`
- Gate overlay on `/life-hub/workouts`, `/life-hub/workouts/setup`, `/life-hub/nutrition`: shows centered "Complete your Goals Setup first" prompt with "Take me there →" button instead of hard redirect
- `src/app/api/workouts/generate-plan/route.js`: fetches goals_profiles at plan generation time; injects age/sex/height/weight/body_composition/daily_steps/activity/target/timeline/life-goals into AI prompt
- Settings → Data & Reset: Goals Profile reset section added (scope: goals_profile)

### Phase 29 - Complete
Shared flashcard decks + owner-only generation and write actions:
- Flashcard decks are now shared across all users — cards are stored once (by the owner) and readable by everyone
- Supabase RLS updated: `flashcards` SELECT policy changed to `true` (all authenticated users); write operations still require `auth.uid() = user_id`
- `generate-flashcards/route.js`: owner-only gate (403 for non-owner); dedup check now queries all cards for that cert, not just owner's
- `generate-templates/route.js`: owner-only gate (403 for non-owner)
- `flashcards/page.js`: Generate Deck and Add 40 More buttons only render for the owner; non-owners see "No cards yet — check back soon" when deck is empty
- `templates/page.js`: Generate Templates panel only renders for the owner; coverage table still visible to all
- `StudySession.js`: + Add Card button and Add Card modal both hidden for non-owners (button not rendered + modal gated on isOwner)
- `premade-templates/page.js`: Retire This One (duplicates tab), Retire Template (browse tab), and ↩ Restore (retired tab) buttons all hidden for non-owners
- Reset route updated: per-cert and all_study resets now only delete `flashcard_progress` (user's own progress), never touch the shared `flashcards` table
- Settings descriptions updated to say "flashcard progress" instead of "flashcards"

### Phase 28 - Complete
Settings — Data & Reset section:
- New section in Settings page between Connected Apps and Security
- Per-cert reset (CCNA / Network+ / Security+): deletes question_answers, topic_performance, test_sessions, paused_tests, flashcard_progress for that cert (shared flashcard deck untouched)
- All study data reset: all of the above across all certs + bookmarked_questions + flagged_questions
- Workout plan reset: deletes workout_plans — keeps fitness profile so the user can regenerate without redoing setup
- Full workout reset: deletes workout_plans + workout_profiles — returns user to 7-step setup on next visit
- Goals profile reset: deletes goals_profiles row — re-triggers gate overlay on workouts/nutrition until setup is completed again
- All resets require a confirmation modal (⚠️) with explicit "Yes, Reset" button — cannot be triggered accidentally
- Success/error message displayed inline after completion
- API route: POST /api/reset with { scope: 'cert'|'all_study'|'workout_plan'|'workout_profile'|'goals_profile', cert? }
- Pattern: as new Life Hub sections are added, their reset row gets added here with the same button style

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
