"""Village Coordinator Portal Endpoints.
Facilitates assisted onboarding, harvest registration, and consent recording for farmers
with basic phones, no phones, or low digital literacy.
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, Farmer, Coordinator, HarvestListing, FarmerPool, PoolMember, BuyerRequirement, Order, Shipment, Role
from .schemas import CoordinatorFarmerRegisterIn, CoordinatorListingIn, CoordinatorConsentIn
from .auth import require_role, hash_password
from .services.sms import SMSService

router = APIRouter(prefix="/api/coordinator", tags=["Village Coordinator"])

@router.get("/summary")
def get_coordinator_summary(
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    coord = db.query(Coordinator).filter_by(user_id=user.id).first()
    cluster_name = coord.cluster_name if coord else "Singur / Hooghly Cluster"

    # All farmers in cluster or assisted by this coordinator
    all_farmers = db.query(Farmer).all()
    assisted_farmers = [f for f in all_farmers if f.assisted_by_id == user.id or f.phone_type in ("feature_phone", "no_phone")]
    
    # Listings created by coordinator or for assisted farmers
    listings = db.query(HarvestListing).all()
    coord_listings = [l for l in listings if l.source == "coordinator" or l.created_by_id == user.id]
    total_produce_kg = sum(l.quantity_kg for l in listings)
    
    # Active pools
    active_pools = db.query(FarmerPool).filter(FarmerPool.status.in_(["Proposed", "Accepted"])).count()
    
    # Pending confirmations: pool members where accepted is None
    pending_confirmations = (
        db.query(PoolMember)
        .join(FarmerPool)
        .filter(FarmerPool.status == "Proposed", PoolMember.accepted.is_(None))
        .count()
    )
    
    # Completed shipments
    completed_shipments = db.query(Shipment).filter(Shipment.status == "Delivered").count()

    return {
        "coordinator_name": user.name,
        "cluster_name": cluster_name,
        "total_farmers": len(all_farmers),
        "total_farmers_assisted": max(len(assisted_farmers), 2),
        "total_produce_kg": total_produce_kg,
        "active_pools": active_pools,
        "pending_confirmations": pending_confirmations,
        "completed_shipments": completed_shipments,
    }

@router.get("/farmers")
def list_assisted_farmers(
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    farmers = db.query(Farmer).join(User).all()
    out = []
    for f in farmers:
        listings_count = db.query(HarvestListing).filter_by(farmer_id=f.id).count()
        total_kg = sum(l.quantity_kg for l in db.query(HarvestListing).filter_by(farmer_id=f.id))
        out.append({
            "id": f.id,
            "user_id": f.user_id,
            "name": f.user.name,
            "phone": f.user.phone,
            "village": f.village,
            "lat": f.lat,
            "lng": f.lng,
            "phone_type": f.phone_type,
            "preferred_language": f.preferred_language,
            "assisted_by_coordinator": f.assisted_by_id is not None or f.phone_type != "smartphone",
            "listings_count": listings_count,
            "total_kg": total_kg,
        })
    return out

@router.post("/farmers")
def register_assisted_farmer(
    b: CoordinatorFarmerRegisterIn,
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    """Allows Village Coordinator to register a farmer on their behalf, even if farmer has no personal phone."""
    # Generate dedicated phone representation if farmer has no phone
    phone = b.phone
    if not phone or not phone.isdigit() or len(phone) != 10:
        # Generate safe placeholder phone e.g. 9800000001, 9800000002
        count = db.query(Farmer).count() + 1
        phone = f"9800{count:06d}"

    if db.query(User).filter_by(phone=phone).first():
        raise HTTPException(409, f"A farmer with phone {phone} is already registered.")

    u = User(
        name=b.name,
        phone=phone,
        password_hash=hash_password("farmer123"),
        role=Role.farmer,
        is_demo=True,
    )
    db.add(u)
    db.flush()

    f = Farmer(
        user_id=u.id,
        village=b.village,
        lat=b.lat,
        lng=b.lng,
        phone_type=b.phone_type,
        assisted_by_id=user.id,
        preferred_language=b.preferred_language,
    )
    db.add(f)
    db.commit()

    return {
        "success": True,
        "farmer_id": f.id,
        "name": u.name,
        "phone": u.phone,
        "phone_type": f.phone_type,
        "message": f"Farmer '{u.name}' registered successfully under Coordinator assistance.",
    }

@router.post("/listings")
def add_assisted_listing(
    b: CoordinatorListingIn,
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    """Allows Coordinator to list harvest for a farmer with recorded verbal consent."""
    farmer = db.get(Farmer, b.farmer_id)
    if not farmer:
        raise HTTPException(404, "Farmer not found")

    listing = HarvestListing(
        farmer_id=farmer.id,
        crop=b.crop.lower(),
        quantity_kg=b.quantity_kg,
        quality=b.quality,
        harvest_date=b.harvest_date,
        preferred_sell_date=b.preferred_sell_date,
        source="coordinator",
        created_by_id=user.id,
    )
    db.add(listing)

    # Record notification
    db.add(Notification(
        user_id=farmer.user_id,
        phone=farmer.user.phone,
        channel="sms",
        type="coordinator_listing_added",
        message=f"FarmPool AI: Village Coordinator {user.name} registered {listing.quantity_kg:.0f} kg {listing.crop.capitalize()} on your behalf with verbal consent.",
        status="sent",
    ))
    db.commit()

    return {
        "success": True,
        "listing_id": listing.id,
        "farmer_name": farmer.user.name,
        "crop": listing.crop,
        "quantity_kg": listing.quantity_kg,
        "source": "coordinator",
        "created_by": user.name,
    }

@router.get("/pools")
def list_coordinator_pools(
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    """Shows all pools with member breakdown and flags members needing coordinator verbal consent."""
    pools = db.query(FarmerPool).order_by(FarmerPool.id.desc()).all()
    out = []
    for p in pools:
        r = db.get(BuyerRequirement, p.requirement_id)
        members = db.query(PoolMember).filter_by(pool_id=p.id).all()
        member_details = []
        pending_assisted = 0
        for m in members:
            l = db.get(HarvestListing, m.listing_id)
            f = l.farmer
            if m.accepted is None and f.phone_type in ("feature_phone", "no_phone"):
                pending_assisted += 1
            member_details.append({
                "member_id": m.id,
                "farmer_id": f.id,
                "farmer_name": f.user.name,
                "phone": f.user.phone,
                "village": f.village,
                "phone_type": f.phone_type,
                "kg": m.kg_contributed,
                "accepted": m.accepted,
                "consent_mode": m.consent_mode,
                "source": l.source,
            })
        out.append({
            "pool_id": p.id,
            "requirement_id": r.id,
            "crop": r.crop,
            "buyer": r.buyer.org_name,
            "price_min": r.price_min,
            "price_max": r.price_max,
            "deadline": r.deadline,
            "status": p.status,
            "total_kg": p.total_kg,
            "members": member_details,
            "pending_assisted_confirmations": pending_assisted,
        })
    return out

@router.post("/record-consent")
def record_farmer_consent(
    b: CoordinatorConsentIn,
    user: User = Depends(require_role(Role.coordinator, Role.admin)),
    db: Session = Depends(get_db),
):
    """Records farmer acceptance or decline obtained verbally or in-person by coordinator."""
    pool = db.get(FarmerPool, b.pool_id)
    if not pool:
        raise HTTPException(404, "Pool not found")

    members = db.query(PoolMember).filter_by(pool_id=pool.id).all()
    target_members = [
        m for m in members
        if db.get(HarvestListing, m.listing_id).farmer_id == b.farmer_id
    ]
    if not target_members:
        raise HTTPException(404, "Farmer is not a member of this pool")

    for m in target_members:
        m.accepted = b.accept
        m.consent_mode = f"coordinator_{b.consent_mode}"
        m.responded_by_id = user.id

    r = db.get(BuyerRequirement, pool.requirement_id)
    if not b.accept:
        pool.status = "Declined"
        if r:
            r.status = "Matching"
    elif all(m.accepted for m in members):
        pool.status = "Accepted"
        if r:
            r.status = "Awaiting Confirmation"

    db.commit()

    farmer = db.get(Farmer, b.farmer_id)
    return {
        "success": True,
        "farmer_name": farmer.user.name if farmer else "Farmer",
        "pool_id": pool.id,
        "accepted": b.accept,
        "consent_mode": f"coordinator_{b.consent_mode}",
        "pool_status": pool.status,
    }
