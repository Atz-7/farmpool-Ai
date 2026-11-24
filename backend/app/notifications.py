"""SMS & Voice Notification Simulation Endpoints.
Allows farmers and evaluators to inspect simulated SMS history and test two-way SMS replies.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .db import get_db
from .schemas import SMSNotificationIn, SMSReplyIn
from .services.sms import SMSService

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(
    phone: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Returns simulated notification history."""
    return SMSService.list_history(db=db, phone=phone)

@router.post("/send")
def send_notification(
    b: SMSNotificationIn,
    db: Session = Depends(get_db),
):
    """Dispatches a simulated notification."""
    n = SMSService.send(
        db=db,
        phone=b.phone,
        message=b.message,
        notif_type=b.type,
        related_pool_id=b.related_pool_id,
    )
    return {"success": True, "notification_id": n.id, "status": n.status}

@router.post("/simulate-reply")
def reply_to_notification(
    b: SMSReplyIn,
    db: Session = Depends(get_db),
):
    """Simulates an inbound SMS response from farmer (e.g. '1' to accept offer or '2' to decline)."""
    return SMSService.handle_inbound_reply(
        db=db,
        notification_id=b.notification_id,
        reply_text=b.reply_text,
    )
