# Requirements Document - Political Analytics Platform (War Room Dashboard)

## 1. Project Overview
The **Political Analytics Platform** (also referred to as the **War Room Dashboard**) is a specialized web application designed for strategic political analysis. It aggregates election data, candidate profiles, and social trends to provide actionable insights for political strategists, party executives, and analysts.

## 2. Technical Stack
- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (likely via Supabase)
- **Visualization:** Recharts
- **Icons:** Lucide React
- **Runtime:** Node.js / Bun

## 3. Core Features (Phase 1)

### 3.1 Candidate Deep Dive (Analysis)
- **Profile Management:** Detailed view of individual candidates.
- **Metrics:**
  - **Vote Share:** Percentage of total votes.
  - **Margin:** Difference between winner and runner-up.
  - **Potential Score (0-100):** Calculated metric based on winning status, margin tightness, and total votes.
  - **Competitive Index (0-100):** Derived from margin (lower margin = higher index).
- **Comparisons:** Side-by-side comparison with competitors in the same district.
- **Search:** Fuzzy search by name, party, or province.

### 3.2 Target Seat Analyzer
- **Categorization:** Automatically classify districts into 4 strategic categories:
  - **Safe Seats:** Margin > 20%
  - **Marginal Seats:** Margin 10-20%
  - **Competitive Seats:** Margin 5-10%
  - **Lost/Uncertain:** Margin < 5%
- **Strategy:** Filtering by party to identify "Must Win" or "Defend" zones.
- **Visualization:** Color-coded categorization for quick visual assessment.

### 3.3 Advanced Search & Filtering
- **Real-time Querying:** Instant results updates.
- **Multi-factor Filtering:**
  - **Status:** Winner, Loser, Competitive.
  - **Geography:** Region, Province.
  - **Affiliation:** Political Party.
- **Data Grid:** Interactive tables with sorting and clearing capabilities.

## 4. Database Schema Requirements
The platform requires a relational database (PostgreSQL recommended) to handle complex relationships between people, parties, and elections.

### 4.1 Key Entities
- **Geography:** Regions, Provinces, Constituencies (Districts).
- **Political Structure:** Parties (including history of dissolution/mergers), Political Groups (Factions/Houses).
- **People:** Candidates (Personal info, history), Participation (Election results per year).
- **Stats:** Election results, Voter Turnout, Invalid/No Votes.

### 4.2 Analytical Models
- **User Simulations:** Ability to save "User Scenarios" (Swing Vote configurations).
- **User Favorites:** Bookmarking interesting candidates.
- **Social Trends:** Tracking daily social media stats (Followers, Engagement).

## 5. UI/UX Requirements
- **Responsive Design:** Fully functional on Desktop and Mobile.
- **Aesthetics:** "War Room" feel—dark mode optimized, high contrast, dashboard-style layout.
- **Interactivity:** Hover effects on charts, sticky headers for long lists, immediate feedback on filters.

## 6. Future Capabilities (Roadmap)
- **Money Politics:** Tracking assets, liabilities, and party donations ("Follow the Money").
- **Parliamentary Performance:** Voting records (finding "Cobras" or rebels), parliamentary motions.
- **Business Connections:** Analyzing conflicts of interest via business holdings and government contracts.
