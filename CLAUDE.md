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
- Explicit **Pause** button saves to `paused_tests`
- Navigating away via sidebar triggers a confirm dialog ("test will be saved automatically")
- Auto-saves to `paused_tests` on component unmount if test was active
- `beforeunload` warns on browser refresh/close
- "Return to Test" banner appears on test setup screen; also resumable via `?resume=<id>` URL

### Bookmarks
- Save any question with a reason: 🔥 Super Hard / 🤔 Confusing / 📢 Show Others / ⭐ Important
- Optional notes field
- Bookmarks page has cert tabs (All / CCNA / Network+ / Security+), reason badges, expandable full question view

### Template System
- Templates use `{{placeholder}}` variables filled from `variable_sets` JSON
- Generate 5 at a time (AI deduplicates against existing library)
- Pre-made Templates page: Browse / Duplicates / Approved Similar / Retired tabs
- Duplicate detection: Jaccard word-overlap ≥50%, same cert/domain/difficulty
- Approved duplicate pairs stored in `localStorage`

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

### Study Mode
- Cert selection → concept card (domain + bullets) → "I'm ready" loads a question for that domain
- Bookmark button available on questions

---

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
