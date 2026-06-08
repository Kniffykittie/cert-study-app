# Cert Study App — CLAUDE.md

## Project Overview
A personal certification study app for CCNA, Network+, and Security+ exam prep. Built with Next.js App Router, Supabase, and the Anthropic Claude API.

**Active branch:** `claude/adoring-shannon-sTxW8`

---

## Tech Stack
- **Framework:** Next.js (App Router, `src/` directory, Turbopack)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`) for question and template generation
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

## Directory Structure
```
src/
  app/
    api/
      bookmarks/route.js          CRUD for bookmarked questions
      generate-questions/route.js  AI question generation (spaced repetition weighting)
      generate-templates/route.js  AI template generation (batch of 5, dedup)
      test-chat/route.js           Tutor chat during practice tests
      health/
        connect/route.js           Initiates Google Health OAuth (owner account only)
        callback/route.js          Handles OAuth callback, saves tokens
        status/route.js            Checks if Google Health is connected
        sync/route.js              Fetches steps/heart rate/sleep from Google Health API v4 (?range=today|yesterday|week)
        disconnect/route.js        Removes stored tokens
    life-hub/
      layout.js                   Life Hub layout with LifeHubSidebar
      page.js                     Life Hub landing
      health/
        page.js                   Health Overview — steps today, avg heart rate, sleep last night
        steps/page.js             Step Tracker — hourly/weekly bar charts, goal progress, fixed tooltip
        sleep/page.js             Sleep Tracker — stage breakdown bar, timeline chart, no-data state
    workouts/
      page.js                     My Workout Plan — weekly plan cards sorted Mon-Sun, day reassignment, add/remove exercises with AI check-in, add/change cardio on rest days
      setup/page.js               7-step onboarding: experience, goals (multi-select), days, schedule (pick days), fitness check, cardio preferences, equipment
      exercises/page.js           Exercise Library — sticky muscle-group nav, scrollable grouped sections, cards with image/placeholder, detail modal with form cues, Cardio section
      api/
        workouts/
          generate-plan/route.js  AI workout plan generator — filters exercises by equipment, cardio from user-selected options only
    study-hub/
      page.js                     Overview (DailyStreak component)
      ccna/page.js                CCNA cert page (DomainTrend + Recommended Focus)
      network-plus/page.js        Network+ cert page
      security-plus/page.js       Security+ cert page
      test/page.js                Take a Test (practice / simulation / real exam)
      study/page.js               Study Mode (concept cards + per-domain question)
      bookmarks/page.js           Saved bookmarks with cert tabs + reason badges
      flashcards/page.js          Flashcard landing — per-cert deck stats + weak domain section
      flashcards/[cert]/page.js   Per-cert flashcard study session (StudySession component)
      cert-guide/page.js          5-tab cert reference hub (Overview, Overlap, Exam Details, Career, Roadmap)
      progress/page.js            Progress tracking
      results/page.js             Past test results
      reference/page.js           Reference sheets (subnetting, ports, OSI, etc.)
      flagged/page.js             Flagged/reported questions
      templates/page.js           Generate AI templates (5 per batch)
      premade-templates/page.js   Browse/manage template library (duplicates, retired)
      labs/page.js                Packet Tracer Labs landing (all lab sets) — includes per-lab progress dots
      api/
      wrong-answers/route.js      GET wrong answers by cert (question_snapshot JSONB, deduped by question text)
    labs/commands/page.js       IOS Command Reference — exports IOS_COMMANDS for FloatingCommandPanel
      labs/tips/page.js           Packet Tracer Tips & Tricks (50+ tips, 8 categories)
      labs/[setId]/page.js        Lab set overview — weak domain labs highlighted in yellow
      labs/[setId]/[labId]/page.js  Individual lab — FloatingCommandPanel mounted here
  data/
    labs/
      index.js                    Exports LAB_SETS, getLabSet(), getLab() helpers
      ccna-fundamentals.js        CCNA lab set — 8 labs, 49 steps — all steps have document arrays
      small-office-network.js     Small Office series — 5 labs, 27 steps — all steps have document arrays
      network-plus-fundamentals.js  Network+ lab set — 5 labs, 25 steps — all steps have document arrays
      security-plus-labs.js       Security+ lab set — 4 labs, 20 steps — all steps have document arrays
  components/
    StudyHubSidebar.js            Nav sidebar with test-in-progress guard
    BookmarkModal.js              Bookmark reason + notes modal
    DailyStreak.js                30q/day streak tracker with 28-day calendar
    DomainTrend.js                Per-domain score trend SVG chart
    ScoreChart.js                 Overall score chart
    LabTopology.js                SVG topology renderer (router/switch/PC/server/cloud icons, trunk/access/redundant lines)
    FloatingCommandPanel.js       Fixed bottom-right button on lab pages — searchable IOS command reference (imports IOS_COMMANDS)
    LabTimer.js                   Per-lab persistent timer — Start/Pause/Reset, survives navigation via Supabase lab_timers table
    FloatingReferencePanel.js     Fixed button on test page (practice mode only) — cert-filtered quick reference (subnetting, ports, OSI, attacks, encryption)
    FloatingChat.js               Fixed chat bubble on all Study Hub pages — session-only tutor chat via /api/chat
    LifeHubSidebar.js             Life Hub nav sidebar — Health dropdown (Overview/Step Tracker/Sleep Tracker), Workouts dropdown (Overview/Exercise Library), auto-opens on active routes
```

---

### Progress Page (`progress/page.js`)
- **Unique purpose:** cross-cert roll-up — nothing else shows all certs together
- Top stats: total questions answered, avg score, best score, day streak (≥30q/day)
- Score Over Time: SVG multi-line chart, one color-coded line per cert, 82.5% dashed threshold
- Questions Per Day: SVG bar chart, last 30 days, green=goal met, blue=partial, grey=none
- Domain Heatmap: all domains across all certs, filterable by cert tab, sorted weakest→strongest
- Data sources: `question_answers.answered_at`, `test_sessions`, `topic_performance`

### Results Page (`results/page.js`)
- Grouped by cert (CCNA / Network+ / Security+)
- Each row shows: correct/total, **mode badge** (Practice=blue, Simulation=yellow, Real Exam=red), date, score %, Discard button
- Summary row: total tests taken, average score, certs studied
- `test_sessions` table columns used: `id, cert, mode, score_pct, correct, total_questions, completed_at`

## Database Tables (Supabase)
| Table | Purpose |
|-------|---------|
| `question_answers` | Every answered question (cert, topic, correct/incorrect, timestamp) |
| `topic_performance` | Aggregated accuracy per cert+topic (used for spaced repetition) |
| `paused_tests` | Saved in-progress tests (questions JSON, answers, current index, seconds remaining) |
| `question_templates` | Template library with `{{placeholder}}` variables, `is_retired` flag |
| `bookmarked_questions` | Bookmarks with reason, notes, full question snapshot |
| `flagged_questions` | User-reported question issues |
| `profiles` | User display name, exam_dates JSONB, daily_goal INT, default_cert TEXT |
| `lab_progress` | Completed lab steps per user (user_id, lab_set_id, lab_id, step_id, completed_at) |
| `lab_notes` | Per-lab notes per user (user_id, lab_set_id, lab_id, notes, updated_at) |
| `lab_timers` | Per-lab timer state (user_id, lab_set_id, lab_id, elapsed_seconds, is_running, last_started_at) — unique per user+lab |
| `google_health_tokens` | Google Health OAuth tokens per user (access_token, refresh_token, expires_at, last_synced_at) — one row per user, RLS enforced |
| `health_steps_hourly` | Cached step counts — one row per user/date/hour (EST); upsert-safe primary key |
| `health_heart_rate_daily` | Cached daily HR — avg_bpm, min_bpm, max_bpm, sample_count per user/date |
| `health_sleep_sessions` | Cached sleep sessions — stages JSONB, timeline JSONB, is_nap flag; keyed by Google session_id |

---

## Features

### Test Modes
- **Practice** — answer one at a time, immediate feedback, tutor chat, bookmark button
- **Simulation** — answer all then submit, no feedback until end
- **Real Exam** — timed (per cert), no feedback, matches real exam question counts

### Pause / Resume
- Explicit **Pause** button saves to Supabase `paused_tests`
- Navigating away via sidebar triggers a confirm dialog; test state is saved to `localStorage` synchronously on every answer/navigation change — no async timing issues
- `beforeunload` warns on browser refresh/close during active test
- On return to Take a Test: checks `localStorage` first (interrupted tests), falls back to Supabase (manually paused tests)
- `loadMostRecent` resets banner to null before each check to prevent stale state
- localStorage snapshot cleared explicitly on: test complete, pause, resume, "Take Another Test"
- "Return to Test" banner appears on test setup screen; also resumable via `?resume=<id>` URL

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
- Coverage table on Generate Templates page shows active/retired counts per cert/domain/difficulty

### Spaced Repetition
- Domain weights multiplied by accuracy-based multipliers before question distribution:
  - < 40% accuracy → 2.5× weight
  - 40–60% → 1.8×
  - 60–75% → 1.3×
  - ≥ 90% → 0.6×

### Daily Streak
- Goal: 30 questions/day
- 28-day calendar heatmap (green = met, blue-partial = partial, grey = none)
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

### Cert Guide (`cert-guide/page.js`)
- 5-tab reference hub: Overview, Overlap, Exam Details, Career & Value, Study Roadmap
- Overview: cert cards with domain weight bars, quick comparison table
- Overlap: expandable shared topic rows with per-cert depth and study tips, overlap % summary
- Exam Details: logistics (questions, time, cost, passing score, retake policy), test day tips
- Career & Value: job roles, salary ranges, DoD 8570/8140 compliance levels, employer value
- Study Roadmap: 3 study paths, time estimates from zero, combined study strategy
- Sidebar section "Cert Guide" added between Practice and Settings

### Flashcards
- Landing page shows per-cert deck stats: mastered / learning / unlearned counts, mastery progress bar
- Generate Deck (60 cards) on first visit; Add 40 More Cards once a deck exists
- Cards generated via `/api/generate-flashcards`, saved permanently to `flashcards` table
- Per-cert study sessions at `/study-hub/flashcards/[cert]` via `StudySession.js`
- Progress tracked in `flashcard_progress` table: `mastered` flag, `consecutive_correct` count
- **Weak Domain Section** below cert cards — queries `topic_performance` for domains <65% accuracy (≥5 seen), shows up to 6 cards with accuracy bar and direct link to that cert's flashcard session

### Study Mode
- Cert selection → concept card (domain + bullets) → "I'm ready" loads a question for that domain
- Bookmark button available on questions

### Mixed — All Certs Mode
- "Mixed — All Certs" option in the cert selector on Take a Test
- Domains locked to shared overlap topics: Network Fundamentals/IP Connectivity/Security Fundamentals (CCNA), Networking Concepts/Network Security/Network Troubleshooting (N+), General Security/Threats & Mitigations/Security Architecture (S+)
- Generates questions via 3 parallel API calls (one per cert), shuffles results together
- Real Exam mode disabled for Mixed
- Saved as `cert = 'mixed'` — does NOT update individual cert `topic_performance`
- Progress page and Results page include Mixed as a 4th cert (green, `var(--success)`)
- `MIXED_DOMAINS` constant in test/page.js maps each cert to its overlap domains

### Mark as Learned (Wrong Answer Review)
- When answer is revealed in practice mode and question came from wrong-answer-review (`q._wrongAnswerId` exists), a purple "✓ Mark as Learned" button appears next to Next Question
- One click PATCHes `/api/wrong-answers` → sets `learned_at` on that `question_answers` row
- Wrong-answers GET route filters `learned_at IS NULL` so marked questions never appear again
- Button turns green and disabled after click; state tracked in `markedLearned` object keyed by question index

### AI Documentation Feedback
- StepCard: Save button on DOCUMENT YOUR WORK textarea calls POST `/api/lab-doc-feedback`
- Sends step title, content, document prompts array, and user's text
- Returns 1-3 sentences of specific feedback; displayed inline below textarea with 🤖 icon
- Save button shows "Analyzing..." while Claude responds; onBlur no longer auto-saves (explicit save only)

### Lab Completion Summary
- "Complete Lab — Get Summary" button above Prev/Next nav on every lab page
- Only enabled when ALL steps are checked AND every step with a `document` array has non-empty localStorage text
- Calls POST `/api/lab-summary` with lab data + per-step docs + notes → AI returns 3-section summary
- Summary modal shows: What You Built / Key Concepts Practiced / Keep Practicing
- Modal has Close, Next Lab →, or View Lab Set buttons depending on lab position

### Wrong Answer Review
- Card on Take a Test setup screen (purple, below Fix My Weaknesses)
- Select a cert → shows count of stored wrong answers → "Start Review" loads them as a practice session
- Wrong answers stored as `question_snapshot` JSONB in `question_answers` (only for incorrect answers, null for correct)
- Snapshot contains: question text, options, correct letter, topic, explanations
- API route `/api/wrong-answers?cert=X` deduplicates by question text, returns most recent unique wrong answers
- Runs as normal practice mode: tutor chat, bookmarks, explanations all work
- `question_snapshot` column is nullable — existing rows are unaffected; only new wrong answers get snapshots

### Per-Lab Timer
- `LabTimer.js` component mounted in lab page header alongside step completion percentage
- Persistent via Supabase `lab_timers` table — survives page refresh, navigation, and browser close
- Uses `last_started_at` trick: on load, if `is_running=true`, elapsed = stored_seconds + (now - last_started_at)
- Controls: ▶ Start / ⏸ Pause / ↺ Reset
- Displays as MM:SS or HH:MM:SS, green color when running, normal when paused
- One timer row per user+lab (unique constraint on user_id, lab_set_id, lab_id)

### Fix My Weaknesses
- Button on Take a Test setup screen
- Queries `topic_performance`, finds the cert with the most domains under 65% accuracy (≥5 seen)
- Auto-selects cert and those domains in practice mode, shows a summary panel of targeted domains with their accuracy
- User picks question count and hits Generate Test

### Predicted Exam Score
- Shown on each cert page (CCNA, Network+, Security+) once ≥1 domain has ≥5 questions answered
- Weighted average of domain accuracy using official exam domain percentages
- Formula: `sum(domainWeight × accuracy) / sum(coveredWeights) × 100`
- Domain breakdown chips shown color-coded by score
- Hidden until there's enough data

### Total Study Time
- Shown on Progress page as 5th stat card
- Sums `duration_seconds` from `test_sessions` (only tests where timing was tracked)
- Displayed as "Xh Ym" or "Xm"

### Test History (Results page)
- Mode badge per result: Practice (blue), Simulation (yellow), Real Exam (red)
- Discard button removes test session and its `question_answers` from DB
- Discard button also available on Return to Test resume banner (removes without resuming)

### Study Time Tracking
- `duration_seconds` column on `test_sessions` — measured from first question to submit
- `startTimeRef` set in `generateTest()` and both `resumeTest()` paths in test/page.js

---

### Floating Chat
- 💬 bubble fixed bottom-right on every Study Hub page (mounted in `study-hub/layout.js`)
- Opens a 360×520 chat panel — full conversation, Clear button, starter suggestions
- Light markdown rendering in assistant messages (bold, inline code, code blocks, bullets)
- API route: `/api/chat` — simple multi-turn, system prompt tuned for cert study help
- Session-only history (not persisted to DB)
- Component: `src/components/FloatingChat.js`

### Packet Tracer Labs
- Landing page: all lab sets with cert badge, difficulty breakdown, estimated total time
- Set overview: ordered list of labs with difficulty dots, step count, domain tags
- Individual lab: topology SVG, collapsible step cards, IOS command blocks with copy button, verification commands, expected output, progressive hint reveal (one hint at a time), pro tips, notes textarea
- Step completion persisted to `lab_progress` Supabase table per user
- Notes persisted to `lab_notes` Supabase table per user
- Prev/Next navigation between labs; "Complete Set" button on last lab
- Data-driven: add a new lab set by creating one file in `src/data/labs/` and importing it in `index.js` — zero UI changes needed
- `LabTopology.js` renders SVG topologies: router (circle + spokes), switch (rect + port lines), PC (monitor), server (rack units), cloud icons; trunk=blue, redundant=purple, access=grey lines with interface labels
- Interface labels use dark pill backgrounds (`ConnLabel`), multi-line sublabels via `NodeSublabel` (split on `\n`), IP/DG lines in green (#2ECC71), labels at 33%/67% along lines with 20px perpendicular offset
- Accepts two topology formats: old (`connections` array with `fromLabel`/`toLabel`) and new (`links` array with single `label` split on `\n`). Auto-computes `viewBox` from node positions if not provided.

### Per-Step Documentation
- Every step has a `document` array — 2–3 prompts that teach the user to document their work like a real network admin
- Prompts mix factual recording ("record every interface and IP") with conceptual questions ("explain in your own words why…")
- The `StepCard` component renders a "📝 DOCUMENT YOUR WORK" section after hints when `step.document` exists
- Textarea auto-saves to `localStorage` on blur; manual Save button turns "✓ Saved" briefly
- Storage key pattern: `lab_step_doc_${setId}_${labId}_${stepId}`
- **All steps in all four lab set files have document arrays — do NOT add a new lab step without including a document array**

### Lab Sets
- **CCNA Fundamentals** (`ccna-fundamentals.js`): 8 labs — VLANs/Router-on-a-Stick, DHCP, STP, ACLs, SSH hardening, OSPF, NAT/PAT, Capstone
- **Small Office Network Series** (`small-office-network.js`): 5 labs — Labs 1–4 share a base topology (1 router, 3 switches, 9 PCs) building VLANs → DHCP → STP redundancy → ACLs; Lab 5 is a standalone full-office build challenge with distribution/access switch hierarchy, 4 VLANs + VLAN 99, redundant uplinks, DHCP, SSH, STP root, and guest isolation ACL
- **Network+ Fundamentals** (`network-plus-fundamentals.js`): 5 labs — Topology documentation, VLAN segmentation + inter-VLAN routing, wireless AP config (WPA2), troubleshooting methodology (explicit build-then-break-then-fix format, 7 steps), port security with sticky MACs and violation modes
- **Security+ Network Labs** (`security-plus-labs.js`): 4 labs — ACL-based firewall rules with DMZ, DMZ network design (three-zone architecture), device hardening (SSH v2, encrypted passwords, login rate limiting), network segmentation (VLANs per trust level with IoT isolation)

### Google Health Integration
- OAuth flow restricted to owner account only (`sethproper40@yahoo.com`) — 403 for all other accounts
- Scopes: `googlehealth.activity_and_fitness.readonly`, `googlehealth.health_metrics_and_measurements.readonly`, `googlehealth.sleep.readonly`
- Token refresh handled automatically in `sync/route.js` — checks `expires_at`, refreshes via `oauth2.googleapis.com/token`
- API endpoint: `health.googleapis.com/v4/users/me/dataTypes/{type}/dataPoints` — `users/me` only, NOT `users/-`
- Civil date filtering used for EST-safe day boundaries (not UTC time ranges) via `civilStartTime.date` object
- **Two-path sync**: GET reads from Supabase cache (fast), POST fetches from Google and writes to cache
- **Incremental sync**: POST fetches only since `last_synced_at - 1 hour`; first sync fetches 30 days back
- **Auto-background-sync**: pages load cache instantly, then fire background POST if data is >15 min stale
- Cache tables: `health_steps_hourly` (user/date/hour), `health_heart_rate_daily` (user/date), `health_sleep_sessions` (user/session_id)
- `last_synced_at` column on `google_health_tokens` tracks last successful sync

### Step Tracker (`/life-hub/health/steps`)
- Today / Yesterday / Week tabs + Refresh button (Header sub-component)
- Hourly view: 24-bar chart in Eastern time, goal progress bar (0–10k scale), Summary cards: Total Steps, Peak Hour, Progress %
- Peak hour bar shown in green; past hours blue; future hours grey (dimmed)
- Week view: 7-day bar chart, Total / Daily Avg / Goal Days cards; green = goal met, blue = today, purple = other days
- Hover tooltips: `position: fixed` overlay following mouse cursor with `pointerEvents: none` — no chart layout shift
- Goal: 10,000 steps/day

### Sleep Tracker (`/life-hub/health/sleep`)
- Summary cards: Total Sleep, Deep Sleep, REM, Light
- Stage breakdown proportional bar (Deep=accent-blue, REM=accent-purple, Light=success, Awake=warning)
- Full sleep timeline with proportional segments across total sleep duration
- "No sleep data" state (😴) shown correctly when watch not worn

## Cost Reference (Anthropic API)
- ~$0.003–$0.005 per question generated
- ~$0.015–$0.025 per template generated (larger prompt)
- 161 active templates ≈ ~$3–4 total cost to date
- Filling all domains to 20–25 templates each ≈ ~$8–10 total

---

## Common Commands
```bash
# Pull latest changes in VS Code terminal
git pull origin claude/adoring-shannon-sTxW8

# Start dev server
npm run dev

# Stop dev server
Ctrl+C
```

## Session Rules

### Pull Command (always give this after every push — as a code block so it's copyable)
```
git pull origin claude/adoring-shannon-sTxW8
```

### MD Notes — Required Before Every Push
Both `CLAUDE.md` and `build-notes.md` must be updated in the **same commit** as any feature or fix. Do not push code without updating the notes first. Specifically:
- **CLAUDE.md:** update directory structure if files were added/removed, update the relevant feature section, update lab set counts/step counts if labs changed
- **build-notes.md:** add or update the phase entry, update the Database Tables section if schema changed, remove completed items from Future Features

### After Every Change or Fix
Always provide a brief summary covering:
1. **What the problem was** (or what was requested)
2. **What was changed** (files/logic updated)
3. **What to test** to confirm it works correctly

## Important Decisions & Constraints (Don't Re-Litigate These)
These are deliberate decisions made for specific reasons. Don't change them without the user explicitly asking.

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

## Token Efficiency Rules
These rules exist because a previous session burned excessive tokens on avoidable mistakes:

1. **Never use a background agent to edit a single large file.** Background agents edit one step at a time, read the file repeatedly, and conflict with main-thread edits. For bulk data edits (e.g. adding a field to all lab steps), do it directly with batched Edit calls in the main thread.

2. **Batch large data edits — don't do one Edit per item.** When adding the same field to 76 lab steps across 2 files, read each file once and make edits in groups, not one step at a time.

3. **Do not spawn a background agent and then also work on the same files.** When an agent and the main thread both edit the same file, every Edit call fails with "file modified since read" — doubling the reads needed.

4. **Lab data files are large (~1300+ lines each).** When reading them, use `offset` and `limit` to read only the section you need. Only do a full file read when you genuinely need the whole structure.

5. **At context compaction boundaries, large file contents are dropped from context.** The summary captures structure and key facts but not exact file contents — plan for a re-read after compaction rather than assuming the content is still loaded.

6. **For new lab steps, always include a `document` array.** Both existing lab files have complete coverage — don't create a step without one or it will render with no documentation section.
