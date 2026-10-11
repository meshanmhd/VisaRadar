# VisaRadr — Automated Embassy & Immigration Policy Automation Platform

## The Problem

Immigration policies, visa eligibility criteria, fee schedules, and compliance regulations change constantly and unpredictably. Government immigration authorities and embassy portals (such as the UK Home Office and gov.uk) frequently publish policy updates, revised guidance, salary thresholds, and procedural requirements directly on web pages without structured APIs, RSS feeds, or real-time notification mechanisms.

This operational reality causes severe challenges for immigration law firms, corporate mobility teams, consultancies, and applicants:

- **Unannounced & Fragmented Changes**: Critical policy alterations—such as revised maintenance funds, biometric appointment rules, or qualifying work experience criteria—are introduced with little to no notice.
- **Costly Manual Monitoring**: Caseworkers and legal teams expend extensive manual effort repeatedly checking dozens of embassy pages. Despite this effort, subtle updates to embedded guidelines or sub-sections are routinely overlooked.
- **Severe Real-World Consequences**: Missing a single policy update leads to refused visa applications, lost government application fees, breached deadlines, visa status lapses, and substantial reputational and legal risk.
- **Communication Bottlenecks**: Translating complex legal amendments into actionable client advisories, assignable operational tasks, and client communications across multiple languages is slow and reactive.

---

## The Solution

**VisaRadar** is an intelligent, multi-agent embassy surveillance and regulatory intelligence platform. It continuously monitors target immigration authorities, isolates exact text and policy revisions, analyzes regulatory intent using Large Language Models, and maps policy impacts directly to tracked client portfolios.
When any chnages are noticed it alert the dashboard with every needed data s like, summary of the problem, affected customers of the organization, and any possible changes needed to the organization website or internal software.
Also we have Public webpage that lists the changes in a single area, so users can spot any changes for free and hassle free.

---

## How we tested
Because we cant change any live embassy website to trigger the process, we made a demo static website to act as the embassy page and made changes to that webpage and triggered the alert successfully.
Demo Website Repo URL: [https://github.com/meshanmhd/](https://github.com/meshanmhd/UkClone)
Live Demo website: [https://ukclone.vercel.app/]

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VisaRadar Surveillance Engine                        │
│                                                                        │
│   FetcherAgent  ──►  ParserAgent  ──►  DiffAgent  ──►  ClassifierAgent │
│        │                                                      │        │
│   (gov.uk / Web)                                         (Groq/Gemini) │
│                                                               │        │
│                         PersistAgent  ◄───────────────────────┤        │
│                              │                                │        │
│                              ▼                                ▼        │
│                      Async Database                     AlertAgent     │
│                     (SQLite / Neon)                           │        │
└───────────────────────────────────────────────────────────────┼────────┘
                                                                │
                                            ┌───────────────────┴────┐
                                            ▼                        ▼
                                   Real-Time SSE Stream       Audit Logs
                                            │
                                            ▼
                             VisaRadar Command Center (React UI)
                   ┌──────────────────────────────────────────────────┐
                   │  • Changes Feed & Semantic Diff Viewer           │
                   │  • Client Portfolio Impact Engine                │
                   │  • Multi-Stage Task Tracker                      │
                   │  • Multi-Language Client Advisory Drafter        │
                   └──────────────────────────────────────────────────┘
```

### Core Capabilities

1. **Autonomous Multi-Agent Scraping Pipeline**:
   - **FetcherAgent**: Retrieves raw snapshots from monitored official portals with retry mechanisms and user-agent rotation.
   - **ParserAgent**: Cleans boilerplate, navigations, and structural markup to preserve core policy prose.
   - **DiffAgent**: Performs granular diffing against historical snapshots to isolate additions, deletions, and modifications.
   - **ClassifierAgent**: Analyzes extracted changes with LLMs (Groq Llama 3.3, Google Gemini, OpenAI) to assign category, severity rating (`severe`, `minor`, `none`), effective dates, and confidence scores. Includes an automatic heuristic fallback when no LLM key is supplied.
   - **PersistAgent**: Persists change records, source metadata, and snapshots asynchronously.
   - **AlertAgent**: Broadcasts real-time events through Server-Sent Events (SSE) directly to active user sessions.

2. **Automated Impact Analysis & Client Mapping**:
   - Automatically cross-references detected regulatory shifts against client records by visa category, country of origin, and processing stage.
   - Computes urgency levels, mandatory remediation actions, system steps, and compliance deadlines.

3. **Operational Workflow & Advisory Automation**:
   - Built-in status review workflows (`pending`, `verified`, `false_positive`, `processed`).
   - Actionable task generation with ownership tracking and due dates.
   - Automated drafting of client notification messages tailored to specific regulatory impacts in multiple languages.

4. **Modern High-Performance Architecture**:
   - Backend powered by FastAPI, LangGraph, APScheduler, and SQLAlchemy async.
   - Frontend built with React 19, TypeScript, Tailwind CSS, TanStack Query, and Lucide icons.

---

## Prerequisites

Live Project URL: [https://visaradar-nova.vercel.app/]

---

## Repository Structure

```
Nova/
├── backend/
│   ├── agents/
│   │   └── scraper_agent.py   # LangGraph multi-agent pipeline
│   ├── routers/
│   │   ├── changes.py         # Changes and impact endpoints
│   │   ├── customers.py       # Client tracking endpoints
│   │   ├── dashboard.py       # Aggregations and metrics
│   │   ├── scraper.py         # Manual execution and SSE stream
│   │   └── sources.py         # Monitored source configuration
│   ├── config.py              # Application settings and environment parsing
│   ├── database.py            # Async SQLAlchemy engine, session, and models
│   ├── main.py                # FastAPI entry point, lifespan, CORS, routers
│   ├── requirements.txt       # Python dependencies
│   ├── scheduler.py           # APScheduler background runner
│   ├── schemas.py             # Pydantic validation schemas
│   └── seed.py                # Sample database seeder
└── frontend/
    ├── src/
    │   ├── pages/             # Dashboard, Changes, Customers, Tasks, Public views
    │   ├── api.ts             # API client and SSE integration
    │   ├── App.tsx            # Application routing and layout
    │   └── types.ts           # Shared TypeScript interfaces
    ├── package.json           # Frontend dependencies and scripts
    └── vite.config.ts         # Vite configuration
```

---

## Setup & Run Commands

### 1. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` to set your desired LLM provider and database settings. Free-tier Groq or Google Gemini can be configured:

```env
APP_ENV=development
DATABASE_URL=sqlite+aiosqlite:///./nova.db

LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Seed initial demonstration data:

```bash
python seed.py
```

Run the backend server:

```bash
uvicorn main:app --reload --port 8000
```

The API service runs at `http://localhost:8000` and interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
```

Install packages using Bun:

```bash
bun install
```

Configure frontend environment:

```bash
cp .env.example .env
```

Default settings in `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

Start the frontend development server:

```bash
bun dev
```

The frontend dashboard runs at `http://localhost:5173`.

---

### 3. Production Build

To build and preview the frontend production assets:

```bash
cd frontend
bun run build
bun run preview
```

---

## API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status check |
| `GET` | `/dashboard/summary` | Aggregated dashboard KPI statistics |
| `GET` | `/changes` | List policy changes with severity and category filters |
| `GET` | `/changes/{id}` | Retrieve individual change with full diff payload |
| `PATCH` | `/changes/{id}` | Update verification status (`verified`, `false_positive`) |
| `GET` | `/changes/{id}/impacts` | List impacted clients and required actions |
| `GET` | `/sources` | List configured monitoring targets |
| `GET` | `/customers` | List tracked client roster |
| `POST` | `/scraper/run` | Trigger immediate pipeline scraping run |
| `GET` | `/scraper/status` | Retrieve scheduler and agent run status |
| `GET` | `/scraper/logs` | Retrieve scraping execution audit logs |
| `GET` | `/alerts/stream` | Server-Sent Events (SSE) real-time alert stream |
| `GET` | `/alerts` | Retrieve all historical alerts |
| `PATCH` | `/alerts/{id}/read` | Mark specific alert as read |
