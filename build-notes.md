# Cert Study App - Build Notes

## Project Overview
A personal command center combining a study platform for CCNA, CompTIA Network+, 
and Security+ certifications with a life tracking hub for health, nutrition, and wellness.

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API
- **Hosting:** Vercel
- **Version Control:** GitHub

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

### Phase 4.5 - Up Next
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

### Phase 5 - Planned
Authentication — login, signup, protected routes, user sessions via Supabase Auth

## Future Features
- Active sidebar state highlighting current page
- Back button on cert detail pages
- Trend indicators per cert showing improvement over time
- Last 5 tests summary per cert page
- Exam countdown timer with target date setting
- Google Fit / Fitbit API integration
- Cross cert overlap section
- Confidence rating breakdown per topic bucket
- Weakness heatmap visual per cert
- Spaced repetition system
- Exam simulation mode
- Predicted readiness score
- In context AI tutor per question
- Full correlation engine with daily snapshots
- PWA conversion
- General purpose Claude chat section