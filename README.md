# GeoShield-AI

GeoShield-AI is an AI-powered parametric insurance platform for gig workers that models quote generation, shift-based coverage, automated claim decisions, fraud detection, and payout simulation in one demo-ready product.

## Overview

GeoShield-AI is built as a small monorepo with three core layers:

- A `Next.js` frontend for the public experience, worker dashboard, and admin console
- An `Express.js` backend for authentication, policy orchestration, claims, payouts, and metrics
- A `FastAPI` AI engine for risk scoring, anomaly detection, and graph-based fraud analysis

The project is designed to demonstrate how an insurance workflow can move from reactive claims handling to proactive, explainable, and automation-friendly protection.

## Features

- Weekly policy quote and activation flow for workers
- Shift-based coverage toggling with usage history tracking
- Risk-aware pricing and premium breakdown logic
- Automated and manual claim trigger workflows
- Explainable claim decisions with `APPROVED`, `VERIFY`, and `REJECTED` outcomes
- Fraud and anomaly checks through Python-based ML services
- Graph-based coordinated attack detection for suspicious clusters
- Admin dashboard for claims, payouts, users, and business metrics
- Seeded demo data for recruiter demos, presentations, and testing
- Backend fallback behavior so the demo remains usable if the AI service is unavailable

## Tech Stack

- `Next.js 16` - App Router frontend for the landing experience, worker flows, and admin pages
- `React 19` - Component-driven UI layer for interactive dashboards and stateful pages
- `TypeScript` - Strong typing for safer frontend development
- `Tailwind CSS v4` - Utility-first styling for responsive UI development
- `Framer Motion` - Smooth animations and transitions across the frontend experience
- `Leaflet` - Map visualization for geospatial risk storytelling
- `Node.js` - JavaScript runtime for backend services
- `Express 5` - REST API layer handling auth, policies, claims, payouts, and admin operations
- `MongoDB + Mongoose` - Document database and ODM for flexible insurance and user data models
- `JWT + Cookies` - Session and authentication handling
- `FastAPI` - Python microservice for AI endpoints
- `scikit-learn` - Behavioral anomaly and fraud modeling
- `NumPy` - Numerical operations for model calculations
- `NetworkX` - Fraud-ring and graph relationship analysis
- `Jest + Supertest` - Backend testing for policy and trust-score workflows

## Folder Structure

```text
GeoShield-AI/
|-- ai-engine/        # FastAPI service for fraud, graph, and risk models
|-- backend/          # Express API, business logic, auth, claims, payouts
|-- database/         # Seed and mock data
|-- frontend/         # Next.js application
|-- shared/           # Shared configuration such as pricing rules
|-- workflows/        # JSON workflow definitions
|-- project_analysis.md
`-- README.md
```

## How It Works

1. A worker logs in and requests a policy quote.
2. The backend calculates pricing and activates a weekly policy.
3. The worker can toggle shift coverage on or off during active work hours.
4. Claims can be triggered manually or through automated disruption workflows.
5. The backend evaluates the event, optionally calls the AI engine, and assigns a trust-based outcome.
6. Approved claims move into payout simulation, while `VERIFY` claims appear in the admin review queue.

## Installation

### Prerequisites

- `Node.js 18+`
- `Python 3.10+`
- `MongoDB` local instance or MongoDB Atlas connection

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd GeoShield-AI
```

### 2. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Install AI engine dependencies

```bash
cd ai-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Environment Variables

### Backend: `backend/.env`

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/geoshield
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1d
TRUSTED_ORIGINS=http://localhost:3000
AI_ENGINE_BASE_URL=http://localhost:8001
PAYOUT_PROVIDER=test
RUN_JOBS=false
OPENWEATHER_API_KEY=
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5/weather
AUTH_COOKIE_NAME=geoshield_session
AUTH_COOKIE_DOMAIN=
AUTH_COOKIE_SECURE=false
STRIPE_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
WORKER_INSTANCE_ID=
```

### Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_BASE_PATH=
```

## Run Commands

### Step 1: Start the backend API

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:8000`.

### Step 2: Start the AI engine

```bash
cd ai-engine
.venv\Scripts\activate
python main.py
```

The AI engine runs on `http://localhost:8001`.

### Step 3: Start the frontend

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:3000`.

### Step 4: Seed realistic demo data

```bash
cd backend
npm run reset:realistic-data
```

### Optional commands

```bash
cd backend
npm test
```

```bash
cd backend
npm run start:worker
```

```bash
cd backend
npm run lint:check
```

## Demo Credentials

- Admin: `admin@gmail.com` / `password`
- Worker: `user@gmail.com` / `password`

## Screenshots

Add project screenshots here once available.

```md
![Landing Page](./docs/screenshots/landing-page.png)
![Worker Dashboard](./docs/screenshots/worker-dashboard.png)
![Admin Console](./docs/screenshots/admin-console.png)
```

Suggested captures:

- Landing page
- Worker dashboard
- Claims page
- Risk map view
- Admin review queue
- Payout dashboard

## API Highlights

- `POST /api/auth/register` - register a user
- `POST /api/auth/login` - authenticate a user
- `POST /api/policy/quote` - generate a policy quote
- `POST /api/policy/activate` - activate a worker policy
- `POST /api/claim/auto-trigger` - trigger a claim workflow
- `POST /api/claim/zero-touch-scan` - run automated disruption checks
- `GET /api/payout/summary` - fetch payout metrics
- `GET /api/metrics/admin-dashboard` - load admin insights

## Future Improvements

- Integrate live weather, traffic, and disruption feeds instead of simulated inputs
- Replace demo payout simulation with a production-grade provider workflow
- Expand test coverage for AI engine and end-to-end claim journeys
- Add role-based audit trails and stronger production security hardening
- Containerize all services for smoother deployment and scaling
- Introduce event-driven processing for high-volume automated triggers

## Contribution Guidelines

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Run relevant tests before submitting
5. Open a pull request with a short summary of what changed

For larger changes, open an issue first so the implementation direction can be aligned early.

## License

This project is documented here with an `MIT` license assumption unless you choose a different license for the repository.
