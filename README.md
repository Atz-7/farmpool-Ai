# FarmPool AI

**Turning individual harvests into collective market power.**

An AI-assisted, demand-first agricultural procurement and logistics platform built by **Team Shuriken**.

> Farmers don't necessarily earn less because they grow less. They often earn less because they sell alone.

FarmPool AI starts from what a **buyer needs**, not from a farmer's listing. It finds the farmers who can actually fulfil the order on time, groups them into a pool, plans one shared shipment, and shows every farmer their own **net earnings** before they confirm.

> ⚠️ **Demo project.** All farmers, buyers, mandi prices and payouts are **synthetic demo data**. There is no live e-NAM, government or payment integration. Earnings are estimates only.

**🔗 Live prototype: https://farmpool-ai.vercel.app/
*(Backend runs on a free tier. The first load may take about 50 seconds to wake up.)*

**🔗 PPT Link: https://drive.google.com/file/d/13_2mNQxGYCBoB_6byLlYY04VOU2XQAwO/view?usp=sharing

**🔗 Video Link: https://drive.google.com/file/d/1cyn23wRaS6oOThJaFmRacQiO8Mc8gc9f/view?usp=sharing

**🔗 Medium Post: https://medium.com/@shagunshaw2006/farmpool-ai-turning-individual-harvests-into-collective-market-power-6857e7d3f89c
---

## The problem

- Small lots weaken bargaining power and limit access to bulk buyers.
- Every farmer moving produce separately makes transport expensive.
- Prices and buyer offers are hard to compare in time.
- Perishable harvest loses value while farmers search for a buyer.

Platforms such as e-NAM and Agribazaar already exist. FarmPool AI does not replace them. It coordinates the steps between them: **one workflow from buyer demand to individual net earnings**.

## How it works

```
Buyer requirement → Match → Check → Pool → Route → Net earnings → Confirmation → Delivery
```

1. **Match:** filter listings by crop and minimum quality.
2. **Check:** quantity, harvest date, harvest window and delivery deadline.
3. **Pool:** select and score farmers until the order is filled.
4. **Route:** choose a vehicle and pickup order (Google OR-Tools).
5. **Earnings:** show each farmer net earnings for selling alone versus pooled.
6. **Confirm:** farmers accept or decline their share, the buyer confirms, and the shipment moves through its status workflow.

If an order can't be fulfilled, the engine **explains why** (for example, "insufficient quantity: 1200 kg available vs 2500 required") instead of just failing. A farmer whose harvest isn't ready before the deadline is excluded, and the reason is shown.

## Features

| Area | What it does |
|---|---|
| **Roles** | Farmer, buyer and admin accounts with registration and JWT login |
| **Demand-first pooling engine** | Pickup-date search, crop/quality/harvest-window filtering, weighted farmer scoring (quantity, distance, timing, quality, profit), capacity and deadline checks |
| **Harvest Window Intelligence** | Per-crop hold-time and transit-time rules (tomato, potato, onion, spinach) |
| **Logistics optimiser** | Vehicle selection and pickup sequencing with OR-Tools; shared transport cost split per farmer |
| **MandiMind + profit simulator** | Compares **net realisation**, not just quoted price. Revenue minus transport, commission, handling and other costs, individual versus pooled |
| **AI-assisted listing entry** | Gemini turns a typed or spoken listing (English, Hindi, Bengali) into form fields. The farmer confirms, and code re-validates every field |
| **Pool page** | "Why these farmers" reasons, route map (Leaflet) and a schematic 3D pickup run (Three.js) |
| **Order workflow** | Open → Matching → Pool Proposed → Awaiting Confirmation → Confirmed → In Transit → Delivered |
| **Admin dashboard** | Listings, orders and summary view |

### Example: highest price isn't always highest profit

*Illustrative demo data, 500 kg.*

| Mandi | Quoted price | Costs | Net |
|---|---|---|---|
| A | ₹25/kg | ₹2,000 transport + ₹500 other | ₹10,000 |
| B | ₹23/kg | ₹500 transport + ₹300 other | **₹10,700** |

## Where AI is (and isn't) used

- **Gemini** is used only to turn free text or speech into candidate listing fields. It never saves anything and never touches prices, matching or routing.
- **Not AI:** pricing, matching, harvest windows, routing and cost splitting are all deterministic, rule-based code covered by unit tests.

## Implemented vs. planned

| Implemented | Simulated / planned |
|---|---|
| Farmer, buyer and admin web interfaces (Next.js) | Feature-phone / IVR with missed-call callback |
| FastAPI backend and REST API | Village-coordinator workflow |
| Pooling, harvest-window, routing and economics engines | Offline-first mode with sync |
| Profit simulator and order workflow | SMS notifications and payments |
| Map and 3D pickup-run view | Live mandi / e-NAM price feeds |
| Gemini-assisted listing entry | Farmer location map-picker |

The IVR, missed-call callback and offline channels are part of the product vision. They are **not** built unless telecom integration is added.

## Tech stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Recharts, Leaflet / react-leaflet, Three.js (react-three-fiber)
- **Backend:** Python, FastAPI, SQLAlchemy, Pydantic, JWT auth
- **Optimisation:** Google OR-Tools
- **Database:** SQLite by default, or PostgreSQL + PostGIS via Docker
- **AI:** Gemini API (optional)
- **Routing data:** straight-line × 1.3 estimate by default, or live road distances via OSRM (OpenStreetMap)

## Project structure

```
farmpool/
├── backend/
│   ├── app/
│   │   ├── main.py            # app, auth, listings
│   │   ├── workflow.py        # requirements, pools, orders, profit, route
│   │   ├── ai.py              # Gemini-assisted listing parser
│   │   ├── seed.py            # demo data
│   │   ├── models.py / schemas.py / auth.py / db.py / config.py
│   │   └── engines/
│   │       ├── pooling.py         # demand-first pooling engine
│   │       ├── harvest_window.py  # harvest window intelligence
│   │       ├── routing.py         # OR-Tools routing
│   │       ├── economics.py       # MandiMind + profit simulator
│   │       └── geo.py             # distance estimates / OSRM
│   └── tests/
├── frontend/
│   ├── app/                   # pages: login, register, farmer, buyer, admin, orders, pool/[id]
│   ├── components/            # Nav, RouteMap, Pool3D, ProfitChart, Stepper, ui
│   └── lib/                   # API client, hooks, 3D scene helpers
├── db/init.sql                # enables PostGIS (Docker)
├── docker-compose.yml         # optional PostGIS database
└── DEMO_SCRIPT.md             # 5-minute demo walkthrough
```

## Getting started

**Requirements:** Python 3.10+ and Node.js 18+.

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs. On first start the backend creates the SQLite database (`farmpool.db`) and seeds the demo data.

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000** (use `localhost`, not `127.0.0.1`, because CORS only allows `localhost:3000`).

### Demo logins

| Role | Phone | Password |
|---|---|---|
| Farmer | `9000000001` (also `…02` to `…05`) | `farmer123` |
| Buyer | `9000000100` | `buyer123` |
| Admin | `9999999999` | `admin123` |

New users can register from the app. Their data is saved in `backend/farmpool.db`. Delete that file to reset to the seed data.

### Seeded demo story

Five tomato farmers around Hooghly, West Bengal. A buyer needs **1,000 kg of grade B+ tomatoes at ₹24–28/kg within 2 days**.

- **Requirement #1 (1,000 kg)** is feasible. The engine builds a pool, excludes the farmer whose harvest isn't ready in time, and shows the route and per-farmer earnings.
- **Requirement #2 (2,500 kg)** shows the insufficient-quantity explanation.

See [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) for the full 5-minute walkthrough.

## Configuration

Copy `backend/.env.example` to `backend/.env` only if you want to change a default.

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Database connection | `sqlite:///./farmpool.db` |
| `JWT_SECRET` | Token signing key. **Change it outside demos** | `dev-secret-change-me` |
| `GEMINI_API_KEY` | Enables Gemini listing parsing (server-side only). Without it, a simple typed fallback parser is used | empty |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `OSRM_URL` | Live road distances, e.g. `https://router.project-osrm.org` | empty (estimates) |

The `.env.example` file is set up for Postgres. If you copy it without a running Postgres database, the backend won't start.

### Optional: PostgreSQL + PostGIS

```bash
docker compose up -d
cp backend/.env.example backend/.env
```

## Testing

```bash
cd backend && pytest -q                 # backend: engines, routing, workflow, API, AI parser
cd frontend && npm run test:scene       # frontend 3D scene geometry
```

## API overview

Interactive docs are at `/docs`. Main endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account, log in |
| GET/POST | `/api/listings` | Harvest listings |
| POST/GET | `/api/requirements` | Buyer requirements |
| POST | `/api/requirements/{id}/propose-pool` | Run the pooling engine |
| GET | `/api/pools/{id}`, `/api/pools/{id}/route`, `/api/pools/{id}/profit` | Pool details, route, earnings |
| POST | `/api/pools/{id}/respond` | Farmer accepts or declines |
| POST | `/api/requirements/{id}/confirm` | Buyer confirms |
| POST | `/api/shipments/{id}/advance` | Move shipment status forward |
| GET | `/api/mandi/compare/{listing_id}` | MandiMind comparison |
| POST | `/api/ai/parse-listing` | Gemini-assisted listing parse |
| GET | `/api/admin/summary` | Admin dashboard data |

## Known limitations

- All prices, farmers and buyers are synthetic.
- Pooling is not always better. The advantage depends on the buyer's price versus the mandi price and on how much transport is shared. The app shows when pooling loses and says so.
- Distances are straight-line × 1.3 estimates unless `OSRM_URL` is set. The 3D view is schematic.
- One shared vehicle per pool. Transport cost is split by kg, not by detour.
- Harvest-window values (hold days, transit hours) and fee rates are configurable assumptions, not guaranteed shelf life or real rates.

## Team

**Team Shuriken**

## Disclaimer

FarmPool AI is a hackathon/demo prototype. It is not financial advice, and it makes no real-world price, savings or earnings guarantee.
