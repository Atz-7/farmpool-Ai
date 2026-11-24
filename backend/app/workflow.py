import json
from datetime import date
from dataclasses import asdict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .db import get_db
from .models import *
from .schemas import RequirementIn, ParseIn
from . import ai
from .auth import require_role, current_user
from .engines.pooling import build_pool, Listing, Requirement, VehicleSpec
from .engines import economics as eco
from .engines import routing
from .config import settings
from .services.sms import SMSService

router = APIRouter(prefix="/api")
A = Role.admin

def _vehicles(db): return [dict(id=v.id, name=v.name, capacity_kg=v.capacity_kg, cost_per_km=v.cost_per_km, base_cost=v.base_cost) for v in db.query(Vehicle)]
def _mandis(db, crop): return [dict(market=m.market, price_per_kg=m.price_per_kg, lat=m.lat, lng=m.lng, commission_pct=m.commission_pct) for m in db.query(MandiPrice).filter_by(crop=crop)]
def _own_req(db, rid, user):
    r = db.get(BuyerRequirement, rid)
    if not r: raise HTTPException(404, "Requirement not found")
    if user.role == Role.buyer and r.buyer.user_id != user.id: raise HTTPException(403, "Not your requirement")
    return r
def _active_pool(db, rid):
    return db.query(FarmerPool).filter(FarmerPool.requirement_id == rid, FarmerPool.status.in_(["Proposed", "Accepted", "Confirmed"])).first()

@router.get("/mandi/compare/{listing_id}")
def mandi_compare(listing_id: int, user=Depends(require_role(Role.farmer, A)), db: Session = Depends(get_db)):
    l = db.get(HarvestListing, listing_id)
    if not l: raise HTTPException(404, "Listing not found")
    if user.role == Role.farmer and l.farmer.user_id != user.id: raise HTTPException(403, "Not your listing")
    opts = eco.mandi_options(l.quantity_kg, (l.farmer.lat, l.farmer.lng), _mandis(db, l.crop), _vehicles(db))
    return {"options": [o.to_dict() for o in opts], "recommended": opts[0].label if opts else None,
            "note": "Ranked by estimated NET earnings, not headline price. DEMO prices.", "assumptions": eco.ASSUMPTIONS}

@router.post("/requirements/{rid}/propose-pool")
def propose_pool(rid: int, user=Depends(require_role(Role.buyer, A)), db: Session = Depends(get_db)):
    r = _own_req(db, rid, user)
    if r.status not in (OrderStatus.open, OrderStatus.matching): raise HTTPException(409, f"Requirement is {r.status.value}")
    declined = {m.listing_id for m in db.query(PoolMember).join(FarmerPool).filter(FarmerPool.requirement_id == rid, PoolMember.accepted == False)}  # noqa
    r.status = OrderStatus.matching
    listings = [Listing(l.id, l.farmer.user.name, l.farmer.village, l.farmer.lat, l.farmer.lng, l.crop, l.quantity_kg, l.quality, l.harvest_date)
                for l in db.query(HarvestListing).filter_by(committed=False) if l.id not in declined]
    vs = [VehicleSpec(**v) for v in _vehicles(db)]
    res = build_pool(Requirement(r.crop, r.quantity_kg, r.min_quality, r.dest_lat, r.dest_lng, r.deadline, r.price_max), listings, vs, date.today())
    if not res.feasible:
        db.commit(); return {"feasible": False, "reasons": res.reasons, "excluded": res.excluded}
    # Refine the engine's quick tour estimate with OR-Tools (capacity + cost-aware vehicle choice)
    by_id = {l.id: l for l in listings}
    stops = [routing.Stop(m.listing_id, by_id[m.listing_id].lat, by_id[m.listing_id].lng, m.kg) for m in res.members]
    fleet = [v for v in _vehicles(db) if v["capacity_kg"] >= res.total_kg]  # one shared vehicle per pool
    rr = routing.optimise(stops, (r.dest_lat, r.dest_lng), fleet, settings.osrm_url)
    if not rr.feasible:
        db.commit(); return {"feasible": False, "reasons": [rr.reason], "excluded": res.excluded}
    vr = rr.routes[0]
    pool = FarmerPool(requirement_id=r.id, vehicle_id=vr.vehicle_id, total_kg=res.total_kg, score=res.score, status="Proposed")
    db.add(pool); db.flush()
    for m in res.members: db.add(PoolMember(pool_id=pool.id, listing_id=m.listing_id, kg_contributed=m.kg, reason=m.reason[:500]))
    db.add(TransportRoute(pool_id=pool.id, distance_km=rr.total_km, cost=rr.total_cost, stop_order_json=json.dumps(
        {"order": vr.stop_ids, "legs_km": vr.leg_km, "source": rr.distance_source, "vehicle": vr.vehicle_name})))
    r.status = OrderStatus.pool_proposed
    db.commit()
    # Trigger SMS notification simulation to invited farmers
    try:
        SMSService.notify_pool_proposed(db, pool, r, db.query(PoolMember).filter_by(pool_id=pool.id).all())
    except Exception as e:
        pass
    return {"feasible": True, "pool_id": pool.id, "ship_date": res.ship_date, "route_km": rr.total_km, "transport_cost": rr.total_cost,
            "vehicle": vr.vehicle_name, "distance_source": rr.distance_source, "quick_estimate_km": res.est_route_km,
            "members": [asdict(m) for m in res.members], "excluded": res.excluded}

class Respond(BaseModel): accept: bool

@router.post("/pools/{pid}/respond")
def respond(pid: int, b: Respond, user=Depends(require_role(Role.farmer)), db: Session = Depends(get_db)):
    pool = db.get(FarmerPool, pid)
    if not pool or pool.status != "Proposed": raise HTTPException(409, "Pool is not open for responses (cutoff passed or changed)")
    mine = [m for m in db.query(PoolMember).filter_by(pool_id=pid) if db.get(HarvestListing, m.listing_id).farmer.user_id == user.id]
    if not mine: raise HTTPException(403, "You are not in this pool")
    for m in mine: m.accepted = b.accept
    r = db.get(BuyerRequirement, pool.requirement_id)
    members = db.query(PoolMember).filter_by(pool_id=pid).all()
    if not b.accept:
        pool.status = "Declined"; r.status = OrderStatus.matching  # buyer can re-run matching without the decliner
    elif all(m.accepted for m in members):
        pool.status = "Accepted"; r.status = OrderStatus.awaiting
    db.commit()
    return {"pool_status": pool.status, "requirement_status": r.status.value}

@router.post("/requirements/{rid}/confirm")
def confirm(rid: int, user=Depends(require_role(Role.buyer)), db: Session = Depends(get_db)):
    r = _own_req(db, rid, user)
    pool = db.query(FarmerPool).filter_by(requirement_id=rid, status="Accepted").first()
    if r.status != OrderStatus.awaiting or not pool: raise HTTPException(409, "Needs a pool accepted by all farmers first")
    route = db.query(TransportRoute).filter_by(pool_id=pool.id).one()
    order = Order(requirement_id=r.id, pool_id=pool.id, status=OrderStatus.confirmed); db.add(order); db.flush()
    db.add(Shipment(order_id=order.id, vehicle_id=pool.vehicle_id, status=OrderStatus.confirmed))
    for m in db.query(PoolMember).filter_by(pool_id=pool.id):
        l = db.get(HarvestListing, m.listing_id); l.committed = True
        b = eco.pooled_share(m.kg_contributed, r.price_min, route.cost, pool.total_kg)
        db.add(Transaction(order_id=order.id, farmer_id=l.farmer_id, gross=b.revenue, deductions=round(b.revenue - b.net, 2), net=b.net))
    pool.status = "Confirmed"; r.status = OrderStatus.confirmed
    db.commit()
    try:
        SMSService.notify_order_confirmed(db, order, pool)
    except Exception:
        pass
    return {"order_id": order.id, "status": order.status.value}

@router.post("/shipments/{sid}/advance")
def advance(sid: int, user=Depends(require_role(A)), db: Session = Depends(get_db)):
    s = db.get(Shipment, sid)
    if not s: raise HTTPException(404, "Shipment not found")
    nxt = {OrderStatus.confirmed: OrderStatus.in_transit, OrderStatus.in_transit: OrderStatus.delivered}.get(s.status)
    if not nxt: raise HTTPException(409, f"Shipment already {s.status.value}")
    o = db.get(Order, s.order_id); r = db.get(BuyerRequirement, o.requirement_id)
    s.status = o.status = r.status = nxt
    db.commit()
    try:
        SMSService.notify_shipment_advance(db, s, nxt.value)
    except Exception:
        pass
    return {"status": nxt.value}

@router.get("/pools/{pid}/profit")
def profit(pid: int, user=Depends(current_user), db: Session = Depends(get_db)):
    pool = db.get(FarmerPool, pid)
    if not pool: raise HTTPException(404, "Pool not found")
    r = db.get(BuyerRequirement, pool.requirement_id)
    route = db.query(TransportRoute).filter_by(pool_id=pid).one()
    rows, mandis, vs = [], _mandis(db, r.crop), _vehicles(db)
    for m in db.query(PoolMember).filter_by(pool_id=pid):
        l = db.get(HarvestListing, m.listing_id)
        if user.role == Role.farmer and l.farmer.user_id != user.id: continue
        if user.role == Role.buyer and r.buyer.user_id != user.id: raise HTTPException(403, "Not your requirement")
        c = eco.compare(m.kg_contributed, (l.farmer.lat, l.farmer.lng), mandis, vs, r.price_min, r.price_max, route.cost, pool.total_kg)
        rows.append({"farmer": l.farmer.user.name, "village": l.farmer.village, "accepted": m.accepted, **c})
    return {"pool_id": pid, "farmers": rows}

@router.get("/orders")
def orders(user=Depends(current_user), db: Session = Depends(get_db)):
    out = []
    for s in db.query(Shipment):
        o = db.get(Order, s.order_id); r = db.get(BuyerRequirement, o.requirement_id)
        if user.role == Role.buyer and r.buyer.user_id != user.id: continue
        out.append({"shipment_id": s.id, "order_id": o.id, "crop": r.crop, "kg": r.quantity_kg, "status": s.status.value})
    return out

@router.get("/pools/{pid}/route")
def pool_route(pid: int, user=Depends(current_user), db: Session = Depends(get_db)):
    pool = db.get(FarmerPool, pid)
    if not pool: raise HTTPException(404, "Pool not found")
    r = db.get(BuyerRequirement, pool.requirement_id)
    if user.role == Role.buyer and r.buyer.user_id != user.id: raise HTTPException(403, "Not your requirement")
    if user.role == Role.farmer and not any(db.get(HarvestListing, m.listing_id).farmer.user_id == user.id
                                            for m in db.query(PoolMember).filter_by(pool_id=pid)):
        raise HTTPException(403, "You are not in this pool")
    rt = db.query(TransportRoute).filter_by(pool_id=pid).one()
    meta = json.loads(rt.stop_order_json)
    stops, cum = [], 0.0
    for i, lid in enumerate(meta["order"]):
        l = db.get(HarvestListing, lid)
        m = db.query(PoolMember).filter_by(pool_id=pid, listing_id=lid).one()
        stops.append({"seq": i + 1, "farmer": l.farmer.user.name, "village": l.farmer.village, "lat": l.farmer.lat, "lng": l.farmer.lng,
                      "kg": m.kg_contributed, "leg_km_to_next": meta["legs_km"][i]})
    return {"vehicle": meta["vehicle"], "distance_km": rt.distance_km, "cost": rt.cost, "distance_source": meta["source"],
            "destination": {"name": r.dest_name, "lat": r.dest_lat, "lng": r.dest_lng}, "stops": stops,
            "cost_share_rule": "transport cost split by kg contributed",
            "note": "Distances are estimates unless source says OSRM; cost is not guaranteed."}


def _req_dict(r): return {"id": r.id, "crop": r.crop, "quantity_kg": r.quantity_kg, "min_quality": r.min_quality, "price_min": r.price_min,
                          "price_max": r.price_max, "dest_name": r.dest_name, "dest_lat": r.dest_lat, "dest_lng": r.dest_lng,
                          "deadline": r.deadline, "status": r.status.value, "buyer": r.buyer.org_name}

@router.post("/requirements")
def create_requirement(b: RequirementIn, user=Depends(require_role(Role.buyer)), db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter_by(user_id=user.id).one()
    r = BuyerRequirement(buyer_id=buyer.id, **{**b.model_dump(), "crop": b.crop.lower()})
    db.add(r); db.commit()
    return _req_dict(r)

@router.get("/requirements")
def list_requirements(user=Depends(require_role(Role.buyer, A)), db: Session = Depends(get_db)):
    q = db.query(BuyerRequirement)
    if user.role == Role.buyer: q = q.join(Buyer).filter(Buyer.user_id == user.id)
    return [_req_dict(r) for r in q.order_by(BuyerRequirement.id.desc())]

@router.get("/pools")
def list_pools(user=Depends(current_user), db: Session = Depends(get_db)):
    out = []
    for p in db.query(FarmerPool).order_by(FarmerPool.id.desc()):
        r = db.get(BuyerRequirement, p.requirement_id)
        ms = db.query(PoolMember).filter_by(pool_id=p.id).all()
        mine = [m for m in ms if db.get(HarvestListing, m.listing_id).farmer.user_id == user.id]
        if user.role == Role.farmer and not mine: continue
        if user.role == Role.buyer and r.buyer.user_id != user.id: continue
        out.append({"id": p.id, "requirement_id": r.id, "crop": r.crop, "deadline": r.deadline, "status": p.status, "total_kg": p.total_kg,
                    "members": len(ms), "my_kg": sum(m.kg_contributed for m in mine) or None,
                    "my_accepted": mine[0].accepted if mine else None, "dest_name": r.dest_name})
    return out

@router.get("/pools/{pid}")
def pool_detail(pid: int, user=Depends(current_user), db: Session = Depends(get_db)):
    pool = db.get(FarmerPool, pid)
    if not pool: raise HTTPException(404, "Pool not found")
    r = db.get(BuyerRequirement, pool.requirement_id)
    ms = db.query(PoolMember).filter_by(pool_id=pid).all()
    if user.role == Role.buyer and r.buyer.user_id != user.id: raise HTTPException(403, "Not your requirement")
    if user.role == Role.farmer and not any(db.get(HarvestListing, m.listing_id).farmer.user_id == user.id for m in ms):
        raise HTTPException(403, "You are not in this pool")
    return {"id": pid, "status": pool.status, "total_kg": pool.total_kg, "score": pool.score, "requirement": _req_dict(r),
            "members": [{"farmer": db.get(HarvestListing, m.listing_id).farmer.user.name, "village": db.get(HarvestListing, m.listing_id).farmer.village,
                         "kg": m.kg_contributed, "reason": m.reason, "accepted": m.accepted} for m in ms]}

@router.get("/admin/summary")
def admin_summary(user=Depends(require_role(A)), db: Session = Depends(get_db)):
    ships = db.query(Shipment).all()
    listed = sum(l.quantity_kg for l in db.query(HarvestListing))
    moved = sum(p.total_kg for p in db.query(FarmerPool).filter(FarmerPool.status == "Confirmed"))
    return {"farmers": [{"name": f.user.name, "village": f.village, "phone": f.user.phone, "demo": f.user.is_demo} for f in db.query(Farmer)],
            "buyers": [{"name": b.org_name, "phone": b.user.phone, "demo": b.user.is_demo} for b in db.query(Buyer)],
            "vehicles": _vehicles(db), "total_listed_kg": listed, "total_aggregated_kg": moved,
            "active_pools": db.query(FarmerPool).filter(FarmerPool.status.in_(["Proposed", "Accepted"])).count(),
            "orders": db.query(Order).count(),
            "shipments": [{"id": s.id, "order_id": s.order_id, "status": s.status.value} for s in ships],
            "listings": [{"farmer": l.farmer.user.name, "crop": l.crop, "kg": l.quantity_kg, "quality": l.quality,
                          "harvest_date": l.harvest_date, "committed": l.committed} for l in db.query(HarvestListing)]}


@router.post("/ai/parse-listing")
def ai_parse_listing(b: ParseIn, user=Depends(require_role(Role.farmer))):
    return ai.parse_listing(b.text.strip())
