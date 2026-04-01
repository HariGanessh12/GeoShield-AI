# 🛡️ GeoShield-AI - Complete Project Analysis

This document provides a comprehensive and structured deep dive into the **GeoShield-AI** project. It breaks down the architecture, codebase, features, execution patterns, and provides critical insights into scalability and improvements. 

---

## 1. 📌 Project Overview
- **What is the purpose of this project?**
  GeoShield-AI is an automated, AI-powered Parametric Insurance Platform designed to protect individuals from external income-disrupting events without requiring manual claim filing.
- **What problem does it solve?**
  Gig workers frequently lose income due to factors completely out of their control (e.g., severe weather, platform outages, curfews). Traditional insurance involves tedious claim forms, manual verification, and high rejection rates. GeoShield-AI acts as an invisible safety net, automatically triggering payouts when external APIs detect high severity disruptions.
- **Who are the target users?**
  Gig delivery workers in India (e.g., Food Delivery, Grocery Q-Commerce, E-commerce delivery associates).

---

## 2. 🏗️ Architecture
The project follows a **decoupled monolithic architecture** transitioning towards a microservices mindset. 
- **Frontend (Presentation Tier):** A Next.js (React) application displaying the worker dashboards and admin command centers. It utilizes Tailwind CSS for styling and Framer Motion for animations.
- **Backend (Orchestration & Business Logic):** A Node.js API Gateway built with Express that handles route orchestration, business rules, and database interactions.
- **AI Engine (Analytics & Fraud):** Independent Python scripts handling complex mathematical modeling (Isolation Forests, Graph theory). Currently invoked directly by the Node backend.
- **Database (Persistence Tier):** MongoDB Atlas used for document-oriented flexible schema storage.

**High-Level Data Flow:**
1. A disruption occurs (or is triggered manually for testing).
2. The **Frontend** calls the `POST /api/claim/auto-trigger` endpoint.
3. The **Backend** assesses the user's profile and formats the claim data.
4. The **Backend** synchronously executes the **AI Engine** Python scripts.
5. The **AI Engine** responds with anomaly scores and bounding triggers.
6. The **Backend** applies a "Fairness Layer" to adjust trust scores and decides to Approve, Verify, or Reject.
7. The decision is saved to **MongoDB** and the response is sent back to the **Frontend**.

---

## 3. 📁 Folder Structure
- **`/frontend`**: The Next.js frontend application.
  - `src/app/`: The Next.js App Router containing pages and layouts (e.g., `/dashboard`, `/admin`).
  - `package.json`: Contains React, Next, Framer-Motion, and Tailwind configurations.
- **`/backend`**: The Node.js Express server.
  - `api/`: Express router controllers (`auth.js`, `claim.js`, `policy.js`, `risk.js`).
  - `models/`: Mongoose Object Data Models (`user.js`, `claim.js`, `policy.js`).
  - `services/`: Business logic operations (`trustScore.js`).
  - `index.js`: The central API Gateway entry point.
- **`/ai-engine`**: Python machine learning scripts.
  - `fraud_model.py`: Scikit-learn logic using Isolation Forests to detect anomalous behavior.
  - `graph_detection.py`: NetworkX logic identifying fraudulent worker rings based on shared IPs or device usage patterns.
  - `risk_model.py`: Dynamic pricing calculator based on traffic, weather, and location risk vectors.
- **`/database`**: Contains mock data (`seed_data.json`) for initializing the database.

---

## 4. ⚙️ Tech Stack
| Tier | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 / Next.js 16 | App router offers fast SSR, great SEO, and modular page layouts. |
| **Styling** | Tailwind CSS v4 | Utility-first CSS allows for the creation of immersive, glassy, responsive UI components rapidly. |
| **Animations** | Framer Motion | Provides elegant layout transitions and micro-animations for premium user experience. |
| **Backend API** | Node.js / Express | Fast, lightweight orchestration layer ideal for handling numerous concurrent HTTP requests. |
| **Database** | MongoDB / Mongoose | Document DB flexibility fits perfectly for dynamic claim and policy objects. |
| **AI Models** | Python, Scikit-Learn, NetworkX | Industry standards for machine learning, anomaly detection, and graph computation. |

---

## 5. 🔄 Execution Flow (Auto-Trigger Claim Example)
1. **Frontend Interaction:** User views dashboard. A "simulation" or actual webhook triggers a disruption event.
2. **API Endpoint Hit:** `POST /api/claim/auto-trigger` receives `workerId` and `disruptionFactor`.
3. **Data Assembly:** The Express route (`claim.js`) queries the `User` model to fetch reputation scores and geographical zones, normalizing severity levels.
4. **AI Processing:** The backend calls `trustScoreService.evaluateClaim(...)`. This service serializes the input and uses `child_process.execSync` to spin up `python fraud_model.py "escaped_json"`.
5. **AI Evaluation:** Python uses an `IsolationForest` to analyze the worker's payout history and compares it to the current claim amount, returning a JSON report marking it anomalous or standard.
6. **Rule Engine Application:** The `trustScore.js` service starts with a base score of 100. It minuses points for anomalies or GPS mismatches and adds points for "Reputation". 
7. **Fairness Adjustments:** If a score falls into a marginal failure state but the user is tenured, a "Grace Buffer" clamps the score to 50 instead of failing completely.
8. **Finalizing:** The final score determines the status (`APPROVED` >80, `VERIFY` >50, `REJECTED` <50).
9. **Persistence & Response:** The backend saves the claim into MongoDB and answers the UI.

---

## 6. 🔑 Core Features
- **Dynamic Risk Pricing (`risk_model.py`)**: Automatically fluctuates the weekly premium of the worker insurance based on realtime geographic risks (e.g., heatwave presence, bad traffic zones).
- **Behavioral Fraud Detection (`fraud_model.py`)**: Trains an Isolation Forest array on the user's past claim histories natively at runtime to flag unusually high or sudden spikes in claim activity.
- **Coordinated Ring Attack Defense (`graph_detection.py`)**: Uses NetworkX clustering to flag groups of workers attempting to spam claims from identical IP addresses or physical nodes to break the market.
- **Trust Scoring Pipeline (`trustScore.js`)**: An explainable AI system that transparently tells the admin *why* a decision was made (e.g., "+10 Trust Bonus applied").
- **Grace Buffer Fairness Layer**: Highly tenured users are granted "buffers" protecting them from getting their claims erroneously blocked by hard-rules during anomalies.

---

## 7. 🧠 Key Logic Breakdown: Trust Scoring
The central decision logic occurs within `trustScore.js`. It's a deterministic penalty-bonus system built on top of AI predictions.
1. **Initialize**: `Score = 100`.
2. **AI Penalty**: If `fraud_model.py` tags `is_anomaly == true`, subtract 35 points.
3. **Rule Penalty**: If a location mismatch (IP differing from GPS) occurs, subtract 35 points.
4. **Reputation Bonus**: If `userProfile.reputation > 80`, add 10 points. 
5. **Grace Clamp**: If the resulting score sits awkwardly between 40 and 49, BUT the user is highly reputable, the system overrides their score to `50` (moving them from `REJECTED` to `VERIFY`), allowing a human admin to review it.
6. **Decision**: 
   - `>= 80`: Automatic Instant Payout.
   - `>= 50`: Placed into an Admin queue for manual appeal.
   - `< 50`: Rejected.

---

## 8. 🗄️ Database / Data Handling
The application uses Mongoose Object Data Modeling to interface with MongoDB.
- **`User` Schema**: Stores authentication (`email`, `password`), metadata (`persona`, `zone`), and critical metrics (`reputationScore`, `role`).
- **`Claim` Schema**: Central tracker for all payouts. Stores the exact `trigger` (e.g., HEATWAVE), the `trustScore` calculated, the `status` string, the final `payout` value, and crucially, an array of `reasons` for explainability.
- **`Policy` Schema**: Tracks the active insurance subscription per worker, noting `premiumPaid`, date windows, and `coverageAmount`.

---

## 9. 🔌 APIs / Integrations
**API Gateway layer** maps paths linearly to controller files:
- **`GET /health`**: Status check.
- **`use /api/auth`**: Authentication flow (login, register). 
- **`use /api/claim`**: 
  - `POST /auto-trigger`: Orchestrates the machine learning models and generates a claim.
  - `GET /history`: Retrieves recent claims.
- **`use /api/risk`**: Integrates with `risk_model.py` to get current premium estimations.
- **`use /api/policy`**: CRUD operations on policies.

**Internal Integrations**: The backend integrates with the OS explicitly using `child_process.execSync` to pass payload shells directly to Python.

---

## 10. 🚨 Issues / Improvements
> [!WARNING]
> **Blocking Event Loop**: The backend relies heavily on `execSync` to execute Python scripts. Node.js is single-threaded; `execSync` completely blocks the Node process while Python runs. Under heavy load (e.g., a massive storm triggers 10,000 workers simultaneously), the API will become entirely unresponsive.
- **Solution**: Decouple the AI engine into its own microservice (e.g., FastAPI) and communicate via HTTP requests asynchronously.

> [!WARNING]
> **Hardcoded IDs**: `api/claim.js` contains hardcoded safety logic `if (workerId !== 'u101')` mapping fallback data.
- **Solution**: Clean up mock data logic and rely strictly on proper DB seeding and JWT decoding.

> [!TIP]
> **Inefficient ML Training**: `fraud_model.py` trains an `IsolationForest` on the fly for *every single request*. 
- **Solution**: Pre-train models periodically and serialize them (e.g., `.joblib` or `.pkl`), predicting on the live API without retraining.

---

## 11. 🔐 Security Considerations
> [!CAUTION]
> **Command Injection Vulnerability**: In `trustScore.js`, the JSON payload is escaped using `.replace(/"/g, '\\"')` and interpolated directly into a CLI command string: ``execSync(`python ... "${escapedInput}"`)``. If `workerId` or `disruptionFactor` contains maliciously crafted payload bypassing simple quotes, it could lead to severe OS-level command injection.
- **Prevention**: Never interpolate json into shell arguments. Pass data via `stdin` piping or use HTTP APIs instead of `execSync`.

- **JWT / Auth Routes**: Needs validation to ensure `/api/claim` cannot be spammed. Rate limiting (`express-rate-limit`) and helmet are necessary defenses.

---

## 12. ▶️ How to Run the Project
**Prerequisites**: Node.js and Python installed.
1. **Environment Setup**: In `/backend`, create an `.env` file containing `MONGO_URI=your_atlas_string` and `PORT=8000`.
2. **Backend**:
   ```bash
   cd backend
   npm install
   node index.js
   ```
   *Note: Ensure Python is available in your PATH.*
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Dashboard will be available at `http://localhost:3000`.*

---

## 13. 🧪 Testing
Currently, the monolithic structure lacks formal testing integrations.
- **Testing Strategy**:
  1. **Unit Tests (Jest)**: Test `trustScore.js` logic completely independent of the Python execution by mocking `execSync` responses. 
  2. **Python Unit Tests (PyTest)**: Supply `fraud_model.py` hard-coded arrays to ensure anomalies are correctly scored.
  3. **E2E Integration**: Fire sample requests to `POST /api/claim/auto-trigger` and verify it writes accurately to a volatile test MongoDB database.

---

## 14. 📈 Scalability
Can this project scale to 100,000 workers? **No, not currently.**
To make this production-ready:
1. **Containerization**: Both the Node app and the (refactored) Python FastAPI app must be Dockerized.
2. **Message Queuing**: Instead of `POST /auto-trigger` hanging the client while the model runs, it should dump the disruption event into a Queue (RabbitMQ / Kafka). A background worker will crunch the ML score and update the claim to `APPROVED`, sending a WebSocket/Push Notification event to the Frontend.
3. **Database Indexing**: Add Geo-indexes to `User` zones to rapidly search and group cohorts of workers during weather events.

---

## 15. 🧾 Summary (For Beginners)
Imagine you are a food delivery driver. When a sudden monsoon flood hits, your earnings drop to 0. Usually, to get insurance money, you have to prove it rained, take photos, fill out a massive form, and wait weeks for a human to answer.
**GeoShield-AI** is a robot that watches the weather. When it detects the flood, it instantly checks your file. The robot uses math to ensure you aren't trying to trick it (Fraud Detection). It notices you have a 5-star rating (Trust Score Setup). Without you clicking a single button, the robot decides "Yes, this is real," withdraws money from your policy pool, and drops it into your bank account instantly. It connects a shiny web application, a data router, and heavy machine-learning brains into one automatic payout system.
