"""Seed the DEMONSTRATION scenario. All data is synthetic demo data."""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .models import *
from .auth import hash_password

DEMO_FARMERS = [  # name, phone, village, lat, lng, kg, quality, harvest offset days
    ("Ramesh Das (demo)", "9000000001", "Singur", 22.810, 88.228, 250, "A", 1),
    ("Sukumar Pal (demo)", "9000000002", "Dhaniakhali", 22.980, 88.050, 300, "A", 1),
    ("Anita Mondal (demo)", "9000000003", "Haripal", 22.868, 88.093, 200, "B", 2),
    ("Bimal Ghosh (demo)", "9000000004", "Bandel", 22.928, 88.378, 250, "A", 1),
    ("Kabita Roy (demo)", "9000000005", "Balagarh", 23.008, 88.440, 200, "B", 1),
]

def seed(db: Session) -> None:
    if db.query(User).count(): return
    today = date.today()
    db.add(User(name="Admin (demo)", phone="9999999999", password_hash=hash_password("admin123"), role=Role.admin, is_demo=True))
    
    # Seed Village Coordinator
    coord_u = User(name="Harish Kumar (Coordinator)", phone="9000000099", password_hash=hash_password("coord123"), role=Role.coordinator, is_demo=True)
    db.add(coord_u); db.flush()
    db.add(Coordinator(user_id=coord_u.id, cluster_name="Singur / Hooghly Cluster", assigned_villages="Singur,Dhaniakhali,Haripal,Bandel,Balagarh"))

    for n, ph, vil, la, ln, kg, q, off in DEMO_FARMERS:
        phone_type = "feature_phone" if ph in ("9000000001", "9000000004") else "smartphone"
        pref_lang = "bn" if ph in ("9000000001", "9000000002", "9000000005") else "hi"
        u = User(name=n, phone=ph, password_hash=hash_password("farmer123"), role=Role.farmer, is_demo=True)
        db.add(u); db.flush()
        f = Farmer(user_id=u.id, village=vil, lat=la, lng=ln, phone_type=phone_type, preferred_language=pref_lang)
        db.add(f); db.flush()
        src = "ivr" if phone_type == "feature_phone" else "smartphone"
        db.add(HarvestListing(farmer_id=f.id, crop="tomato", quantity_kg=kg, quality=q,
                              harvest_date=today + timedelta(days=off), source=src))

    bu = User(name="Kolkata Fresh Retail (demo)", phone="9000000100", password_hash=hash_password("buyer123"), role=Role.buyer, is_demo=True)
    db.add(bu); db.flush()
    b = Buyer(user_id=bu.id, org_name="Kolkata Fresh Retail (demo)"); db.add(b); db.flush()
    db.add(BuyerRequirement(buyer_id=b.id, crop="tomato", quantity_kg=1000, min_quality="B", price_min=24, price_max=28,
                            dest_lat=22.5726, dest_lng=88.3639, dest_name="Kolkata collection hub (demo)",
                            deadline=today + timedelta(days=2)))
    # Edge-case demo: more than all listed supply -> engine must explain why no pool is possible
    db.add(BuyerRequirement(buyer_id=b.id, crop="tomato", quantity_kg=2500, min_quality="B", price_min=24, price_max=28,
                            dest_lat=22.5726, dest_lng=88.3639, dest_name="Kolkata collection hub (demo)",
                            deadline=today + timedelta(days=2)))
    for m, p, la, ln in [("Kolkata Mandi (DEMO price)", 22, 22.5726, 88.3639), ("Chinsurah Mandi (DEMO price)", 19, 22.90, 88.39),
                         ("Burdwan Mandi (DEMO price)", 17, 23.24, 87.86)]:
        db.add(MandiPrice(market=m, crop="tomato", price_per_kg=p, lat=la, lng=ln))
    for n, cap, c, base in [("Pickup 500kg (demo)", 500, 14, 200), ("Mini-truck 1500kg (demo)", 1500, 22, 400), ("Truck 3000kg (demo)", 3000, 32, 700)]:
        db.add(Vehicle(name=n, capacity_kg=cap, cost_per_km=c, base_cost=base))
    
    # Sample notifications for demonstration
    db.add(Notification(
        phone="9000000001", channel="sms", type="buyer_offer",
        message="FarmPool AI: A buyer has offered ₹24-28/kg for your tomatoes. Your estimated transport contribution is ₹1.4/kg. Reply 1 to accept or 2 to reject.",
        status="sent"
    ))
    db.add(Notification(
        phone="9000000001", channel="voice", type="ivr_summary",
        message="FarmPool AI IVR Call completed: Preferred language set to Bengali. Ready harvest of 250 kg registered.",
        status="delivered"
    ))
    db.commit()
