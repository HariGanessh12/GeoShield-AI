# GeoShield-AI

GeoShield-AI is a shift-aware insurance engine for gig workers that auto-prices protection, auto-scores claims, and only pays when the worker is actually on shift.

## Why this exists
Gig workers lose income when the day breaks, not when a paperwork workflow decides to move. GeoShield-AI is built to cover:
- heatwaves
- heavy rain
- platform outages
- other disruption-driven income shocks

The Phase 2 upgrade adds a differentiating concept that judges can remember: a micro-policy engine that lets workers turn coverage on and off during active work hours instead of paying for static, always-on coverage.

## What makes this different
- Coverage follows the shift, not the calendar. That is a more believable model for delivery and ride-share work.
- Claims are explainable, not opaque. Every decision returns reasons, trust score, and payout logic.
- The demo feels productized. The UI shows worker profile, policy state, toggle history, and recent claims in one place.

## Core feature added for Phase 2
### Micro-Policy Engine
Workers can toggle policy coverage between `ON` and `OFF`.

Why it matters:
- gig workers have irregular schedules
- static insurance is wasteful when they are off-duty
- on/off coverage makes the product feel custom-built for the gig economy instead of generic insurance software

Endpoints:
- `POST /api/worker/:id/policy/toggle`
- `GET /api/worker/:id/policy/history`
- `GET /api/worker/:id/summary`

## Backend architecture
- `Node.js` + `Express`
- `MongoDB` + `Mongoose`
- structured request logging with request IDs
- standard JSON response envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

## API endpoints

### Health
`GET /health`

Response:
```json
{
  "success": true,
  "data": { "status": "healthy" },
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Version
`GET /version`

Response:
```json
{
  "success": true,
  "data": {
    "service": "backend",
    "name": "backend",
    "version": "1.0.0",
    "environment": "development"
  },
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Login
`POST /api/auth/login`

Request:
```json
{ "email": "user@gmail.com", "password": "password" }
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt",
    "user": {
      "id": "mongo-user-id",
      "email": "user@gmail.com",
      "role": "worker"
    }
  },
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Claim history
`GET /api/claim/history`

Response:
```json
{
  "success": true,
  "data": [],
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Auto-trigger sample claim
`POST /api/claim/auto-trigger`

Request:
```json
{
  "disruptionFactor": {
    "type": "PLATFORM_OUTAGE",
    "lossAmount": 400
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Claim processing completed",
    "decision": {
      "status": "APPROVED",
      "trust_score": 90,
      "reasons": []
    }
  },
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Worker summary
`GET /api/worker/:id/summary`

Returns:
- worker profile
- current policy
- current shift state
- recent claims
- recent policy toggles

### Toggle policy
`POST /api/worker/:id/policy/toggle`

Request:
```json
{ "state": "ON", "reason": "demo_toggle" }
```

Response:
```json
{
  "success": true,
  "data": {
    "workerId": "mongo-user-id",
    "policy": {
      "shiftState": "ON",
      "toggleCount": 3
    }
  },
  "error": null,
  "timestamp": "2026-04-04T06:00:00.000Z"
}
```

### Policy history
`GET /api/worker/:id/policy/history`

## Demo-ready UI
Open the standalone dashboard:

`frontend/public/phase2-demo-dashboard.html`

It shows:
- worker profile
- current policy state
- on/off coverage toggle animation
- policy toggle history
- recent claims

## Local setup
```bash
cd backend
npm install
npm run dev

cd ../frontend
npm run dev
```

## What makes this different
- It is not just another claims bot. It is a time-aware coverage system for on-demand labor.
- It combines claims automation with a policy state machine, which makes the product feel more like insurance infrastructure than a generic AI app.
- The UI and API are built for demos: visible state changes, clear explanations, and a memorable story for judges.
