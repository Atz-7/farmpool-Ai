"""IVR Feature Phone Simulation Endpoints.
Connects the interactive handset simulator to the core TelephonyService.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, Farmer, Role
from .schemas import IVRCallStartIn, IVRKeypadInputIn
from .services.telephony import TelephonyService

router = APIRouter(prefix="/api/ivr", tags=["IVR"])

@router.get("/demo-farmers")
def get_ivr_demo_farmers(db: Session = Depends(get_db)):
    """Provides farmers for quick selection on the feature phone simulator."""
    farmers = db.query(Farmer).join(User).all()
    return [
        {
            "id": f.id,
            "name": f.user.name,
            "phone": f.user.phone,
            "village": f.village,
            "phone_type": f.phone_type,
            "preferred_language": f.preferred_language,
        }
        for f in farmers
    ]

@router.post("/call/initiate")
def initiate_call(b: IVRCallStartIn, db: Session = Depends(get_db)):
    """Simulates initiating an incoming call from FarmPool AI to a farmer."""
    res = TelephonyService.start_call(b.phone, db)
    return res

@router.post("/input")
def send_keypad_input(b: IVRKeypadInputIn, db: Session = Depends(get_db)):
    """Processes DTMF keypad digits from the simulated handset."""
    res = TelephonyService.process_input(b.session_id, b.digits, db)
    return res

@router.post("/call/hangup")
def hangup_call(b: IVRKeypadInputIn, db: Session = Depends(get_db)):
    """Terminates active simulated call."""
    res = TelephonyService.process_input(b.session_id, "0", db)
    return res
