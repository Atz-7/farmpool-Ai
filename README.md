# FarmPool AI
Demand-first farmer pooling: buyer requirement -> compatible farmer pool -> optimised shared shipment -> per-farmer net earnings.
All data is synthetic DEMO data. No live mandi/e-NAM/payment integration.

## Run
```
# 1) backend (SQLite by default; or `docker compose up -d` + DATABASE_URL in backend/.env for PostGIS)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload     # :8000, docs at /docs
# 2) frontend
cd frontend && cp .env.local.example .env.local && npm install && npm run dev       # :3000
# tests
cd backend && pytest -q
```
Demo logins: farmer 9000000001/farmer123 (…02–05 too), buyer 9000000100/buyer123, admin 9999999999/admin123.
Optional: set OSRM_URL in backend/.env for live road distances (otherwise labelled estimates).
Frontend geometry test: `cd frontend && npm run test:scene`. The pool page has a Map and a 3D pickup-run view (schematic).

See DEMO_SCRIPT.md for the 5-minute walkthrough. Seeded demo: requirement #1 (1,000 kg, ₹24–28/kg) is feasible; #2 (2,500 kg) demonstrates the insufficient-quantity explanation.
