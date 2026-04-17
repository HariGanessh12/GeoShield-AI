# GeoShield-AI

GeoShield-AI is a hackathon-ready parametric insurance platform for gig workers. It combines geospatial risk intelligence, weekly policy pricing, shift-based coverage toggling, and AI-assisted claim evaluation so workers can be protected only when they are actually on the road.

The current repository includes two connected product layers:

- A public-facing geospatial risk demo built in Next.js that showcases live-map style threat visibility.
- A protected worker insurance workflow where a user can register, activate a weekly policy, toggle micro-coverage `ON` or `OFF`, trigger a claim, and receive an explainable decision.

## Problem Overview

Gig workers lose income because of events they cannot control: heavy rain, heatwaves, pollution spikes, and platform outages. Traditional insurance is too slow, too paperwork-heavy, and too static for workers whose schedules change daily.

GeoShield-AI addresses that gap with a parametric model:

- the system monitors predefined disruption signals
- the worker buys a weekly policy instead of a long, rigid contract
- coverage can be activated only during a live shift
- claims are evaluated automatically with explainable scoring
- suspicious behavior is screened before payout

In short, the product aims to make income protection feel as real-time as gig work itself.

## Why This Project Matters

- Gig workers need protection measured in hours and shifts, not annual policies.
- Parametric triggers reduce manual paperwork and speed up decisions.
- Explainable AI helps users and judges understand why a claim was approved, queued for verification, or rejected.
- Micro-policy controls reduce wasted premium spend when the worker is off-duty.

## Persona-Based Scenarios

### 1. Rahul, Food Delivery Rider in Delhi NCR

Rahul works lunch and dinner peaks, not fixed 9-to-5 hours. Before starting his shift, he turns coverage `ON`. A heatwave pushes zone severity above the payout threshold, and later he triggers a disruption claim. Because his reputation is strong and his history looks normal, the claim is approved quickly.

### 2. Aisha, Grocery Delivery Partner in Mumbai South

Aisha works during monsoon season where local flooding risk changes daily. She activates a weekly policy, sees a higher zone-adjusted premium, and uses the dashboard to understand her pricing breakdown. When heavy rain affects operations, the system can validate the parametric trigger and explain the payout logic.

### 3. Vikram, Bike Taxi Driver With Irregular Hours

Vikram does not want always-on insurance because he drives intermittently. GeoShield-AI lets him keep his weekly policy active while only enabling coverage when he is actually on shift. If he forgets to turn it off, the system auto-pauses coverage after 12 continuous hours to avoid accidental overbilling.

### 4. Admin / Operations Reviewer

An admin monitors zone risk, user activity, and claims. If a claim falls into a gray area, the trust score and reasons make it clear whether the issue is a location mismatch, anomaly flag, or fraud-ring signal instead of a black-box rejection.

## Application Workflow

### Worker Journey

1. A worker registers or logs in through the web app.
2. The worker requests a weekly policy quote.
3. The backend calculates a weekly premium using zone, persona, and reputation inputs.
4. The worker activates the weekly policy for a 7-day coverage window.
5. At the start of a shift, the worker toggles micro-policy coverage `ON`.
6. During the shift, the dashboard shows current risk, premium context, and recent policy activity.
7. If a disruption occurs, the worker triggers a claim from the claims page.
8. The backend verifies whether the event is covered and whether severity crosses the payout threshold.
9. The claim is scored using AI and rule-based checks.
10. The result is returned with a status of `APPROVED`, `VERIFY`, or `REJECTED`, plus reasons and trust adjustments.
11. Claim history and policy history are stored for auditability.

### System Flow

1. Next.js frontend calls the protected Express API.
2. Express validates the JWT and request payload.
3. Policy rules confirm that the trigger is covered and exclusions do not apply.
4. External event data is normalized into a severity score.
5. The backend sends risk or fraud requests to the FastAPI AI engine when available.
6. If the AI engine is unavailable, the backend falls back to local scoring logic.
7. Claim and policy data are persisted in MongoDB.
8. The UI updates the dashboard, policy panel, and recent claims feed.

## Weekly Premium Model

GeoShield-AI uses a weekly premium because gig work is dynamic and cash-flow sensitive.

### Current Pricing Logic in the Repository

There are two pricing paths in the codebase:

#### 1. Policy Quote Endpoint

`POST /api/policy/quote`

This route calculates a simple weekly quote using:

- base premium: `INR 50`
- zone surcharge:
  - `Delhi NCR`: `+25`
  - `Mumbai South`: `+35`
  - `Bangalore Central`: `+15`
- reputation discount:
  - `1 INR` off for each reputation point above `80`
  - capped at `INR 15`

This creates an easy-to-explain quote for policy activation.

#### 2. AI Risk Premium Breakdown

`POST /api/risk/premium-breakdown`

This route uses the Python risk model, or a local fallback mirroring it, to compute:

- expected loss
- risk margin
- platform fee
- persona multiplier
- final weekly premium

The actuarial-style formula implemented in `ai-engine/risk_model.py` is:

`weekly premium = expected loss + 30% risk margin + INR 15 platform fee`

with final premium capped between `INR 50` and `INR 300`.

### Micro-Policy Savings Model

The weekly policy is paired with a monthly savings view for shift-based coverage:

- assumed full-coverage monthly cost: `INR 120`
- assumed month duration: `720` hours
- cost is estimated based on actual active coverage hours
- the dashboard shows:
  - active coverage hours
  - estimated monthly saving
  - equivalent micro-policy monthly cost
  - coverage efficiency percentage

This makes the product story stronger: the worker pays for a weekly policy, but the platform also demonstrates how shift-aware usage reduces waste versus always-on protection.

## Parametric Triggers Used in the System

### Primary Trigger Types

The repository currently supports these key disruption categories:

- `HEAVY_RAIN`
- `HEATWAVE`
- `PLATFORM_OUTAGE`
- `AQI_SEVERE` in external severity simulation

### Trigger Rules

A claim is processed against the following parametric checks:

- event must be included in the policy's `coveredEvents`
- worker inactivity can reject the claim through the `INACTIVE_WORKER` exclusion
- event severity must meet the payout threshold
- non-outage events with severity below `0.5` are rejected
- GPS or location mismatch can reduce trust score
- suspicious device or IP clustering can reduce trust score

### Covered Events and Exclusions

Default covered events in the policy model:

- `HEAVY_RAIN`
- `HEATWAVE`
- `PLATFORM_OUTAGE`

Default exclusions in the policy model:

- `INACTIVE_WORKER`
- `GPS_MISMATCH`
- `ALREADY_COMPENSATED`
- `FRAUD_FLAGGED`
- `DEVICE_ANOMALY`

## Why The Platform Choice Is Web

GeoShield-AI is currently best suited as a web platform for this stage of development.

### Why Web Fits This Repository

- The repo already implements a complete Next.js web frontend with public and authenticated flows.
- A web app is faster to demo, easier to deploy, and simpler for judges to access without app-store friction.
- Admin workflows, audit trails, policy history, and premium explainability are easier to present on larger screens.
- Public demo pages, risk maps, dashboard cards, and claims history all benefit from responsive browser-based layouts.
- The same web foundation can later be wrapped into a PWA or mobile app if field usage becomes the priority.

### Product Justification

For hackathon and early product validation, web is the right choice because it optimizes:

- speed of iteration
- ease of deployment
- multi-role access for workers and admins
- clear storytelling during demos

## AI/ML Integration Details

GeoShield-AI does not use AI as a generic chatbot layer. It uses focused models and decision services that map directly to insurance operations.

### 1. Premium Calculation

`ai-engine/risk_model.py` calculates a risk score and weekly premium using:

- weather severity
- traffic delay
- location risk index
- persona multiplier

Outputs include:

- `risk_level`
- `risk_score`
- `weekly_premium_inr`
- `expected_loss`
- `risk_margin`
- explainable pricing breakdown

### 2. Fraud Detection

`ai-engine/fraud_model.py` uses `IsolationForest` to detect behavioral anomalies from prior claim history and current claim amount.

If the FastAPI service is unavailable, the backend uses a local fallback based on deviation from historical averages.

### 3. Coordinated Fraud / Ring Detection

`ai-engine/graph_detection.py` uses NetworkX to flag suspicious connected components such as workers sharing device, IP, or geo-linkage patterns.

### 4. Trust Scoring and Decision Automation

`backend/services/trustScore.js` combines AI results with business rules:

- starts from a trust score of `100`
- applies penalties for anomaly detection
- applies penalties for fraud-ring or network risk
- applies penalties for GPS or location mismatch
- applies a reputation bonus for strong users
- applies a grace buffer for borderline but reputable workers

Final outcomes:

- `APPROVED` for high-confidence low-risk claims
- `VERIFY` for borderline claims needing review
- `REJECTED` for clearly risky or uncovered claims

### 5. Automation and Fallback Strategy

The backend calls the FastAPI service on `localhost:8001` for:

- `/fraud-detect`
- `/graph-detect`
- `/risk-score`

If that service is down, GeoShield-AI still works by falling back to deterministic local logic. That is a strong implementation detail for demos because the app remains functional even when the ML microservice is unavailable.

## Core Product Features

- Weekly policy activation with a 7-day active window
- Shift-based micro-policy toggle (`ON` / `OFF`)
- Auto-pause after 12 continuous hours of active coverage
- Claim auto-trigger flow with explainable reasons
- Risk-based premium breakdown
- Claim history and policy history
- JWT-protected APIs
- Rate limiting, request IDs, and security middleware
- Public geospatial demo experience with interactive risk map

## Architecture Overview

### High-Level Design

- `frontend/`: Next.js 16, React 19, TypeScript UI
- `backend/`: Express API gateway and business logic
- `ai-engine/`: FastAPI microservice for scoring and ML operations
- `database/`: seed data and MongoDB-backed persistence
- `workflows/`: JSON flows describing claim, risk, and fraud processing paths

### Development Architecture

The current architecture is best described as a modular monorepo:

- frontend handles experience and visualization
- backend handles auth, policy logic, claims, and orchestration
- AI engine handles heavier analytical calculations
- MongoDB stores users, policies, claims, and toggle activity

This structure is already good for hackathon delivery and can evolve into separate deployable services later.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Leaflet

### Backend

- Node.js
- Express 5
- Mongoose
- JWT authentication
- Helmet
- CORS
- express-rate-limit
- Zod-based validation helpers

### AI / Analytics

- FastAPI
- scikit-learn
- NumPy
- NetworkX
- Pydantic

### Database and Data

- MongoDB
- JSON seed data

### Dev and Testing

- Jest
- Supertest
- Nodemon

## Repository Structure

```text
GeoShield-AI/
|-- frontend/        Next.js web app and public demo
|-- backend/         Express API, models, routes, services, tests
|-- ai-engine/       FastAPI service and ML/risk logic
|-- database/        Seed data
|-- workflows/       Risk, fraud, and claim flow definitions
|-- project_analysis.md
|-- README.md
```

## API Highlights

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Policy

- `GET /api/policy/current`
- `POST /api/policy/quote`
- `POST /api/policy/activate`

### Worker Micro-Policy

- `GET /api/worker/:id/summary`
- `POST /api/worker/:id/policy/toggle`
- `GET /api/worker/:id/policy/history`
- `GET /api/worker/:id/policy/summary`

### Claims

- `GET /api/claim/history`
- `POST /api/claim/auto-trigger`

### Risk

- `GET /api/risk/zone-risk`
- `POST /api/risk/premium-breakdown`

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB local instance or MongoDB Atlas URI

### Backend

```bash
cd backend
npm install
```

Create `.env` in `backend/`:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/geoshield
JWT_SECRET=geoshield_super_secret_key_2026
AI_ENGINE_BASE_URL=http://localhost:8001
```

Run the backend:

```bash
npm run dev
```

### AI Engine

```bash
cd ai-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Demo Notes

- The public site demonstrates geospatial threat visibility and risk storytelling.
- The protected app demonstrates the insurance workflow end to end.
- If the AI engine is offline, the backend still returns fallback premium and claim decisions.
- A default admin seeding flow exists in the auth module for demo convenience.

## Testing

Backend tests currently cover:

- trust-score evaluation behavior
- local fallback behavior when AI services are unavailable
- worker micro-policy toggling
- audit trail history
- 12-hour auto-shutoff logic
- unauthorized access handling

Run backend tests with:

```bash
cd backend
npm test
```

## Development Plan

### Phase 1: Core Demo Foundation

- user auth
- weekly policy activation
- claim trigger flow
- MongoDB persistence

### Phase 2: Differentiating Insurance Layer

- micro-policy on/off toggle
- policy history and worker summary
- active coverage savings model
- auto-shutoff after continuous use

### Phase 3: AI and Risk Intelligence Expansion

- stronger live external integrations for weather and platform outage feeds
- production-grade fraud graph inputs
- async event processing and queue-based scaling
- mobile or PWA packaging for worker-first distribution

## Additional Strengths

- The README story is supported by actual route, model, and test coverage.
- The fallback logic improves reliability during live demos.
- Explainable outputs make the product easier to pitch to judges and reviewers.
- The combination of geospatial intelligence plus parametric insurance makes the project more memorable than a standard claims dashboard.

## Current Limitations

- Some external data integrations are still mocked.
- Auth currently uses plain credential matching and should be hardened for production.
- The public landing experience emphasizes geospatial monitoring more than insurance, so future product polish should unify those narratives even more clearly.
- Premium logic currently exists in both a simple quote route and a richer AI risk route; these should be consolidated later into one pricing source of truth.

## Summary

GeoShield-AI is a web-first, AI-assisted parametric insurance platform for gig workers. Its strongest differentiator is the combination of weekly pricing, shift-aware micro-coverage, explainable automated claims, and geospatial risk intelligence. That makes it both technically credible and demo-friendly for hackathons, accelerators, and early product validation.
