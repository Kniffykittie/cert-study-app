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
- Node.js v24.16.0 installed
- NPM v11.13.0 installed
- VS Code installed
- GitHub account created
- Supabase account created
- Vercel account created
- Anthropic API account created with $20 balance

### Phase 2 - Complete
- Project created at H:\cert-study-app
- Next.js initialized with Tailwind, App Router, src/ directory
- Project running locally at http://localhost:3000
- build-notes.md created
- Code pushed to GitHub — private repository

### Phase 3 - Complete
- Supabase project created (US West region, status healthy)
- .env.local created with Supabase URL and anon key
- .env.local confirmed in .gitignore — credentials are safe
- Supabase package installed (@supabase/supabase-js)
- src/lib/supabase.js created — connection established
- App running locally with no errors
- Changes pushed to GitHub

### Phase 4 - Complete
- Villainous dark theme implemented
- globals.css updated with full color palette
- Sidebar built with CSA logo, navigation links, user avatar
- Sidebar extracted as client component to support interactivity
- Dashboard built with cert readiness cards, stats row, recent activity, recommendations
- Cert detail pages built for CCNA, Network+, Security+
- Each cert page has overall readiness score, progress bar, stats, and topic buckets
- Topic buckets — Strong, Average, Weak — color coded green, gold, red
- All cert cards on dashboard are clickable and navigate to cert detail pages
- All pages navigable and styled consistently
- Changes pushed to GitHub

### Phase 4.5 - Complete
Complete the full architecture shell of the entire app before moving to authentication:

**Study Hub — remaining shells**
- Take a Test page — full layout with cert selector, topic selector, question count
- Study Mode page — adaptive drill interface layout
- Progress page — charts and heatmap structure
- Results page — score breakdown, missed questions layout
- Settings page — account and preferences layout

**Home Page Restructure**
- Convert current home page to two door morning brief page
- Study Hub door leading to Study Hub landing page
- Life Hub door leading to Life Hub landing page
- Insights and patterns section placeholder

**Life Hub — full shells**
- Life Hub landing page
- Health Dashboard page
- Nutrition page
- Workouts page
- Sleep page

**General**
- General Chat page

### Phase 5 - Complete
Authentication — login, signup, protected routes, user sessions via Supabase Auth

## Phase Log (continued)

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
- ⚡ Template badge on individual template-sourced questions
- Generate 5 templates per batch (JSON truncation recovery, dedup against existing)
- Pre-made Templates page: Browse / Duplicates / Approved Similar / Retired tabs
- Duplicate detection via Jaccard word-overlap ≥50% (client-side, same cert/domain/difficulty)
- Approved duplicate pairs stored in localStorage
- Retire/restore templates — `is_retired` flag in Supabase

### Phase 11 - Complete
Progress page fully built (was a placeholder):
- Top stats row: total questions answered, average score, best score, day streak
- Score Over Time SVG chart: color-coded lines per cert, 82.5% dashed threshold, all certs on one chart
- Questions Per Day bar chart: last 30 days, green ≥30 (goal met), blue 1-29, grey 0, dashed 30q goal line
- Domain Accuracy Heatmap: all domains across all certs, filterable by cert tab, sorted weakest→strongest, color-coded rows
- Uses: `question_answers.answered_at`, `test_sessions`, `topic_performance`

### Phase 10 - Complete
Results page improvements:
- Added mode badge (Practice / Simulation / Real Exam) to each result row
- Mode is color-coded: blue = Practice, yellow = Simulation, red = Real Exam
- `mode` column was already saved to `test_sessions` table, just needed to be selected and displayed

### Phase 9 - Complete
Pause/resume reliability fixes:
- Navigate-away guard: sidebar intercepts link clicks during active test, shows confirm dialog
- Auto-save via localStorage snapshot written on every state change during active test
- Fixed race condition: snapshot was being deleted on component mount before loadMostRecent could read it
- Fixed stale banner: loadMostRecent now clears mostRecentPaused to null before async checks
- Fixed post-completion banner: localStorage cleared when done becomes true and on "Take Another Test"
- beforeunload warning on browser refresh/close during active test
- Manual pause (Pause button) continues to save to Supabase paused_tests as before

### Phase 8 - Complete
Progress, analytics, and study tools:
- Daily streak tracker — 30q/day goal, 28-day calendar heatmap
- Per-domain score trend — SVG line chart, 80% threshold line, ▲/▼ trend indicator
- Recommended Focus panel on each cert page (CCNA, Network+, Security+)
- Study Mode — concept card review then per-domain practice question, bookmark support
- Reference Sheets — subnetting tables, IOS commands, port numbers, OSI layers, attack types, encryption, compliance frameworks (practice mode only)
- Bookmarks — save questions with reason (🔥/🤔/📢/⭐) and notes via modal
- Bookmarks page — cert tabs, reason badges, expandable full question view with notes
- Mobile responsive layout via `@media (max-width: 768px)`

### Phase 12 - Complete
New features:
- Total Study Time stat on Progress page — sums `duration_seconds` from `test_sessions`, displayed as "Xh Ym" or "Xm", shown as 5th stat card
- Predicted Exam Score on CCNA, Network+, and Security+ cert pages — weighted average of domain accuracy using official exam domain percentages, requires ≥5 questions per domain to include it, shows domain breakdown chips color-coded by score, appears once at least one domain has enough data
- Fix My Weaknesses mode on Take a Test page — auto-selects cert and domains with most <65% accuracy (≥5 seen), sets practice mode, shows summary panel
- Discard button on Return to Test banner — removes localStorage or Supabase paused test without resuming
- `duration_seconds` column added to `test_sessions` table — measured from test start to submit

## Active Branch
`claude/adoring-shannon-sTxW8`

## Session Rules
- After every commit/push, always give the user the pull command:
  `git pull origin claude/adoring-shannon-sTxW8`
- Update both `CLAUDE.md` and `build-notes.md` at the end of every session or after any significant feature is completed.
- After every change or fix, always provide a brief end-of-change summary covering:
  1. **What the problem was** (or what was requested)
  2. **What was changed** (files/logic updated)
  3. **What to test** to confirm it works correctly

## Database Tables
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question with cert, topic, correct flag, timestamp |
| `topic_performance` | Aggregated accuracy per cert+topic for spaced repetition |
| `paused_tests` | In-progress tests saved as JSON with full state |
| `question_templates` | Template library with variable_sets, is_retired flag |
| `bookmarked_questions` | Bookmarks with reason, notes, full question snapshot |
| `flagged_questions` | User-reported question issues |
| `profiles` | User display name |

## Future Features (Study Hub)
- More concept cards in Study Mode
- Predicted readiness score per cert
- Cross-cert overlap highlighting
- Exam countdown timer with target date
- PWA conversion

## Future Features (Life Hub — not yet started)
- Fitbit / Google Fit integration
- Sleep, workout, nutrition logging
- Supplement tracking and encyclopedia
- Correlation engine (study performance vs health data)
- Daily morning brief page
- General purpose Claude chat section