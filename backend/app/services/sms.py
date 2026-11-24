"""Notification & SMS Simulation Service for FarmPool AI.
Provides clean service abstraction for SMS & automated voice notification delivery.
Supports inbound SMS simulations (e.g. farmer replies '1' to accept buyer offer or '2' to decline).
Easily swapped for production gateways (Gupshup, Twilio, MSG91).
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Notification, User, Farmer, FarmerPool, PoolMember, HarvestListing, BuyerRequirement, Order, Shipment

class SMSService:
    @staticmethod
    def send(
        db: Session,
        phone: str,
        message: str,
        notif_type: str = "general",
        channel: str = "sms",
        related_pool_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Notification:
        # Match user if not passed
        if not user_id:
            u = db.query(User).filter_by(phone=phone).first()
            if u:
                user_id = u.id

        n = Notification(
            user_id=user_id,
            phone=phone,
            channel=channel,
            type=notif_type,
            message=message,
            related_pool_id=related_pool_id,
            status="sent",
        )
        db.add(n)
        db.commit()
        db.refresh(n)
        return n

    @staticmethod
    def list_history(db: Session, phone: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        q = db.query(Notification)
        if phone:
            q = q.filter(Notification.phone == phone)
        rows = q.order_by(Notification.id.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "phone": r.phone,
                "channel": r.channel,
                "type": r.type,
                "message": r.message,
                "related_pool_id": r.related_pool_id,
                "status": r.status,
                "reply_text": r.reply_text,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]

    @staticmethod
    def handle_inbound_reply(db: Session, notification_id: int, reply_text: str) -> Dict[str, Any]:
        n = db.get(Notification, notification_id)
        if not n:
            return {"success": False, "error": "Notification not found"}

        reply_cleaned = reply_text.strip().upper()
        n.status = "replied"
        n.reply_text = reply_text.strip()
        db.commit()

        # If replying to a buyer offer with 1 (accept) or 2 (reject)
        if n.type == "buyer_offer" and n.related_pool_id:
            pool = db.get(FarmerPool, n.related_pool_id)
            if pool:
                accept = reply_cleaned in ("1", "YES", "HAAN", "HA", "ACCEPT")
                # Find matching pool member for this phone
                user = db.query(User).filter_by(phone=n.phone).first()
                if user:
                    members = db.query(PoolMember).filter_by(pool_id=pool.id).all()
                    for m in members:
                        listing = db.get(HarvestListing, m.listing_id)
                        if listing and listing.farmer.user_id == user.id:
                            m.accepted = accept
                            m.consent_mode = "sms_reply"
                            m.responded_by_id = user.id

                    req = db.get(BuyerRequirement, pool.requirement_id)
                    if not accept:
                        pool.status = "Declined"
                        if req:
                            req.status = "Matching"
                    elif all(m.accepted for m in members):
                        pool.status = "Accepted"
                        if req:
                            req.status = "Awaiting Confirmation"
                    db.commit()

                    ack_msg = (
                        f"FarmPool AI: Your acceptance for Pool #{pool.id} has been recorded! We will send pickup vehicle schedule soon."
                        if accept
                        else f"FarmPool AI: You have declined Pool #{pool.id}. Your listing remains active."
                    )
                    SMSService.send(
                        db=db,
                        phone=n.phone,
                        message=ack_msg,
                        notif_type="sms_ack",
                        related_pool_id=pool.id,
                        user_id=user.id,
                    )
                    return {"success": True, "action": "pool_response", "accepted": accept, "ack_message": ack_msg}

        return {"success": True, "action": "recorded"}

    @staticmethod
    def notify_pool_proposed(db: Session, pool: FarmerPool, req: BuyerRequirement, members: list) -> None:
        """Called whenever Demand-First pooling proposes an aggregated farmer pool."""
        for m in members:
            listing = db.get(HarvestListing, m.listing_id)
            if not listing or not listing.farmer:
                continue
            phone = listing.farmer.user.phone
            crop = req.crop.capitalize()
            msg = (
                f"FarmPool AI: A buyer ({req.buyer.org_name}) offered ₹{req.price_min:.0f}–{req.price_max:.0f}/kg for your {crop}. "
                f"Your share: {m.kg_contributed:.0f} kg. Reply 1 to accept or 2 to reject."
            )
            SMSService.send(
                db=db,
                phone=phone,
                message=msg,
                notif_type="buyer_offer",
                channel="sms",
                related_pool_id=pool.id,
                user_id=listing.farmer.user_id,
            )

    @staticmethod
    def notify_order_confirmed(db: Session, order: Order, pool: FarmerPool) -> None:
        """Called when buyer confirms the order."""
        for m in db.query(PoolMember).filter_by(pool_id=pool.id):
            listing = db.get(HarvestListing, m.listing_id)
            if not listing or not listing.farmer:
                continue
            phone = listing.farmer.user.phone
            msg = (
                f"FarmPool AI: Order #{order.id} is CONFIRMED! Your {m.kg_contributed:.0f} kg harvest will be picked up tomorrow. "
                "Shared transport arranged. Please keep produce packed."
            )
            SMSService.send(
                db=db,
                phone=phone,
                message=msg,
                notif_type="pool_confirmed",
                channel="sms",
                related_pool_id=pool.id,
                user_id=listing.farmer.user_id,
            )

    @staticmethod
    def notify_shipment_advance(db: Session, shipment: Shipment, status_str: str) -> None:
        """Called when shipment status advances to In Transit or Delivered."""
        order = db.get(Order, shipment.order_id)
        if not order:
            return
        pool = db.get(FarmerPool, order.pool_id)
        if not pool:
            return

        for m in db.query(PoolMember).filter_by(pool_id=pool.id):
            listing = db.get(HarvestListing, m.listing_id)
            if not listing or not listing.farmer:
                continue
            phone = listing.farmer.user.phone
            if status_str == "In Transit":
                msg = f"FarmPool AI: Pickup vehicle is ON THE WAY for Order #{order.id}. Current stop: Hooghly corridor. Please be ready."
            elif status_str == "Delivered":
                msg = f"FarmPool AI: Produce delivered successfully to buyer! Net earnings statement generated in your FarmPool account."
            else:
                msg = f"FarmPool AI: Shipment #{shipment.id} status is now {status_str}."

            SMSService.send(
                db=db,
                phone=phone,
                message=msg,
                notif_type="transport_update",
                channel="sms",
                related_pool_id=pool.id,
                user_id=listing.farmer.user_id,
            )
