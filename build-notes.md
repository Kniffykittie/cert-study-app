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

## Future Features (Study Hub)
- More concept cards in Study Mode
- Exam countdown timer with target date
- Advanced CCNA lab set (spanning tree deep dive, advanced OSPF, BGP intro)
- PWA conversion (add to home screen, offline support)

## Future Features (Life Hub — not yet started)
- Fitbit / Google Fit integration
- Sleep, workout, and nutrition logging
- Supplement tracking and encyclopedia
- Correlation engine (study performance vs health data)
- Daily morning brief page
