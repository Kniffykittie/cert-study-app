# Cert Study App - Build Notes

## Project Overview
A personal command center combining a study platform for CCNA, CompTIA Network+, 
and Security+ certifications with a life tracking hub for health, nutrition, and wellness.

## Tech Stack
- **Frontend:** Next.js 16.2.7 (App Router, `src/` directory, Turbopack)
- **Backend:** Supabase (PostgreSQL + RLS)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Hosting:** Vercel
- **Version Control:** GitHub
- **Styling:** Inline styles only — no Tailwind classes in JSX (switched during build)

## Architecture
Three section approach:
- **Home Page** — morning brief snapshot, two door navigation into Study Hub and Life Hub, insights and patterns section
- **Study Hub** — all cert studying features
- **Life Hub** — health, fitness, and nutrition tracking
- **Correlation Engine** — AI powered insights connecting both hubs

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

## Key Features Planned

### Study Hub
- AI generated test questions per cert and topic
- Performance tracking per question and topic
- Spaced repetition system
- Confidence rating per answer
- Weakness heatmap
- Adaptive study sessions targeting weak spots
- Exam simulation mode with timer
- In context AI tutor per question
- Predicted readiness score
- Cross cert overlap highlighting
- Study streak and milestones

### Life Hub
- Fitbit / Google Fit integration
- Sleep tracking display
- Workout logging and history
- Daily health readiness score
- Activity and steps tracking
- Full nutrition logging with calories, macros, vitamins and minerals
- Supplement and vitamin logging with AI generated profiles
- Consistency tracking for daily supplements
- Supplement interaction and timing recommendations
- Vitamin and nutrient encyclopedia with AI generated explanations
- Real time AI nutrition insights throughout the day
- Proactive alerts for low protein, hydration, key vitamins
- Barcode scanning via Open Food Facts or Nutritionix API
- Full nutrition label auto population from barcode scan
- Manual food entry form with full nutrition fields
- My Foods personal library for frequently eaten foods
- Category organization within My Foods folder
- One click logging from My Foods library
- Edit any logged food entry to correct or add missing nutrition data
- Save any scanned or searched food directly to My Foods folder

### Correlation Engine
- Daily snapshots table in Supabase combining study and health data
- AI generated insights correlating sleep, exercise, and study performance
- Actionable recommendations based on personal patterns
- Correlation charts showing trends over time
- Nutrition to study performance correlation tracking
- Proactive study recommendations based on nutrition and sleep data
- Pattern detection such as protein intake vs test score averages

### General
- General purpose Claude chat section built into the app
- Restructure routing to support Home, Study Hub, and Life Hub architecture

## Agent vs Simple API Call
Features requiring Claude agent architecture with tool use:
- Correlation Engine insights
- Proactive nutrition and health alerts
- Daily morning brief generation
- Adaptive study recommendations

Features using simple API calls:
- Practice question generation
- Wrong answer explanations
- In context tutor per question
- Vitamin and nutrient encyclopedia
- Supplement profiles
- General chat section

## Architecture Decisions
- src/ directory structure
- App Router for page routing
- Tailwind for styling
- Row Level Security enabled in Supabase from day one
- Private GitHub repository
- Environment variables stored in .env.local and Vercel dashboard
- Agent features built in Phase 8 and beyond once data infrastructure is in place
- PWA conversion after core features are built

## Security Plan
- Login and signup via Supabase Auth
- Two factor authentication
- Row Level Security on all Supabase tables
- Private GitHub repository
- API keys in .env.local — never committed to GitHub
- Vercel password protection on live URL
- All user data siloed by user ID

## App Delivery
- Progressive Web App (PWA) after core features are built
- Add to Home Screen support for iOS and Android
- Full screen native app feel on mobile
- Barcode scanning via phone camera works natively in PWA
- Desktop browser experience remains completely unchanged

## Passive Learning Note
Building this app is actively reinforcing cert concepts:
- API communication = client server architecture
- Supabase = database structure, access control, RLS
- GitHub = version control, change management
- Security decisions = CIA triad, least privilege, access control
- Vercel/CDN/SSL = cloud concepts directly on exam

## Phase Log

### Phase 1 - Complete
- Node.js v24.16.0 installed, NPM v11.13.0 installed, VS Code installed
- GitHub, Supabase, Vercel, and Anthropic API accounts created
- Anthropic API account funded with $20 balance

### Phase 2 - Complete
- Project created at H:\cert-study-app
- Next.js initialized with Tailwind, App Router, src/ directory
- Project running locally at http://localhost:3000
- build-notes.md created, code pushed to private GitHub repository

### Phase 3 - Complete
- Supabase project created (US West region)
- .env.local created with Supabase URL and anon key (confirmed in .gitignore)
- Supabase package installed, connection established via src/lib/supabase.js

### Phase 4 - Complete
- Villainous dark theme implemented via globals.css
- Sidebar built with CSA logo, navigation links, user avatar
- Dashboard with cert readiness cards, stats row, recent activity
- Cert detail pages for CCNA, Network+, Security+ with domain topic buckets (Strong/Average/Weak)

### Phase 4.5 - Complete
- Full architecture shell built before authentication
- Study Hub shells: Take a Test, Study Mode, Progress, Results, Settings
- Home page restructured as two-door morning brief (Study Hub / Life Hub)
- Life Hub shells: landing, Health Dashboard, Nutrition, Workouts, Sleep

### Phase 5 - Complete
- Authentication: login, signup, protected routes, user sessions via Supabase Auth

### Phase 6 - Complete
Core study features built and functional:
- AI question generation per cert, domain, difficulty via `/api/generate-questions`
- Three test modes: Practice (immediate feedback), Simulation (submit at end), Real Exam (timed)
- Real exam timer with per-cert durations (CCNA 120min/110q, N+/S+ 90min/90q)
- Pause/resume system — saves to `paused_tests` table, restores full state
- Navigate-away guard — confirm dialog if leaving mid-test, auto-saves on unmount
- `beforeunload` warning on browser close/refresh during active test
- In-context tutor chat per question (practice mode only)
- Keyboard shortcuts: 1–4 to select answers, Enter to submit/advance
- Performance tracking to `question_answers` and `topic_performance` tables
- Spaced repetition — domain weights multiplied by accuracy before question distribution
- Results page with score breakdown per domain
- Flagged questions — report bad/incorrect questions with feedback type

### Phase 7 - Complete
Template system and library management:
- AI template generation with `{{placeholder}}` variables and `variable_sets`
- Hybrid test generation: template pool first, AI supplements remainder
- Template count bar in test header (e.g. "⚡ 8/10 from template pool")
- Generate 5 templates per batch (locked at 5 — higher counts caused API/JSON truncation crashes)
- Pre-made Templates page: Browse / Duplicates / Approved Similar / Retired tabs
- Duplicate detection via Jaccard word-overlap ≥50% (client-side, same cert/domain/difficulty)
- Approved duplicate pairs stored in localStorage; retire/restore via `is_retired` flag

### Phase 8 - Complete
Progress, analytics, and study tools:
- Daily streak tracker — 30q/day goal, 28-day calendar heatmap
- Per-domain score trend — SVG line chart, 80% threshold line, ▲/▼ trend indicator
- Recommended Focus panel on each cert page (CCNA, Network+, Security+)
- Study Mode — concept card review then per-domain practice question, bookmark support
- Reference Sheets — subnetting, IOS commands, port numbers, OSI layers, attack types, encryption, compliance frameworks
- Bookmarks — save questions with reason (🔥/🤔/📢/⭐) and notes via modal
- Bookmarks page — cert tabs, reason badges, expandable full question view with notes
- Mobile responsive layout via `@media (max-width: 768px)`

### Phase 9 - Complete
Pause/resume reliability fixes:
- Sidebar intercepts link clicks during active test — confirm dialog before leaving
- Auto-save via localStorage snapshot written on every state change during active test
- Fixed race condition: snapshot deleted on mount before loadMostRecent could read it
- Fixed stale banner: loadMostRecent clears mostRecentPaused to null before async checks
- Fixed post-completion banner: localStorage cleared when done=true and on "Take Another Test"
- `beforeunload` warning on browser refresh/close during active test

### Phase 10 - Complete
Results page improvements:
- Mode badge per result row: Practice (blue), Simulation (yellow), Real Exam (red)
- `mode` column already in `test_sessions` — just added to select and display

### Phase 11 - Complete
Progress page fully built:
- Top stats row: total questions answered, average score, best score, day streak
- Score Over Time SVG chart: color-coded lines per cert, 82.5% dashed threshold
- Questions Per Day bar chart: last 30 days, green ≥30 (goal met), blue 1–29, grey 0
- Domain Accuracy Heatmap: all domains across all certs, filterable by cert tab, weakest→strongest
- Data sources: `question_answers.answered_at`, `test_sessions`, `topic_performance`

### Phase 12 - Complete
- Total Study Time stat on Progress page — sums `duration_seconds` from `test_sessions`
- Predicted Exam Score on each cert page — weighted average by official exam domain percentages, requires ≥5 questions per domain, shows color-coded domain breakdown chips
- Fix My Weaknesses mode on Take a Test — auto-selects cert + domains with most <65% accuracy (≥5 seen)
- Discard button on Return to Test banner — removes paused test without resuming
- `duration_seconds` column added to `test_sessions` table

### Phase 13 - Complete
Flashcards feature:
- Landing page with per-cert deck stats (mastered / learning / unlearned counts, mastery bar)
- Generate Deck (60 cards) and Add 40 More Cards via `/api/generate-flashcards`
- Per-cert study session pages via `StudySession.js` component
- Mastery tracking: `flashcards` and `flashcard_progress` Supabase tables
- Consecutive correct answer logic for mastery progression

### Phase 14 - Complete
Cert Guide page — 5-tab reference hub:
- **Overview** — cert cards, domain weight bars, quick comparison table
- **Overlap** — shared topic rows with per-cert depth and study tips, overlap % summary
- **Exam Details** — full logistics per cert (questions, time, cost, passing score, retake policy)
- **Career & Value** — job roles, salary ranges, DoD 8570/8140 compliance, employer value
- **Study Roadmap** — 3 study paths, time estimates from zero, combined study strategy
- "Cert Guide" sidebar section added between Practice and Settings

### Phase 15 - Complete
Mixed — All Certs test mode:
- "Mixed — All Certs" option in cert selector on Take a Test
- Domains locked to shared overlap topics across all 3 certs
- Generates questions from all 3 certs in parallel, shuffles together
- Real Exam mode disabled for Mixed; saved as `cert = 'mixed'`
- Progress page and Results page include Mixed as a 4th cert (green, `var(--success)`)

### Phase 16 - Complete
Floating Claude chat bubble:
- 💬 bubble fixed bottom-right on every Study Hub page (mounted in layout.js)
- Opens 360×520px panel — full conversation history, Clear button, starter suggestions
- Light markdown rendering: bold, inline code, code blocks, bullets
- API route `/api/chat` — multi-turn, system prompt tuned for cert study help
- Session-only history (not persisted to DB)

### Phase 17 - Complete
Packet Tracer Labs section:
- Labs landing page `/study-hub/labs` — all lab sets with cert badge, difficulty breakdown, estimated time
- Lab set overview `/study-hub/labs/[setId]` — ordered labs with difficulty dots, step count, domain tags
- Individual lab page `/study-hub/labs/[setId]/[labId]` — topology SVG, step cards, hints, notes, progress
- SVG topology renderer (`LabTopology.js`) — router, switch, PC, server, cloud icons; trunk/access/redundant line styles
- Expandable step cards: IOS command blocks with copy button, verification commands, progressive hint reveal
- Notes saved to `lab_notes` table; step completion to `lab_progress` table
- Prev/Next navigation; "Complete Set" button on final lab
- Data-driven: one JS file per lab set in `src/data/labs/` — zero UI changes to add new sets
- First lab set: CCNA Fundamentals — 8 labs (VLANs, DHCP, STP, ACLs, SSH, OSPF, NAT/PAT, Capstone)
- Sidebar "Labs" section added

### Phase 18 - Complete
Per-step documentation system + second lab set:
- Every lab step has a `document` array — 2–3 prompts teaching real-world documentation habits
- Lab page renders "📝 DOCUMENT YOUR WORK" section after hints; textarea auto-saves to localStorage on blur
- Storage key: `lab_step_doc_${setId}_${labId}_${stepId}`
- 49 steps in CCNA Fundamentals + 27 steps in Small Office Network Series = 76 total documented steps
- Small Office Network Series: 5 escalating labs — VLANs → DHCP → STP redundancy → ACLs → Full Office Build capstone
- Topology label improvements: dark pill backgrounds on interface labels, IP/DG in green (#2ECC71), labels at 33%/67% along lines with 20px perpendicular offset
- Packet Tracer Tips & Tricks page at `/study-hub/labs/tips` — 50+ tips across 8 categories, expandable cards, category filter pills

### Phase 19 - Complete
Multi-feature expansion — contextual panels, new lab sets, and smart study tools:

**IOS Command Reference + Floating Panel**
- New page `/study-hub/labs/commands` — ~90 commands across 10 categories, search, category filters, expandable cards with examples
- Exports `IOS_COMMANDS` for reuse; "IOS Commands" link added to sidebar under Labs
- `FloatingCommandPanel.js` — keyboard icon button on every individual lab page, searchable condensed panel

**Floating Reference Panel**
- `FloatingReferencePanel.js` — book icon on test page, practice mode only, cert-filtered
- CCNA: subnetting + private IP ranges | Network+: ports + OSI | Security+: attacks + encryption

**Flashcard Weak Domain Section**
- Below cert cards on flashcards landing — up to 6 domains <65% accuracy (≥5 seen)
- Accuracy bar, cert badge, direct link to that cert's flashcard session

**Lab Progress Dashboard**
- Labs landing now shows per-lab completion dots (green/yellow/grey) and completion count per set
- Queries `lab_progress` on load

**Weak Domain → Lab Connection**
- Lab set overview highlights labs matching weak `topic_performance` domains with yellow border + "🎯 Weak Area" badge

**New Lab Sets (2)**
- Network+ Fundamentals: 5 labs — Topology Docs, VLAN + Inter-VLAN Routing, Wireless WPA2, Troubleshooting (OSI), Port Security
- Security+ Network Labs: 4 labs — ACL Firewall, DMZ Three-Zone Design, Device Hardening (SSH v2/encrypted passwords/rate limiting/VTY ACL), Network Segmentation (VLANs by trust level, IoT isolation)

## Active Branch
`claude/adoring-shannon-sTxW8`

## Session Rules
- **After every commit/push:** give the user the pull command in a code block:
  ```
  git pull origin claude/adoring-shannon-sTxW8
  ```
- **Update both CLAUDE.md and build-notes.md** before every push — not just at end of session. If a feature was added, a section changed, or a new file created, the notes must reflect it in that same commit.
- **After every change or fix, provide a brief summary covering:**
  1. What the problem was (or what was requested)
  2. What was changed (files/logic updated)
  3. What to test to confirm it works correctly

## Database Tables
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question — cert, topic, correct flag, timestamp |
| `topic_performance` | Aggregated accuracy per cert+topic — drives spaced repetition and weak domain features |
| `test_sessions` | Completed test records — cert, mode, score_pct, correct, total_questions, duration_seconds, completed_at |
| `paused_tests` | In-progress tests saved as JSON with full state for resume |
| `question_templates` | Template library with variable_sets and is_retired flag |
| `bookmarked_questions` | Bookmarks with reason, notes, and full question snapshot |
| `flagged_questions` | User-reported question issues |
| `profiles` | User display name |
| `lab_progress` | Completed lab steps per user (user_id, lab_set_id, lab_id, step_id, completed_at) |
| `lab_notes` | Per-lab freeform notes per user (user_id, lab_set_id, lab_id, notes, updated_at) |
| `flashcards` | Generated flashcard decks — saved permanently per cert |
| `flashcard_progress` | Per-card mastery state: mastered flag, consecutive_correct count |
| `lab_timers` | Per-lab timer state — elapsed_seconds, is_running, last_started_at; unique per user+lab |
| `google_health_tokens` | OAuth tokens for Google Health API — access_token, refresh_token, expires_at, last_synced_at; one row per user |
| `health_steps_hourly` | Cached step counts — one row per user/date/hour (EST) |
| `health_heart_rate_daily` | Cached daily HR — avg_bpm, min_bpm, max_bpm per user/date |
| `health_sleep_sessions` | Cached sleep sessions — stages JSONB, timeline JSONB, is_nap; keyed by Google session_id |

## Future Features (Security)
- Two-factor authentication (placeholder exists in Settings → Security section)
- Password change from within the app

## Future Features (Study Hub)
- More concept cards in Study Mode
- Exam countdown timer with target date
- Advanced CCNA lab set (spanning tree deep dive, advanced OSPF, BGP intro)
- PWA conversion (add to home screen, offline support)

## Future Features (Life Hub)

- **Exercise/yoga photos** — use ExerciseDB API (free tier via RapidAPI) for exercise GIFs; already organized by muscle group, includes instructions and equipment type, licensed for app use. Yoga/stretching may need a separate source or CSS illustrations — revisit when building that section.
- **Nutrition photos** — Open Food Facts first for barcode scanning (free, no key needed); fall back to manual entry when data incomplete. Revisit Nutritionix if micronutrient coverage proves insufficient.
- **Vercel Cron for HR auto-sync** — requires Vercel Pro plan. Check account tier before building; fallback is Supabase Edge Functions with pg_cron (works on free tier).


- **Heart Rate Tracker page** — hourly HR chart, resting HR, peak HR, zone breakdown (Rest/Fat Burn/Cardio/Peak)
- **Vercel Cron Job auto-sync** — server-side scheduled job (every 30-60 min) that calls Google Health API and writes to cache tables without user loading the website; ensures HR/steps/sleep always fresh in Supabase
- **Health Overview wiring** — connect landing page cards with live Supabase data (steps today, avg HR, sleep last night)
- **Weekly/monthly sleep trends** — avg sleep per night over 7/30 days, trend line, goal line (8h)

### Nutrition
- **Food logging** — log meals with calories, macros (protein/carbs/fat), meal type (breakfast/lunch/dinner/snack); ultra-specific micronutrients (vitamin B12, magnesium, potassium, vitamin D, iron, zinc, calcium, omega-3, fiber, sodium, etc.) tracked against daily recommended values (RDVs)
- **Barcode scanner** — scan food packaging via phone camera, auto-populate from Open Food Facts or Nutritionix API; shows full nutrition preview before saving so user can manually add or edit any missing fields before confirming
- **Manual food entry** — full nutrition fields form (all macros + micronutrients) when no barcode available
- **My Foods library** — personal library of frequently eaten foods, organized by category, one-tap logging; full edit/remove capability per food, update nutrition facts at any time
- **Daily nutrition dashboard** — calories in vs goal, macro ring charts, meal history by day, micronutrient progress bars vs RDV
- **Nutrition history** — past days/weeks view, average macros and micros, trend charts

### Supplements & Vitamins
- **Supplement tracker** — log daily supplements (vitamin D, magnesium, etc.), mark taken/skipped per day
- **Consistency tracking** — streak and calendar heatmap per supplement
- **Supplement encyclopedia** — AI-generated profiles: benefits, optimal dose, timing, interactions, food sources
- **Vitamin/nutrient encyclopedia** — searchable reference with AI-generated explanations per nutrient

### Workouts
- **Workout logging** — log exercises with sets/reps/weight or duration, workout type (strength/cardio/flexibility)
- **Workout history** — past sessions, volume over time, PRs per exercise
- **Workout templates** — save common routines for quick logging
- **AI workout plan generator** — dumbbell and bodyweight only (no bench), generates a full 7-day weekly plan; updates day by day but always shows the full week ahead; each day's plan includes exercise photos and form tips
- **Exercise library** — dumbbell and bodyweight exercises with photos showing how to perform them, organized by muscle group (Arms / Legs / Core / Shoulders / Back / Chest); click any exercise to open a detail popup with photo, form tips, common mistakes, and variations
- **Yoga & stretching planner** — AI-generated weekly yoga/stretching plan (one session per day); each session shows poses/stretches with photos and correct form tips; plan generated a full week in advance and updated day by day
- **Stretching library** — all stretches organized by muscle being stretched; click any stretch to open a popup with photo, hold duration, form tips, and what it targets

### Goals & Body Metrics
- **Goals page** — input personal goals (lose weight / gain muscle / improve sleep / be healthier / etc.); AI provides guidance, an overview of the goal, and actionable recommendations based on what was entered
- **Body metrics profile** — height, weight, sex, body type/build, age; used by AI to calculate personalized calorie targets, macro ratios, nutrient needs, and track progress toward goals over time
- **Goal progress tracking** — track body weight over time, compare against goal, show trend

### Correlation Engine
- **Daily snapshots** — background job saves daily snapshot combining study score, steps, sleep hours, avg HR, calorie/macro totals to a Supabase table
- **AI insights** — Claude analyzes patterns and surfaces observations (e.g. "your test scores are 12% higher after 7+ hours of sleep", "your energy is lower on days with <100g protein")
- **Correlation charts** — scatter plots / trend lines showing study score vs sleep, steps, protein, HR
- **Morning brief page** — daily summary card: yesterday's health snapshot + today's study recommendation based on patterns

### Life Hub Landing Page
- **Wire overview cards** — connect cards with live Supabase data from all connected sources
- **Daily readiness score** — composite score from sleep quality, steps, HR, nutrition completeness

### Phase 23 - Complete
Google Health API integration (Life Hub):

**Google Health OAuth flow**
- Google Cloud project created, Google Health API enabled, OAuth 2.0 credentials configured
- Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`, `googlehealth.sleep.readonly`
- `/api/health/connect` — initiates OAuth (403s if not allowed account)
- `/api/health/callback` — exchanges code for tokens, saves to `google_health_tokens` table
- `/api/health/status` — checks connection state
- `/api/health/disconnect` — removes tokens
- `/api/health/sync` — fetches steps, heart rate, sleep from Google Health API v4

**Settings — Connected Apps section**
- Only visible when logged in as the owner account (email check)
- Shows connection status and connected-since date
- Connect / Disconnect buttons; success/error messages on redirect back

**Life Hub → Health page**
- Shows connect prompt if not linked
- Live data: Steps Today (with progress bar toward 10k goal), Avg Heart Rate, Sleep Last Night
- Refresh button re-fetches on demand
- Data from Google Pixel Watch 4 via Google Health API v4 (`users/me` endpoint)
- Sleep shows `—` correctly when watch not worn

### Phase 25 - Complete
Google Health data caching layer:

- 3 new Supabase tables: `health_steps_hourly`, `health_heart_rate_daily`, `health_sleep_sessions`
- `last_synced_at` added to `google_health_tokens`
- `GET /api/health/sync` now reads from Supabase cache only — sub-100ms page loads
- `POST /api/health/sync` fetches from Google API and writes to cache (incremental: only since last sync - 1hr overlap; first sync = 30 days back)
- All three health pages load cache instantly on mount, then auto-background-sync if data is >15 min stale
- Refresh button calls POST then re-fetches GET — user-initiated full sync
- Sleep stages parsed from `sleep.stages[]` array and `sleep.summary.stagesSummary`; longest session selected as main sleep
- Steps pagination fixed: early-exit once data older than needed range

### Phase 24 - Complete
Step Tracker and Sleep Tracker pages:

**Step Tracker** (`/life-hub/health/steps`)
- Today / Yesterday / Week range tabs + Refresh button
- Hourly bar chart (24 bars, Eastern time) — peak hour highlighted green, past hours blue, future grey
- Daily goal progress bar with 0–10k scale labels
- Summary cards: Total Steps, Peak Hour, Progress %
- Week view: 7-day bar chart, Total / Daily Avg / Goal Days cards
- Hover tooltips use `position: fixed` overlay following mouse cursor — no layout shift

**Sleep Tracker** (`/life-hub/health/sleep`)
- Summary cards: Total Sleep, Deep Sleep, REM, Light
- Stage breakdown proportional bar (Deep=blue, REM=purple, Light=green, Awake=yellow)
- Full sleep timeline chart with proportional segments
- "No sleep data" state (😴) when watch not worn — shows correctly

**Health sidebar dropdown**
- "Health" nav item in LifeHubSidebar now toggles a dropdown
- Sub-items: Overview, Step Tracker, Sleep Tracker
- Auto-opens when on any `/life-hub/health` path

### Phase 22 - Complete
Settings page Study Preferences + live home page:

**Settings — Study Preferences**
- Target exam date per cert (CCNA, Network+, Security+) — date picker with live days-remaining preview (red <14d, yellow <30d, green otherwise)
- Daily question goal selector — 10 / 20 / 30 / 50 per day; drives streak tracker threshold
- Default cert selector — pre-selects cert on Take a Test
- All saved to `profiles` table (new columns: `exam_dates JSONB`, `daily_goal INT`, `default_cert TEXT`)
- Single "Save Preferences" button saves all three fields together

**Home page — live data**
- Cert score cards now pull real predicted scores from `topic_performance` (same weighted formula as cert pages); show `—` until enough data
- Exam countdown chips appear below greeting when dates are set — color-coded by urgency
- Today's question count chip shows alongside countdowns when you've answered questions today
- Hardcoded placeholder scores removed

**Future Features (Security section):**
- Two-factor authentication
- Password change

### Phase 21 - Complete
Mark as Learned, Lab Completion Summary, and AI Doc Feedback:

**Mark as Learned**
- `learned_at TIMESTAMPTZ` column added to `question_answers`
- Wrong-answers API now filters out rows where `learned_at IS NOT NULL`; includes `id` in returned question objects as `_wrongAnswerId`
- PATCH /api/wrong-answers sets learned_at on the given row
- When answer is revealed in practice mode and question has `_wrongAnswerId`, a purple "✓ Mark as Learned" button appears
- One click marks it — button turns green and is disabled; question won't appear in future Wrong Answer Reviews

**Lab Completion Summary**
- "Complete Lab — Get Summary" button at bottom of every lab page
- Only enabled when: all steps are checked complete AND every step with a document array has non-empty localStorage docs
- Button shows specific reason if not yet enabled ("mark all steps done" or "save documentation for all steps" first)
- On click: calls POST /api/lab-summary with lab title, description, all steps, user's documentation per step, and notes
- Returns AI summary with three sections: What You Built, Key Concepts Practiced, Keep Practicing
- Shown in a modal with markdown-style rendering; Close, Next Lab →, or View Lab Set buttons
- Old "Complete Set" nav button replaced with "← Back to Lab Set" — the new Complete Lab button handles that flow

**AI Documentation Feedback**
- On Save in the DOCUMENT YOUR WORK textarea: calls POST /api/lab-doc-feedback
- Sends step title, step content, document prompts, and user text to Claude
- Returns 1-3 sentences of specific, actionable feedback shown inline below the textarea with a 🤖 icon
- Save button shows "Analyzing..." while waiting; onBlur no longer triggers save (explicit save only)

### Phase 20 - Complete
Wrong Answer Review + Per-Lab Timer:

**Wrong Answer Review**
- `question_snapshot` JSONB column added to `question_answers` (nullable, only populated for incorrect answers)
- Snapshot contains: question, options, correct letter, topic, explanations
- New API route `/api/wrong-answers?cert=X` — fetches wrong answer snapshots, dedupes by question text, returns array
- "🔁 Wrong Answer Review" card on Take a Test setup — cert selector, live count of saved wrong answers, Start Review button
- Loads directly as a practice session (tutor chat, bookmarks, explanations all active)
- Runs as mode='practice' so all existing practice UI and stats tracking work unchanged

**Per-Lab Timer**
- New `lab_timers` Supabase table with RLS — unique per user+lab, stores elapsed_seconds + is_running + last_started_at
- `LabTimer.js` component in lab page header — Start / Pause / Reset controls, HH:MM:SS display
- Timer is persistent: on load recalculates elapsed using last_started_at so closing the tab mid-run loses no time
- Green border + color when running, normal when paused

### Phase 19c - Complete
Lab data quality audit — empty verify fields and topology build clarity:

**Empty verify fields fixed**
- CCNA Fundamentals Lab 3 Step 1: added verify command (show interfaces status on SW2)
- Small Office Network Lab 1 Step 1: added verify command (show interfaces status on SW1 confirming all 6 ports connected)
- Small Office Network Lab 5 Step 1: added verify command (show interfaces status on DSW confirming all 5 uplinks)

**Security+ lab improvements**
- All four lab topologies now include device model sublabels (Cisco 1841 router, Catalyst 2960 switch)
- Lab 1, 2, 3, and 4 Step 1 now includes explicit topology build instructions before any CLI work — user is told exactly which devices to add, how to connect them, and what IPs to pre-assign so they have a clear starting point

### Phase 19b - Complete
Bug fixes and lab improvements:

**Topology rendering (LabTopology.js)**
- Accepts both old format (`connections` with `fromLabel`/`toLabel`) and new format (`links` with single `label` split on `\n`)
- Auto-computes `viewBox` from node positions when not provided — new lab files no longer need to define it
- Node `label` with `\n` now correctly splits into main label + sublabel; old `sublabel` field still works
- All Network+ and Security+ lab topologies now render fully with connections

**Lab set overview — domain strength indicators**
- Domain tags now show accuracy % and color-coded strength: ▼ red = weak (<65%), ◆ yellow = avg (65–80%), ▲ green = strong (≥80%)
- Red border + "🎯 Needs Practice" badge when any domain is weak
- "No test data yet" shown in italic when topic_performance has no data for that cert
- Threshold lowered from 5 to 3 questions seen

**Flashcard weak domain section**
- Always visible now — shows "take some practice tests" message when no data (was hidden entirely)
- Threshold lowered from 5 to 3 questions seen

**Network+ Lab 4 rewrite (Troubleshooting Methodology)**
- Previous version was vague about how to build the network and didn't give explicit break instructions
- Rewritten as 7 explicit steps: place & cable all devices → configure IPs → verify baseline → Fault 1 (shutdown interface) → Fault 2 (wrong subnet mask) → Fault 3 (missing gateway) → write incident reports
- Each fault step has an explicit INTRODUCE section (exact what to change), DIAGNOSE section (which commands and what to look for), and FIX section
