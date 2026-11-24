"""Demand-First Dynamic Pooling Engine (deterministic, no LLM).

Given a buyer requirement, evaluates each candidate pickup date, filters listings by
crop/quality/harvest window, scores farmers, fills the order, checks vehicle capacity and
deadline, and returns either a feasible pool with per-farmer reasons or explicit
infeasibility reasons."""
from dataclasses import dataclass, field
from datetime import date, timedelta
from . import harvest_window as hw
from .geo import road_km

QUALITY_RANK = {"A": 3, "B": 2, "C": 1}
WEIGHTS = {"quantity": 0.25, "distance": 0.25, "timing": 0.2, "quality": 0.15, "profit": 0.15}
MAX_PICKUP_RADIUS_KM = 60

@dataclass
class Listing:
    id: int; farmer_name: str; village: str; lat: float; lng: float
    crop: str; quantity_kg: float; quality: str; harvest_date: date

@dataclass
class Requirement:
    crop: str; quantity_kg: float; min_quality: str
    dest_lat: float; dest_lng: float; deadline: date
    price_max: float = 0.0

@dataclass
class VehicleSpec:
    id: int; name: str; capacity_kg: float; cost_per_km: float; base_cost: float = 0

@dataclass
class Member:
    listing_id: int; farmer_name: str; village: str; kg: float; score: float; reason: str

@dataclass
class PoolResult:
    feasible: bool
    ship_date: date | None = None
    members: list[Member] = field(default_factory=list)
    total_kg: float = 0
    vehicle: VehicleSpec | None = None
    est_route_km: float = 0
    est_transport_cost: float = 0
    score: float = 0
    reasons: list[str] = field(default_factory=list)  # infeasibility or notes
    excluded: list[dict] = field(default_factory=list)
    route_order: list[int] = field(default_factory=list)  # listing ids in pickup order (estimate)

def _tour(points, dest):
    """Nearest-neighbour tour ending at destination (fast estimate; OR-Tools refines in logistics)."""
    if not points: return 0.0, []
    remaining, total, order = list(points), 0.0, []
    # start from the point farthest from the buyer for a realistic collection run
    cur = max(points, key=lambda p: road_km(p, dest)); remaining.remove(cur); order.append(points.index(cur))
    while remaining:
        nxt = min(remaining, key=lambda p: road_km(cur, p)); total += road_km(cur, nxt)
        cur = nxt; remaining.remove(nxt); order.append(points.index(nxt))
    return total + road_km(cur, dest), order

def _score(l: Listing, req: Requirement, ship: date, remaining: float, centroid, dest) -> tuple[float, dict]:
    d = road_km((l.lat, l.lng), centroid)
    parts = {
        "quantity": min(l.quantity_kg, remaining) / max(remaining, 1),
        "distance": max(0.0, 1 - d / MAX_PICKUP_RADIUS_KM),
        "timing": 1 - (ship - l.harvest_date).days / (hw.profile(l.crop).max_hold_days + 1),
        "quality": QUALITY_RANK[l.quality] / 3,
        "profit": max(0.0, 1 - road_km((l.lat, l.lng), dest) / 120),  # closer to buyer -> cheaper haul per kg
    }
    return sum(WEIGHTS[k] * v for k, v in parts.items()), parts

def build_pool(req: Requirement, listings: list[Listing], vehicles: list[VehicleSpec],
               today: date) -> PoolResult:
    dest = (req.dest_lat, req.dest_lng)
    excluded, notes = [], []
    base = []
    for l in listings:
        if l.crop.lower() != req.crop.lower():
            continue  # different crop: not even reported as excluded noise
        if QUALITY_RANK[l.quality] < QUALITY_RANK[req.min_quality]:
            excluded.append({"listing_id": l.id, "farmer": l.farmer_name,
                             "why": f"quality {l.quality} below required {req.min_quality}"}); continue
        base.append(l)
    if not base:
        return PoolResult(False, reasons=[f"No available {req.crop} listings meet quality {req.min_quality}+."], excluded=excluded)
    supply = sum(l.quantity_kg for l in base)
    if supply < req.quantity_kg:
        return PoolResult(False, excluded=excluded, reasons=[
            f"Insufficient quantity: {supply:.0f} kg of quality-eligible {req.crop} available vs {req.quantity_kg:.0f} kg required "
            f"(shortfall {req.quantity_kg - supply:.0f} kg)."])
    biggest = max(vehicles, key=lambda v: v.capacity_kg, default=None)
    if not biggest:
        return PoolResult(False, reasons=["No vehicles registered."], excluded=excluded)
    if req.quantity_kg > biggest.capacity_kg:
        return PoolResult(False, excluded=excluded, reasons=[
            f"Vehicle capacity exceeded: order is {req.quantity_kg:.0f} kg but the largest vehicle carries {biggest.capacity_kg:.0f} kg. "
            "Split the order or register a bigger/second vehicle."])

    best: PoolResult | None = None
    why_not: list[str] = []
    start = max(today, min(l.harvest_date for l in base))
    days = (req.deadline - start).days
    if days < 0:
        return PoolResult(False, excluded=excluded, reasons=[
            f"Deadline {req.deadline} is already past or earlier than the first harvest ({start})."])
    for off in range(days + 1):
        ship = start + timedelta(days=off)
        elig = []
        for l in base:
            ok, msg = hw.check_ship_date(l.crop, l.harvest_date, ship)
            if ok: elig.append(l)
            else: excluded.append({"listing_id": l.id, "farmer": l.farmer_name, "why": f"pickup {ship}: {msg}", "_ship": ship})
        # nearby only
        cx = sum(l.lat for l in elig) / len(elig) if elig else 0
        cy = sum(l.lng for l in elig) / len(elig) if elig else 0
        elig = [l for l in elig if road_km((l.lat, l.lng), (cx, cy)) <= MAX_PICKUP_RADIUS_KM]
        if sum(l.quantity_kg for l in elig) < req.quantity_kg:
            why_not.append(f"Pickup {ship}: only {sum(l.quantity_kg for l in elig):.0f} kg harvest-compatible (need {req.quantity_kg:.0f}).")
            continue
        centroid = (sum(l.lat for l in elig) / len(elig), sum(l.lng for l in elig) / len(elig))
        remaining, members, chosen = req.quantity_kg, [], []
        pool_elig = list(elig)
        while remaining > 1e-6 and pool_elig:
            scored = [(_score(l, req, ship, remaining, centroid, dest), l) for l in pool_elig]
            (sc, parts), l = max(scored, key=lambda x: x[0][0])
            take = min(l.quantity_kg, remaining)
            top = max(parts, key=parts.get)
            members.append(Member(l.id, l.farmer_name, l.village, take, round(sc, 3),
                f"Selected for {take:.0f} kg: strongest on {top}; harvest {l.harvest_date}, quality {l.quality}, "
                f"{road_km((l.lat, l.lng), dest):.0f} km from buyer."))
            chosen.append(l); pool_elig.remove(l); remaining -= take
        km, order = _tour([(l.lat, l.lng) for l in chosen], dest)
        if not hw.meets_deadline(ship, req.deadline, km):
            why_not.append(f"Pickup {ship}: route of ~{km:.0f} km cannot reach buyer by {req.deadline}."); continue
        fit = [v for v in vehicles if v.capacity_kg >= req.quantity_kg]
        v = min(fit, key=lambda x: x.base_cost + x.cost_per_km * km)
        cost = v.base_cost + v.cost_per_km * km
        total_score = sum(m.score * m.kg for m in members) / req.quantity_kg
        res = PoolResult(True, ship, members, req.quantity_kg, v, round(km, 1), round(cost, 2), round(total_score, 3))
        res.route_order = [chosen[i].id for i in order]
        if best is None or (res.score, -res.est_transport_cost) > (best.score, -best.est_transport_cost):
            best = res
    if best:
        best.excluded = [e for e in excluded if e.get("_ship") == best.ship_date or "_ship" not in e]
        for e in best.excluded: e.pop("_ship", None)
        best.reasons = [f"Chose pickup {best.ship_date}: highest quantity-weighted score among feasible dates."]
        return best
    for e in excluded: e.pop("_ship", None)
    return PoolResult(False, excluded=excluded, reasons=why_not or ["No feasible pickup date before the deadline."])
