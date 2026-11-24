from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import date
from dataclasses import asdict
from .db import Base, engine, get_db, SessionLocal
from .models import *
from .schemas import *
from .auth import hash_password, verify_password, make_token, current_user, require_role
from .seed import seed
from .engines.pooling import build_pool, Listing, Requirement, VehicleSpec
from .config import settings

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal() as db: seed(db)
    yield

app = FastAPI(title="FarmPool AI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()], allow_methods=["*"], allow_headers=["*"])
from .workflow import router
app.include_router(router)

from .ivr import router as ivr_router
from .coordinator import router as coordinator_router
from .notifications import router as notifications_router
app.include_router(ivr_router)
app.include_router(coordinator_router)
app.include_router(notifications_router)

@app.get("/api/health")
def health(): return {"ok": True}

@app.post("/api/auth/register", response_model=TokenOut)
def register(b: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter_by(phone=b.phone).first(): raise HTTPException(409, "Phone already registered")
    if b.role == "farmer" and (b.village is None or b.lat is None or b.lng is None):
        raise HTTPException(422, "Farmers need village, lat, lng")
    u = User(name=b.name, phone=b.phone, password_hash=hash_password(b.password), role=Role(b.role))
    db.add(u); db.flush()
    if b.role == "farmer":
        db.add(Farmer(user_id=u.id, village=b.village, lat=b.lat, lng=b.lng,
                      phone_type=b.phone_type or "smartphone", preferred_language=b.preferred_language or "hi"))
    elif b.role == "coordinator":
        db.add(Coordinator(user_id=u.id, cluster_name=b.village or "Singur / Hooghly Cluster"))
    else: db.add(Buyer(user_id=u.id, org_name=b.org_name or b.name))
    db.commit()
    return TokenOut(access_token=make_token(u), role=u.role.value)

@app.post("/api/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter_by(phone=form.username).first()
    if not u or not verify_password(form.password, u.password_hash): raise HTTPException(401, "Wrong phone or password")
    return TokenOut(access_token=make_token(u), role=u.role.value)

@app.post("/api/listings")
def add_listing(b: ListingIn, user: User = Depends(require_role(Role.farmer, Role.coordinator)), db: Session = Depends(get_db)):
    # Deduplication check for offline sync idempotency
    if b.client_request_id:
        existing = db.query(HarvestListing).filter_by(client_request_id=b.client_request_id).first()
        if existing:
            return {"id": existing.id, "deduplicated": True}
    
    farmer_id = None
    if user.role == Role.farmer:
        f = db.query(Farmer).filter_by(user_id=user.id).first()
        if not f: raise HTTPException(404, "Farmer record not found")
        farmer_id = f.id
    else:
        # If coordinator submits via /api/listings without specific farmer_id, default to first assisted farmer
        f = db.query(Farmer).first()
        farmer_id = f.id if f else 1

    l = HarvestListing(farmer_id=farmer_id, crop=b.crop.lower(), quantity_kg=b.quantity_kg, quality=b.quality,
                       harvest_date=b.harvest_date, preferred_sell_date=b.preferred_sell_date,
                       source=b.source or ("coordinator" if user.role == Role.coordinator else "smartphone"),
                       created_by_id=user.id if user.role == Role.coordinator else None,
                       client_request_id=b.client_request_id)
    db.add(l); db.commit()
    return {"id": l.id}

@app.get("/api/listings")
def list_listings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(HarvestListing)
    if user.role == Role.farmer:
        f = db.query(Farmer).filter_by(user_id=user.id).first()
        if f: q = q.filter(HarvestListing.farmer_id == f.id)
    return [{"id": l.id, "farmer": l.farmer.user.name, "village": l.farmer.village, "crop": l.crop,
             "quantity_kg": l.quantity_kg, "quality": l.quality, "harvest_date": l.harvest_date,
             "source": l.source, "committed": l.committed} for l in q.all()]

@app.get("/api/requirements/{rid}/pool-preview")
def pool_preview(rid: int, user: User = Depends(require_role(Role.buyer, Role.admin)), db: Session = Depends(get_db)):
    r = db.get(BuyerRequirement, rid)
    if not r: raise HTTPException(404, "Requirement not found")
    if user.role == Role.buyer and r.buyer.user_id != user.id: raise HTTPException(403, "Not your requirement")
    listings = [Listing(l.id, l.farmer.user.name, l.farmer.village, l.farmer.lat, l.farmer.lng, l.crop,
                        l.quantity_kg, l.quality, l.harvest_date)
                for l in db.query(HarvestListing).filter_by(committed=False)]
    vehicles = [VehicleSpec(v.id, v.name, v.capacity_kg, v.cost_per_km, v.base_cost) for v in db.query(Vehicle)]
    res = build_pool(Requirement(r.crop, r.quantity_kg, r.min_quality, r.dest_lat, r.dest_lng, r.deadline, r.price_max),
                     listings, vehicles, date.today())
    return asdict(res)
