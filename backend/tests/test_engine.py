from datetime import date, timedelta
from app.engines.pooling import *
T = date(2026, 11, 24)
D = (22.5726, 88.3639)
V = [VehicleSpec(1, "500", 500, 14, 200), VehicleSpec(2, "1500", 1500, 22, 400)]
def L(i, kg, off, q="A", lat=22.9, lng=88.2): return Listing(i, f"F{i}", "v", lat, lng, "tomato", kg, q, T + timedelta(days=off))
def R(kg=1000, dl=2, q="B"): return Requirement("tomato", kg, q, *D, T + timedelta(days=dl))
FIVE = [L(1, 250, 1), L(2, 300, 1), L(3, 200, 2, "B"), L(4, 250, 1), L(5, 200, 1)]

def test_feasible_demo():
    r = build_pool(R(), FIVE, V, T)
    assert r.feasible and r.total_kg == 1000 and r.vehicle.capacity_kg >= 1000
    assert all(m.reason for m in r.members)

def test_insufficient_quantity():
    r = build_pool(R(2000), FIVE, V + [VehicleSpec(3, "big", 3000, 30, 500)], T)
    assert not r.feasible and "Insufficient" in r.reasons[0]

def test_capacity_exceeded():
    r = build_pool(R(1000), FIVE, [V[0]], T)
    assert not r.feasible and "capacity" in r.reasons[0]

def test_incompatible_harvest_date():
    late = [L(1, 600, 5), L(2, 600, 5)]
    r = build_pool(R(1000, dl=2), late, V, T)
    assert not r.feasible

def test_stale_harvest_not_mixed():
    mixed = [L(1, 500, 1), L(2, 500, 6)]  # 5 days apart, tomato hold limit 2d
    r = build_pool(R(1000, dl=8), mixed, V, T)
    assert not r.feasible

def test_quality_filter():
    low = [L(1, 600, 1, "C"), L(2, 600, 1, "C")]
    assert not build_pool(R(1000, q="B"), low, V, T).feasible

def test_deadline_in_past():
    assert not build_pool(R(1000, dl=-1), FIVE, V, T).feasible
