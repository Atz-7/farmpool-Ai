from itertools import permutations
from app.engines import routing
from app.engines.geo import road_km
from conftest import login

DEST = (22.5726, 88.3639)
S = [routing.Stop(1, 22.81, 88.228, 250), routing.Stop(2, 22.98, 88.05, 300), routing.Stop(3, 22.928, 88.378, 250),
     routing.Stop(4, 23.008, 88.44, 200), routing.Stop(5, 22.87, 88.09, 100)]
FLEET = [dict(id=1, name="1500", capacity_kg=1500, cost_per_km=22, base_cost=400)]

def test_matches_brute_force_optimum():
    best = min(sum(road_km(a, b) for a, b in zip(o, o[1:] + (DEST,))) for o in permutations([(s.lat, s.lng) for s in S]))
    r = routing.optimise(S, DEST, FLEET)
    assert r.feasible and abs(r.total_km - best) < 0.2 and sorted(r.routes[0].stop_ids) == [1, 2, 3, 4, 5]
    assert "estimate" in r.distance_source

def test_capacity_forces_split_across_fleet():
    fleet = [dict(id=1, name="a", capacity_kg=700, cost_per_km=14, base_cost=200), dict(id=2, name="b", capacity_kg=700, cost_per_km=14, base_cost=200)]
    r = routing.optimise(S, DEST, fleet)  # 1100 kg total > 700 per vehicle
    assert r.feasible and len(r.routes) == 2 and all(x.load_kg <= 700 for x in r.routes)
    assert sum(x.load_kg for x in r.routes) == 1100

def test_infeasible_capacity_explained():
    r = routing.optimise(S, DEST, [dict(id=1, name="s", capacity_kg=500, cost_per_km=14, base_cost=200)])
    assert not r.feasible and "capacities" in r.reason

def test_osrm_failure_falls_back(monkeypatch):
    monkeypatch.setattr(routing, "_osrm_matrix", lambda pts, url: None)
    r = routing.optimise(S, DEST, FLEET, osrm_url="http://unreachable")
    assert r.feasible and "estimate" in r.distance_source

def test_pool_route_endpoint(client):
    c = client
    b = login(c, "9000000100", "buyer123")
    p = c.post("/api/requirements/1/propose-pool", headers=b).json()
    assert p["feasible"] and p["route_km"] <= p["quick_estimate_km"] + 0.1  # optimiser never worse than the quick tour
    rt = c.get(f"/api/pools/{p['pool_id']}/route", headers=b).json()
    assert [s["seq"] for s in rt["stops"]] == [1, 2, 3, 4] and rt["destination"]["lat"] and "estimate" in rt["distance_source"]
    assert abs(sum(s["leg_km_to_next"] for s in rt["stops"]) - rt["distance_km"]) < 0.5
    assert c.get(f"/api/pools/{p['pool_id']}/route", headers=login(c, "9999999999", "admin123")).status_code == 200
    print(p["quick_estimate_km"], "->", p["route_km"], p["vehicle"], p["transport_cost"])

def test_route_hidden_from_farmers_outside_pool(client):
    c = client
    p = c.post("/api/requirements/1/propose-pool", headers=login(c, "9000000100", "buyer123")).json()
    assert c.get(f"/api/pools/{p['pool_id']}/route", headers=login(c, "9000000003", "farmer123")).status_code == 403  # Anita excluded
    assert c.get(f"/api/pools/{p['pool_id']}/route", headers=login(c, "9000000001", "farmer123")).status_code == 200
