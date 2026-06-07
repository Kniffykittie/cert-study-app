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
    study-hub/
      page.js                     Overview (DailyStreak component)
      ccna/page.js                CCNA cert page (DomainTrend + Recommended Focus)
      network-plus/page.js        Network+ cert page
      security-plus/page.js       Security+ cert page
      test/page.js                Take a Test (practice / simulation / real exam)
      study/page.js               Study Mode (concept cards + per-domain question)
      bookmarks/page.js           Saved bookmarks with cert tabs + reason badges
      flashcards/page.js          Flashcard study
      progress/page.js            Progress tracking
      results/page.js             Past test results
      reference/page.js           Reference sheets (subnetting, ports, OSI, etc.)
      flagged/page.js             Flagged/reported questions
      templates/page.js           Generate AI templates (5 per batch)
      premade-templates/page.js   Browse/manage template library (duplicates, retired)
  components/
    StudyHubSidebar.js            Nav sidebar with test-in-progress guard
    BookmarkModal.js              Bookmark reason + notes modal
    DailyStreak.js                30q/day streak tracker with 28-day calendar
    DomainTrend.js                Per-domain score trend SVG chart
    ScoreChart.js                 Overall score chart
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
| `profiles` | User display name |

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
- After every commit/push, always give the user the pull command:
  `git pull origin claude/adoring-shannon-sTxW8`
- Update both `CLAUDE.md` and `build-notes.md` at the end of every session or after any significant feature is completed.
- After every change or fix, always provide a brief end-of-change summary covering:
  1. **What the problem was** (or what was requested)
  2. **What was changed** (files/logic updated)
  3. **What to test** to confirm it works correctly
