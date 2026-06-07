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
    FloatingReferencePanel.js     Fixed button on test page (practice mode only) — cert-filtered quick reference (subnetting, ports, OSI, attacks, encryption)
    FloatingChat.js               Fixed chat bubble on all Study Hub pages — session-only tutor chat via /api/chat
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
| `lab_progress` | Completed lab steps per user (user_id, lab_set_id, lab_id, step_id, completed_at) |
| `lab_notes` | Per-lab notes per user (user_id, lab_set_id, lab_id, notes, updated_at) |

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
- **Network+ Fundamentals** (`network-plus-fundamentals.js`): 5 labs — Topology documentation, VLAN segmentation + inter-VLAN routing, wireless AP config (WPA2), troubleshooting methodology (OSI layers), port security with sticky MACs and violation modes
- **Security+ Network Labs** (`security-plus-labs.js`): 4 labs — ACL-based firewall rules with DMZ, DMZ network design (three-zone architecture), device hardening (SSH v2, encrypted passwords, login rate limiting), network segmentation (VLANs per trust level with IoT isolation)

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

## Token Efficiency Rules
These rules exist because a previous session burned excessive tokens on avoidable mistakes:

1. **Never use a background agent to edit a single large file.** Background agents edit one step at a time, read the file repeatedly, and conflict with main-thread edits. For bulk data edits (e.g. adding a field to all lab steps), do it directly with batched Edit calls in the main thread.

2. **Batch large data edits — don't do one Edit per item.** When adding the same field to 76 lab steps across 2 files, read each file once and make edits in groups, not one step at a time.

3. **Do not spawn a background agent and then also work on the same files.** When an agent and the main thread both edit the same file, every Edit call fails with "file modified since read" — doubling the reads needed.

4. **Lab data files are large (~1300+ lines each).** When reading them, use `offset` and `limit` to read only the section you need. Only do a full file read when you genuinely need the whole structure.

5. **At context compaction boundaries, large file contents are dropped from context.** The summary captures structure and key facts but not exact file contents — plan for a re-read after compaction rather than assuming the content is still loaded.

6. **For new lab steps, always include a `document` array.** Both existing lab files have complete coverage — don't create a step without one or it will render with no documentation section.
