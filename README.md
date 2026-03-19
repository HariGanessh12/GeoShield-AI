# 🛡️ GeoShield-AI

**GeoShield-AI** is an AI-powered Parametric Insurance Platform built natively for Gig Delivery Workers in India. It automatically protects workers against income loss from external disruptions—without them ever filling out a claim form.

## 🚀 The Mission
Gig workers lose billions entirely outside their control:
- 🌡️ **Extreme Heatwaves** & 🌧️ **Heavy Rain**
- 🌫️ **Severe Pollution (AQI)** & 🚫 **Curfews/Lockdowns**
- 📉 **Platform Outages**

Geoshield-AI acts as an invisible safety net. If a disruption threshold is crossed via external APIs, parametric smart-contracts trigger automatic payouts using **Trust Scores** and **Fraud-defensive AI**.

---

## 🧠 Core Systems (The "Game Changers")

### 1. Explainable AI & Trust Scoring
Judges don't just want a black box. Our AI provides precise **decision logic** for every claim:
- Approves, Flags, or Rejects instantly using a dynamic **Trust Score (0-100)**.
- Returns explicit `reasons` for transparency (e.g., *"GPS-IP Mismatch Detected"*, *"+10 Bonus: Excellent Reputation"*).

### 2. The Fairness Layer
We don't punish genuine workers for system-wide flags:
- **Reputation Score**: Tenured users gain a Trust Bonus.
- **Grace Buffer**: Marginal scores for high-reputation workers get a buffer, allowing 1-2 anomalies before hard-blocking.
- **Appeals**: `VERIFY` (Flagged) claims drop cleanly into an admin queue for human review.

### 3. System Resilience (Market Crash Defense)
To prevent devastating coordinated attacks (e.g., 500 fake claims from a single IP during a rainstorm), we employ multiple defense vectors:
- **NetworkX Graph Clustering**: Re-engineers IP/Device linkages to isolate and detect coordinated fraud rings.
- **Isolation Forests**: Behavioral anomaly detection to catch uncharacteristic earning variations natively.

### 4. Transparent Weekly Pricing
Pricing shouldn't feel like a penalty. The UI breaks down exactly how the ₹72.50 weekly premium is dynamically structured natively via `risk_model.py`:
- **Base Factor:** ₹50
- **Heatwave/Weather Risk Delta:** +₹12
- **High-Risk Location Delta:** +₹10.50

---

## 🛠 Tech Stack
- **Frontend**: Next.js, Tailwind CSS (Glassy, fully responsive UI)
- **Backend API**: Node.js, Express (REST Orchestration)
- **AI Engine**: Python (Scikit-Learn, NetworkX)
- **Workflow Orchestration**: Declarative JSON Routing

## 🏃 Getting Started

```bash
# 1. Run the APIs
cd backend
npm install && node index.js

# 2. Start the Frontend Dashboards
cd frontend
npm run dev
```

*(Worker UI: `localhost:3000` | Admin Command Center: `localhost:3000/admin`)*
