# GeoShield-AI

GeoShield-AI is a web-first parametric insurance demo for gig workers. It combines weekly policy pricing, shift-based coverage toggling, explainable claims decisions, payout simulation, and an admin review console on top of a geospatial risk narrative.

The repository is organized as a small monorepo:

- `frontend/`: Next.js 16 app for the public demo, worker experience, and admin console
- `backend/`: Express 5 API, auth, policy logic, claims, payouts, metrics, and demo-data seeding
- `ai-engine/`: FastAPI risk and fraud services with local backend fallbacks
- `database/`: mock/seed support files
- `shared/`: shared pricing configuration
- `workflows/`: JSON workflow descriptions for risk and claims automation

## What The App Does

GeoShield-AI models a gig-worker protection flow where a worker can:

1. Register or log in
2. Request and activate a weekly policy
3. Toggle shift coverage `ON` and `OFF`
4. Monitor live zone risk and premium context
5. Submit manual claims or run a zero-touch trigger scan
6. See explainable claim outcomes with trust scoring
7. Track payouts and payout history

The admin experience adds:

- an admin dashboard for claims and financial metrics
- a user-management page for role updates and account cleanup
- a payouts center with settlement processing and payout ledger visibility
- a review queue for `VERIFY` claims

## Current Product Surfaces

### Public / marketing-style pages

- `/`: landing page
- `/demo`: public geospatial demo workspace
- `/privacy`

### Worker-facing app

- `/register`
- `/login`
- `/dashboard`
- `/dashboard/policy`
- `/policy`
- `/risk`
- `/claims`

### Admin-facing app

- `/admin`
- `/admin/users`
- `/payouts`

The admin pages share the same in-app command bar with tabs for dashboard, user management, and payouts.

## Core Flows

### Policy flow

- Workers request a quote from `POST /api/policy/quote`
- A weekly policy can be activated from `POST /api/policy/activate`
- Current policy, history, terms, and updates are exposed through `/api/policy/*`
- The worker dashboard and policy pages display premium, coverage amount, loss ratio context, and policy history

### Shift-based micro-coverage

- Coverage can be toggled from the worker summary flow
- Toggle history is persisted and exposed through `/api/worker/:id/policy/history`
- The backend auto-pauses coverage after 12 continuous hours to avoid accidental overbilling

### Claims flow

- Manual claim trigger: `POST /api/claim/auto-trigger`
- Zero-touch automation scan: `POST /api/claim/zero-touch-scan`
- Trigger feed: `GET /api/claim/triggers/feed`
- Claim history: `GET /api/claim/history`
- Admin review queue: `GET /api/claim/admin/review-queue`
- Admin review action: `PATCH /api/claim/admin/:id/review`

Claim outcomes are explainable and currently resolve to:

- `APPROVED`
- `VERIFY`
- `REJECTED`

### Payout flow

- Settlement processing: `POST /api/payout/process`
- Payout history: `GET /api/payout/history`
- Payout summary: `GET /api/payout/summary`
- Claim payout lookup: `GET /api/payout/claim/:claimId`

The current payout rail is simulated but structured as a Razorpay-ready service abstraction. The admin payouts page can view platform-wide seeded payout activity, while worker-level views use the worker-specific summary/history endpoints.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Leaflet
- next-sitemap

### Backend

- Node.js
- Express 5
- Mongoose
- JWT authentication
- Helmet
- CORS
- express-rate-limit
- Zod-based validators

### AI / analytics

- FastAPI
- scikit-learn
- NumPy
- NetworkX

### Testing

- Jest
- Supertest

## Backend Behavior Worth Knowing

- The backend now waits for MongoDB before starting the HTTP server.
- `/health` reflects database state and returns `503` if Mongo is unavailable.
- Production proxy handling is enabled so rate limiting works correctly behind Render or another reverse proxy.
- Login returns `503` for database-unavailable scenarios instead of a misleading generic `500`.
- Password hashing uses the current async Mongoose hook style and transparently upgrades demo/plaintext passwords to bcrypt on save.

## Architecture Overview

### Frontend

The frontend is a static Next.js app that talks to the backend API. It includes:

- a public storytelling layer
- a protected worker dashboard
- an admin command center
- policy, claims, risk, and payouts pages

### Backend

The backend is the orchestration layer. It handles:

- auth and session cookies
- policy pricing and activation
- worker policy toggles and summaries
- claim creation and admin review
- payout processing and payout summaries
- admin/business metrics
- demo-data reset scripts

### AI engine

The Python service provides:

- risk scoring
- premium modeling
- fraud/anomaly evaluation
- graph-based fraud/ring analysis

If the AI service is unavailable, the backend falls back to local logic so the app remains demoable.

## Key API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/users`
- `PUT /api/auth/users/:id/role`
- `DELETE /api/auth/users/:id`

### Policy

- `GET /api/policy/current`
- `GET /api/policy/history`
- `GET /api/policy/terms`
- `POST /api/policy/quote`
- `POST /api/policy/activate`
- `PUT /api/policy/current`
- `POST /api/policy/cancel`

### Claims

- `GET /api/claim/history`
- `POST /api/claim/auto-trigger`
- `POST /api/claim/zero-touch-scan`
- `GET /api/claim/triggers/feed`
- `GET /api/claim/admin/review-queue`
- `PATCH /api/claim/admin/:id/review`

### Payouts

- `POST /api/payout/process`
- `GET /api/payout/history`
- `GET /api/payout/summary`
- `GET /api/payout/claim/:claimId`

### Worker micro-policy

- `GET /api/worker/:id/summary`
- `POST /api/worker/:id/policy/toggle`
- `GET /api/worker/:id/policy/history`
- `GET /api/worker/:id/policy/summary`

### Risk and metrics

- `GET /api/risk/zone-risk`
- `GET /api/risk/weather-metadata`
- `POST /api/risk/premium-breakdown`
- `GET /api/metrics/business`
- `GET /api/metrics/admin/financials`
- `GET /api/metrics/admin-dashboard`

### System

- `GET /health`
- `GET /version`
- `GET /system/status`

## Demo Data

The fastest way to make the app look alive is to seed the current realistic demo set:

```bash
cd backend
npm run reset:realistic-data
```

This keeps the demo users and reseeds:

- 1 active worker policy
- recent policy toggle history
- 5 sample claims across `APPROVED`, `VERIFY`, and `REJECTED`
- 3 payout ledger records, including a failure-and-retry scenario
- enough worker/admin data for the dashboard, claims page, review queue, and payouts center

### Demo credentials

- Admin: `admin@gmail.com` / `password`
- Worker: `user@gmail.com` / `password`

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB local instance or MongoDB Atlas

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/geoshield
JWT_SECRET=geoshield_super_secret_key_2026
AI_ENGINE_BASE_URL=http://localhost:8001
TRUSTED_ORIGINS=http://localhost:3000
PAYOUT_PROVIDER=test
RUN_JOBS=false
```

Start the API:

```bash
npm run dev
```

Optional:

- `npm run reset:realistic-data`
- `npm run test`
- `npm run lint:check`

### 2. AI engine

```bash
cd ai-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Production Notes

- The frontend defaults to `https://geoshield-ai-2.onrender.com` as the API base if `NEXT_PUBLIC_API_BASE_URL` is not supplied.
- The frontend sets security headers in `frontend/next.config.ts`.
- The backend expects a working `MONGO_URI` and `JWT_SECRET`.
- In production, cookies use `SameSite=None` and secure-cookie behavior.
- Render-style proxy environments are supported via Express `trust proxy`.

## Optional Worker Process

Background jobs can be run separately:

```bash
cd backend
npm run start:worker
```

This worker connects to MongoDB and starts scheduled background jobs such as payout reconciliation and automated trigger monitoring.

## Testing

Backend tests currently cover:

- trust score behavior
- AI fallback behavior
- worker policy toggle flow
- policy history
- auto-shutoff after 12 hours
- unauthorized access handling

Run:

```bash
cd backend
node .\node_modules\jest\bin\jest.js --runInBand
```

`npm test` also works in a normal local environment.

## Repository Structure

```text
GeoShield-AI/
|-- ai-engine/
|-- backend/
|-- database/
|-- frontend/
|-- shared/
|-- workflows/
|-- project_analysis.md
|-- README.md
```

## Current Limitations

- Several external data feeds are still simulated or blended with fallback logic.
- The payout provider is simulated rather than a live production integration.
- Worker/auth/session flows are demo-friendly and should be hardened further for production.
- Pricing logic exists in both quote-oriented and richer breakdown-oriented paths.
- The frontend and backend are tuned for a strong demo and hackathon story, not yet full production operations.

## Summary

GeoShield-AI currently demos a complete worker-insurance loop:

- quote and activate a weekly policy
- toggle shift-aware coverage
- trigger claims manually or via zero-touch automation
- explain claim decisions
- process payouts
- review operations in an admin console

It is strongest as a demoable, web-first parametric insurance workflow with AI-assisted reasoning and realistic seeded data for presentations and judging.
