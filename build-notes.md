# Cert Study App - Build Notes

## Project Overview
A personalized adaptive study platform for CCNA, CompTIA Network+, and Security+ certifications.

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API
- **Hosting:** Vercel
- **Version Control:** GitHub

## Key Features Planned
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
- Voice mode study

## Architecture Decisions
- src/ directory structure
- App Router for page routing
- Tailwind for styling
- Row Level Security enabled in Supabase from day one

## Phase Log
### Phase 1 - Complete
- Node.js v24.16.0 installed
- NPM v11.13.0 installed
- VS Code installed
- GitHub account created
- Supabase account created
- Vercel account created
- Anthropic API account created with $20 balance
### Phase 2 - In Progress
- Project created at H:\cert-study-app
- Next.js initialized with Tailwind, App Router, src/ directory
- Project running locally at http://localhost:3000

### Phase 3 - Complete
- Supabase project created (US West region, status healthy)
- .env.local created with Supabase URL and anon key
- .env.local confirmed in .gitignore - credentials are safe
- Supabase package installed (@supabase/supabase-js)
- src/lib/supabase.js created - connection established
- App running locally with no errors
- Changes pushed to GitHub