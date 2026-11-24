# FarmPool AI: 5-minute demo script

**One-line pitch:** "Marketplaces start with a farmer's listing. FarmPool starts with what a buyer needs, then assembles the farmers who can actually fulfil it, on time, within vehicle capacity, and shows each farmer their own net earnings."

## Before you go on stage (10 min)
1. Fresh data: delete `backend/farmpool.db`, start backend (`uvicorn app.main:app`) and frontend (`npm run dev`).
2. Use Chrome (voice input, map tiles need internet). Open **two windows**: one buyer, one farmer, so you aren't logging in and out.
3. Click through the whole flow once (below) *before* the demo, then reset the DB again. We have not seen the UI in a browser during development; this rehearsal is the test.
4. Optional: set `GEMINI_API_KEY` in `backend/.env` and test one sentence. Without it, the typed fallback parser still works for simple English.

## Seeded story (all DEMO DATA)
5 tomato farmers around Hooghly; buyer needs **1,000 kg of grade B+ tomatoes, ₹24–28/kg, within 2 days**. Nearest Kolkata mandi demo price ₹22/kg.

## Walkthrough
| Min | Do | Say |
|---|---|---|
| 0:00 | Landing page | The problem in one line: small farmers sell small, alone, and pay for transport alone. |
| 0:30 | Admin login → listings table | Five farmers, 1,200 kg total, but nobody can fill a 1,000 kg order alone. |
| 1:00 | Buyer → requirement #1 → **Find farmer pool** | The engine tries each pickup date, filters crop/quality/harvest window, scores farmers, checks quantity, capacity and deadline. |
| 1:45 | Open the pool page | **Why these farmers:** four selected, each with a reason. **Anita is excluded**: her harvest isn't ready until day 2, so she can't join tomorrow's pickup. Not matched on crop name alone. |
| 2:15 | Route card: Map, then **3D pickup run** → Play | OR-Tools picks the pickup order and vehicle. Load counter fills stop by stop. 3D is schematic; the map is the distance reference. |
| 3:00 | Profit simulator | Per farmer: alone (best mandi, net of transport, commission, handling) vs pooled. Under demo assumptions pooled is roughly ₹520–945 better per farmer at the buyer's minimum price. Open one farmer and show where each rupee comes from. |
| 3:45 | Farmer window (`9000000001`) → **Join pool**; repeat for 02, 04, 05 if time (or say "all four accept") | Farmers see only their own share and estimate, and choose to accept or decline. A decline sends the order back to matching without that farmer. |
| 4:15 | Buyer → **Confirm order**; Admin → Orders → advance to In Transit, Delivered | Status workflow: Open → Matching → Pool Proposed → Awaiting Confirmation → Confirmed → In Transit → Delivered. |
| 4:45 | Buyer → requirement #2 (2,500 kg) → **Find farmer pool** | Edge case: "Insufficient quantity: 1200 kg available vs 2500 required (shortfall 1300 kg)". The system explains, not just fails. |

## Where AI is and isn't used (say this, judges ask)
- **Gemini:** only to turn a spoken/typed listing ("300 kg tomatoes grade A tomorrow") into form fields. The farmer confirms; code re-validates every field.
- **Not AI:** prices, matching, harvest windows, routing, cost split. All deterministic and unit-tested (30 backend tests).

## Honest limits (volunteer these before they're asked)
- All prices, farmers, buyers are **synthetic**. No e-NAM, government or payment integration; payouts are estimates only.
- Pooling is not always better: the advantage depends on the buyer's price vs. mandi price and on transport sharing. At a buyer minimum of ₹18/kg (below the ₹22 mandi) the app shows pooling *losing*, and says so. Try it live by creating a requirement at ₹18 if asked.
- Distances are straight-line × 1.3 estimates unless `OSRM_URL` is configured; the 3D view is schematic.
- One shared vehicle per pool in the workflow. Cost is split by kg, not by detour.
- Not built: farmer location map-picker, payments, SMS notifications, live mandi feeds.

## Likely judge questions
- *How do you stop one farmer dominating?* Each farmer contributes their quantity up to what's still needed; scoring balances quantity, distance, timing, quality, delivery cost.
- *What if a farmer drops out?* Decline → order returns to Matching → re-run excludes them.
- *How would this go live?* Swap demo prices for an authorised mandi feed, add OSRM for road distances, add payments and SMS. The architecture already separates these.
