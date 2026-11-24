from datetime import date, timedelta
from conftest import login
from app.engines.economics import net_earnings, compare

def test_net_formula():
    b = net_earnings("x", 100, 20, transport=300, commission_pct=5, handling_per_kg=1, other=10)
    assert b.net == 2000 - 300 - 100 - 100 - 10

def test_compare_labels_estimates():
    c = compare(250, (22.8, 88.2), [dict(market="M", price_per_kg=22, lat=22.57, lng=88.36, commission_pct=4)],
                [dict(id=1, name="v", capacity_kg=500, cost_per_km=14, base_cost=200)], 18, 26, 900, 1000)
    assert "not guaranteed" in c["explanation"][-1] and "difference" in c

def _propose(c, buyer):
    p = c.post("/api/requirements/1/propose-pool", headers=buyer).json()
    assert p["feasible"], p
    return p

def test_full_workflow(client):
    c = client
    buyer, admin = login(c, "9000000100", "buyer123"), login(c, "9999999999", "admin123")
    farmers = {i: login(c, f"900000000{i}", "farmer123") for i in range(1, 6)}
    p = _propose(c, buyer); pid = p["pool_id"]
    names = {m["farmer_name"] for m in p["members"]}
    assert "Anita Mondal (demo)" not in names and len(names) == 4
    assert c.post("/api/requirements/1/confirm", headers=buyer).status_code == 409  # nobody accepted yet
    assert c.post(f"/api/pools/{pid}/respond", json={"accept": True}, headers=farmers[3]).status_code == 403  # Anita not in pool
    for i in (1, 2, 4, 5):
        r = c.post(f"/api/pools/{pid}/respond", json={"accept": True}, headers=farmers[i])
        assert r.status_code == 200
    assert r.json()["requirement_status"] == "Awaiting Confirmation"
    prof = c.get(f"/api/pools/{pid}/profit", headers=buyer).json()
    assert len(prof["farmers"]) == 4 and all(f["explanation"] for f in prof["farmers"])
    assert c.post("/api/requirements/1/confirm", headers=farmers[1]).status_code == 403
    assert c.post("/api/requirements/1/confirm", headers=buyer).status_code == 200
    sid = c.get("/api/orders", headers=buyer).json()[0]["shipment_id"]
    assert c.post(f"/api/shipments/{sid}/advance", headers=buyer).status_code == 403
    assert c.post(f"/api/shipments/{sid}/advance", headers=admin).json()["status"] == "In Transit"
    assert c.post(f"/api/shipments/{sid}/advance", headers=admin).json()["status"] == "Delivered"
    assert c.post(f"/api/shipments/{sid}/advance", headers=admin).status_code == 409

def test_decline_triggers_rematch_without_decliner(client):
    c = client
    buyer = login(c, "9000000100", "buyer123")
    p = _propose(c, buyer); pid = p["pool_id"]
    r = c.post(f"/api/pools/{pid}/respond", json={"accept": False}, headers=login(c, "9000000001", "farmer123")).json()
    assert r["pool_status"] == "Declined" and r["requirement_status"] == "Matching"
    again = c.post("/api/requirements/1/propose-pool", headers=buyer).json()
    # Ramesh declined, Anita not ready by pickup: remaining supply is short -> clear explanation, not a silent failure
    assert not again["feasible"] or "Ramesh Das (demo)" not in {m["farmer_name"] for m in again["members"]}
    if not again["feasible"]: assert again["reasons"]

def test_edge_insufficient_after_commit(client):
    from app.db import SessionLocal
    from app.models import BuyerRequirement, HarvestListing
    c = client
    with SessionLocal() as db:
        for l in db.query(HarvestListing): l.committed = True
        db.commit()
    buyer = login(c, "9000000100", "buyer123")
    e = c.post("/api/requirements/1/propose-pool", headers=buyer).json()
    assert not e["feasible"] and e["reasons"]

def test_mandi_compare_ranks_by_net(client):
    c = client
    f = login(c, "9000000001", "farmer123")
    d = c.get("/api/mandi/compare/1", headers=f).json()
    nets = [o["net"] for o in d["options"]]
    assert nets == sorted(nets, reverse=True) and d["recommended"] == d["options"][0]["label"]
    assert c.get("/api/mandi/compare/2", headers=f).status_code == 403  # someone else's listing

def test_ui_support_endpoints(client):
    from datetime import date, timedelta
    c = client
    b, a, f = login(c, "9000000100", "buyer123"), login(c, "9999999999", "admin123"), login(c, "9000000001", "farmer123")
    body = dict(crop="Tomato", quantity_kg=300, min_quality="B", price_min=20, price_max=25, dest_name="Hub", dest_lat=22.5, dest_lng=88.3,
                deadline=str(date.today() + timedelta(days=3)))
    assert c.post("/api/requirements", json=body, headers=b).status_code == 200
    assert c.post("/api/requirements", json={**body, "price_max": 5}, headers=b).status_code == 422
    assert c.post("/api/requirements", json={**body, "deadline": "2020-01-01"}, headers=b).status_code == 422
    assert c.post("/api/requirements", json=body, headers=f).status_code == 403
    assert len(c.get("/api/requirements", headers=b).json()) == 3
    pid = c.post("/api/requirements/1/propose-pool", headers=b).json()["pool_id"]
    assert c.get("/api/pools", headers=f).json()[0]["my_kg"] == 250
    assert c.get("/api/pools", headers=login(c, "9000000003", "farmer123")).json() == []
    assert len(c.get(f"/api/pools/{pid}", headers=a).json()["members"]) == 4
    assert c.get(f"/api/pools/{pid}", headers=login(c, "9000000003", "farmer123")).status_code == 403
    s = c.get("/api/admin/summary", headers=a).json()
    assert len(s["farmers"]) == 5 and s["active_pools"] == 1 and c.get("/api/admin/summary", headers=b).status_code == 403

def test_seeded_edge_case_explains_itself(client):
    c = client
    e = c.post("/api/requirements/2/propose-pool", headers=login(c, "9000000100", "buyer123")).json()
    assert not e["feasible"] and "Insufficient quantity" in e["reasons"][0] and "shortfall" in e["reasons"][0]
    print(e["reasons"][0])

def test_seeded_demo_pooling_beats_selling_alone_at_buyer_minimum(client):
    c = client
    b = login(c, "9000000100", "buyer123")
    pid = c.post("/api/requirements/1/propose-pool", headers=b).json()["pool_id"]
    rows = c.get(f"/api/pools/{pid}/profit", headers=b).json()["farmers"]
    for r in rows: print(r["farmer"], round(r["individual_best"]["net"]), round(r["pooled"]["net"]), r["difference"])
    assert rows and all(r["difference"] > 0 for r in rows)
