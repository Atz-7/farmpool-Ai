"""Telephony & IVR Simulation Service for FarmPool AI.
Provides modular state machine for IVR calls, compatible with Twilio / Exotel / Plivo webhooks.
Supports regional languages (Bengali, Hindi, English) with voice synthesis prompts and DTMF input handling.
"""
import uuid
from datetime import date, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import User, Farmer, HarvestListing, FarmerPool, PoolMember, BuyerRequirement, Notification

# In-memory session store for active simulated calls
_CALL_SESSIONS: Dict[str, Dict[str, Any]] = {}

CROPS = {
    "1": ("tomato", "টমেটো", "टमाटर", "Tomato"),
    "2": ("potato", "আলু", "आलू", "Potato"),
    "3": ("onion", "পেঁয়াজ", "प्याज", "Onion"),
    "4": ("spinach", "পালং শাক", "पालक", "Spinach"),
    "5": ("wheat", "গম", "गेहूं", "Wheat"),
}

LANGUAGES = {
    "1": ("bn", "বাংলা", "Bengali"),
    "2": ("hi", "हिंदी", "Hindi"),
    "3": ("en", "English", "English"),
}

PROMPTS = {
    "welcome_lang": {
        "text": "Welcome to FarmPool AI. বাংলা ভাষার জন্য ১ টিপুন। हिंदी के लिए २ दबाएं। For English, press 3.",
        "options": [
            {"key": "1", "label": "১. বাংলা (Bengali)"},
            {"key": "2", "label": "२. हिंदी (Hindi)"},
            {"key": "3", "label": "3. English"},
        ],
        "input_type": "single_digit",
    },
    "main_menu": {
        "bn": {
            "text": "ফার্মপুল এআই মূল মেনু: ফসল নথিভুক্ত করতে ১ টিপুন। ক্রেতার প্রস্তাব শুনতে ২ টিপুন। উপলব্ধ কৃষক দল দেখতে ৩ টিপুন। প্রস্তাব গ্রহণ বা প্রত্যাখ্যান করতে ৪ টিপুন। চালানের অবস্থা জানতে ৫ টিপুন। গ্রাম সমন্বয়কের সাথে কথা বলতে ৬ টিপুন।",
            "options": [
                {"key": "1", "label": "১. ফসল নথিভুক্ত করুন (Register Harvest)"},
                {"key": "2", "label": "২. ক্রেতার প্রস্তাব শুনুন (Buyer Offers)"},
                {"key": "3", "label": "৩. কৃষক দল দেখুন (Farmer Pools)"},
                {"key": "4", "label": "৪. প্রস্তাব গ্রহণ/প্রত্যাখ্যান (Accept/Reject)"},
                {"key": "5", "label": "৫. চালানের অবস্থা (Shipment Status)"},
                {"key": "6", "label": "৬. গ্রাম সমন্বয়ক (Village Coordinator)"},
            ],
        },
        "hi": {
            "text": "फार्मपूल एआई मुख्य मेनू: अपनी तैयार फसल दर्ज करने के लिए १ दबाएं। खरीदार के आर्डर व भाव सुनने के लिए २ दबाएं। उपलब्ध किसान समूह देखने के लिए ३ दबाएं। आर्डर स्वीकार या अस्वीकार करने के लिए ४ दबाएं। माल व वाहन की स्थिति जानने के लिए ५ दबाएं। ग्राम समन्वयक से बात करने के लिए ६ दबाएं।",
            "options": [
                {"key": "1", "label": "१. तैयार फसल दर्ज करें (Register Harvest)"},
                {"key": "2", "label": "२. खरीदार के आर्डर सुनें (Buyer Offers)"},
                {"key": "3", "label": "३. किसान समूह देखें (Farmer Pools)"},
                {"key": "4", "label": "४. आर्डर स्वीकार/मना करें (Accept/Reject)"},
                {"key": "5", "label": "५. माल और वाहन की स्थिति (Shipment Status)"},
                {"key": "6", "label": "६. ग्राम समन्वयक से संपर्क (Village Coordinator)"},
            ],
        },
        "en": {
            "text": "FarmPool AI Main Menu: Press 1 to register your available harvest. Press 2 to hear current buyer offers. Press 3 to check available farmer pools. Press 4 to accept or reject an offer. Press 5 to check shipment status. Press 6 to speak with your village coordinator.",
            "options": [
                {"key": "1", "label": "1. Register Available Harvest"},
                {"key": "2", "label": "2. Hear Buyer Offers"},
                {"key": "3", "label": "3. Check Farmer Pools"},
                {"key": "4", "label": "4. Accept or Reject Offer"},
                {"key": "5", "label": "5. Check Shipment Status"},
                {"key": "6", "label": "6. Speak to Village Coordinator"},
            ],
        },
    },
    "crop_select": {
        "bn": {
            "text": "আপনি কোন ফসল বিক্রি করতে চান? টমেটোর জন্য ১ টিপুন, আলুর জন্য ২, পেঁয়াজের জন্য ৩, পালং শাকের জন্য ৪, গমের জন্য ৫।",
            "options": [
                {"key": "1", "label": "১. টমেটো (Tomato)"},
                {"key": "2", "label": "২. আলু (Potato)"},
                {"key": "3", "label": "৩. পেঁয়াজ (Onion)"},
                {"key": "4", "label": "৪. পালং শাক (Spinach)"},
                {"key": "5", "label": "৫. গম (Wheat)"},
            ],
        },
        "hi": {
            "text": "आप कौन सी फसल बेचना चाहते हैं? टमाटर के लिए १ दबाएं, आलू के लिए २, प्याज के लिए ३, पालक के लिए ४, गेहूं के लिए ५।",
            "options": [
                {"key": "1", "label": "१. टमाटर (Tomato)"},
                {"key": "2", "label": "२. आलू (Potato)"},
                {"key": "3", "label": "३. प्याज (Onion)"},
                {"key": "4", "label": "४. पालक (Spinach)"},
                {"key": "5", "label": "५. गेहूं (Wheat)"},
            ],
        },
        "en": {
            "text": "Which crop do you want to sell? Press 1 for Tomatoes, 2 for Potatoes, 3 for Onions, 4 for Spinach, 5 for Wheat.",
            "options": [
                {"key": "1", "label": "1. Tomatoes"},
                {"key": "2", "label": "2. Potatoes"},
                {"key": "3", "label": "3. Onions"},
                {"key": "4", "label": "4. Spinach"},
                {"key": "5", "label": "5. Wheat"},
            ],
        },
    },
    "quantity_input": {
        "bn": {
            "text": "আপনার উপলব্ধ ফসলের পরিমাণ কেজিতে লিখুন এবং শেষে হ্যাশ (#) বোতাম টিপুন। যেমন ২০০ কেজির জন্য ২০০# টিপুন।",
            "options": [
                {"key": "100#", "label": "১০০ কেজি (100 kg)"},
                {"key": "200#", "label": "২০০ কেজি (200 kg)"},
                {"key": "300#", "label": "৩০০ কেজি (300 kg)"},
                {"key": "500#", "label": "৫০০ কেজি (500 kg)"},
            ],
        },
        "hi": {
            "text": "अपनी फसल की मात्रा किलोग्राम में कीपैड से दर्ज करें और अंत में हैश (#) दबाएं। उदाहरण के लिए २०० किलो के लिए २००# दबाएं।",
            "options": [
                {"key": "100#", "label": "१०० किलो (100 kg)"},
                {"key": "200#", "label": "२०० किलो (200 kg)"},
                {"key": "300#", "label": "३०० किलो (300 kg)"},
                {"key": "500#", "label": "५०० किलो (500 kg)"},
            ],
        },
        "en": {
            "text": "Enter your available quantity in kilograms using the keypad, followed by the hash (#) key. For example, 200# for 200 kilograms.",
            "options": [
                {"key": "100#", "label": "100 kg"},
                {"key": "200#", "label": "200 kg"},
                {"key": "300#", "label": "300 kg"},
                {"key": "500#", "label": "500 kg"},
            ],
        },
    },
    "ready_date": {
        "bn": {
            "text": "আপনার ফসল কখন তৈরি হবে? আজকের জন্য ১ টিপুন, আগামীকালের জন্য ২, দুই দিন পর হলে ৩ টিপুন।",
            "options": [
                {"key": "1", "label": "১. আজ (Today)"},
                {"key": "2", "label": "২. আগামীকাল (Tomorrow)"},
                {"key": "3", "label": "৩. ২ দিন পর (In 2 Days)"},
            ],
        },
        "hi": {
            "text": "आपकी फसल कब तक तैयार होगी? आज के लिए १ दबाएं, कल के लिए २ दबाएं, २ दिन बाद के लिए ३ दबाएं।",
            "options": [
                {"key": "1", "label": "१. आज (Today)"},
                {"key": "2", "label": "२. कल (Tomorrow)"},
                {"key": "3", "label": "३. २ दिन में (In 2 Days)"},
            ],
        },
        "en": {
            "text": "When will your harvest be ready? Press 1 for Today, 2 for Tomorrow, 3 for In 2 Days.",
            "options": [
                {"key": "1", "label": "1. Today"},
                {"key": "2", "label": "2. Tomorrow"},
                {"key": "3", "label": "3. In 2 Days"},
            ],
        },
    },
    "quality_grade": {
        "bn": {
            "text": "ফসলের মান নির্বাচন করুন: গ্রেড A সেরা মানের জন্য ১ টিপুন, গ্রেড B সাধারণ মানের জন্য ২ টিপুন।",
            "options": [
                {"key": "1", "label": "১. গ্রেড A (সেরা মান ⭐⭐⭐)"},
                {"key": "2", "label": "২. গ্রেড B (সাধারণ মান ⭐⭐)"},
            ],
        },
        "hi": {
            "text": "फसल की गुणवत्ता चुनें: ग्रेड A बढ़िया माल के लिए १ दबाएं, ग्रेड B मध्यम माल के लिए २ दबाएं।",
            "options": [
                {"key": "1", "label": "१. ग्रेड A (बढ़िया माल ⭐⭐⭐)"},
                {"key": "2", "label": "२. ग्रेड B (मध्यम माल ⭐⭐)"},
            ],
        },
        "en": {
            "text": "Select crop quality: Press 1 for Grade A top quality, Press 2 for Grade B standard quality.",
            "options": [
                {"key": "1", "label": "1. Grade A (Top Quality)"},
                {"key": "2", "label": "2. Grade B (Standard Quality)"},
            ],
        },
    },
}

class TelephonyService:
    @staticmethod
    def start_call(phone: str, db: Session) -> Dict[str, Any]:
        session_id = f"ivr_{uuid.uuid4().hex[:12]}"
        user = db.query(User).filter_by(phone=phone).first()
        farmer = db.query(Farmer).filter_by(user_id=user.id).first() if user else None
        
        pref_lang = farmer.preferred_language if farmer and farmer.preferred_language in ("bn", "hi", "en") else "hi"
        farmer_name = user.name if user else "Kisan Mitra"

        _CALL_SESSIONS[session_id] = {
            "session_id": session_id,
            "phone": phone,
            "user_id": user.id if user else None,
            "farmer_id": farmer.id if farmer else None,
            "farmer_name": farmer_name,
            "language": pref_lang,
            "state": "welcome_lang",
            "temp_listing": {},
            "active": True,
        }

        return {
            "session_id": session_id,
            "state": "welcome_lang",
            "language": "hi",
            "prompt_text": PROMPTS["welcome_lang"]["text"],
            "options": PROMPTS["welcome_lang"]["options"],
            "input_type": "single_digit",
            "farmer_name": farmer_name,
            "call_status": "in_call",
        }

    @staticmethod
    def process_input(session_id: str, digits: str, db: Session) -> Dict[str, Any]:
        s = _CALL_SESSIONS.get(session_id)
        if not s or not s["active"]:
            return {
                "session_id": session_id,
                "state": "call_ended",
                "prompt_text": "Call session expired or ended. Please redial.",
                "options": [],
                "input_type": "none",
                "call_status": "ended",
            }

        digits = digits.strip()
        state = s["state"]
        lang = s["language"]

        # Universal Keypad Controls:
        # * = Return to Main Menu
        if digits == "*":
            s["state"] = "main_menu"
            menu_info = PROMPTS["main_menu"][lang]
            return {
                "session_id": session_id,
                "state": "main_menu",
                "language": lang,
                "prompt_text": menu_info["text"],
                "options": menu_info["options"],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # # = Hang up if pressed alone
        if digits == "0":
            s["active"] = False
            hangup_text = (
                "ফার্মপুল এআই-তে ফোন করার জন্য ধন্যবাদ। শুভ দিন!"
                if lang == "bn"
                else "फार्मपूल एआई पर कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!"
                if lang == "hi"
                else "Thank you for calling FarmPool AI. Have a great day!"
            )
            return {
                "session_id": session_id,
                "state": "call_ended",
                "language": lang,
                "prompt_text": hangup_text,
                "options": [],
                "input_type": "none",
                "call_status": "ended",
            }

        # STATE: welcome_lang
        if state == "welcome_lang":
            chosen_lang = LANGUAGES.get(digits, ("hi", "हिंदी", "Hindi"))[0]
            s["language"] = chosen_lang
            lang = chosen_lang

            # Update preferred language in DB if farmer exists
            if s["farmer_id"]:
                f = db.get(Farmer, s["farmer_id"])
                if f:
                    f.preferred_language = chosen_lang
                    db.commit()

            s["state"] = "main_menu"
            menu_info = PROMPTS["main_menu"][lang]
            return {
                "session_id": session_id,
                "state": "main_menu",
                "language": lang,
                "prompt_text": menu_info["text"],
                "options": menu_info["options"],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # STATE: main_menu
        if state == "main_menu":
            if digits == "1":
                # Register harvest
                s["state"] = "crop_select"
                crop_info = PROMPTS["crop_select"][lang]
                return {
                    "session_id": session_id,
                    "state": "crop_select",
                    "language": lang,
                    "prompt_text": crop_info["text"],
                    "options": crop_info["options"],
                    "input_type": "single_digit",
                    "call_status": "in_call",
                }
            elif digits in ("2", "3", "4"):
                # Hear offers / View pools / Accept or reject
                return TelephonyService._handle_offers_menu(s, lang, db)
            elif digits == "5":
                # Shipment status
                return TelephonyService._handle_shipment_status(s, lang, db)
            elif digits == "6":
                # Coordinator assistance
                return TelephonyService._handle_coordinator_request(s, lang, db)
            else:
                menu_info = PROMPTS["main_menu"][lang]
                return {
                    "session_id": session_id,
                    "state": "main_menu",
                    "language": lang,
                    "prompt_text": ("ভুল বোতাম টিপেছেন। " if lang == "bn" else "गलत बटन दबाया है। " if lang == "hi" else "Invalid input. ") + menu_info["text"],
                    "options": menu_info["options"],
                    "input_type": "single_digit",
                    "call_status": "in_call",
                }

        # STATE: crop_select
        if state == "crop_select":
            crop_entry = CROPS.get(digits, CROPS["1"])
            crop_key = crop_entry[0]
            s["temp_listing"]["crop"] = crop_key
            s["state"] = "quantity_input"
            qty_info = PROMPTS["quantity_input"][lang]
            return {
                "session_id": session_id,
                "state": "quantity_input",
                "language": lang,
                "prompt_text": qty_info["text"],
                "options": qty_info["options"],
                "input_type": "number_with_pound",
                "call_status": "in_call",
            }

        # STATE: quantity_input
        if state == "quantity_input":
            # Strip trailing '#' if present
            clean_digits = digits.replace("#", "").strip()
            try:
                qty = float(clean_digits)
                if qty <= 0:
                    qty = 200.0
            except ValueError:
                qty = 200.0

            s["temp_listing"]["quantity_kg"] = qty
            s["state"] = "ready_date"
            date_info = PROMPTS["ready_date"][lang]
            return {
                "session_id": session_id,
                "state": "ready_date",
                "language": lang,
                "prompt_text": date_info["text"],
                "options": date_info["options"],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # STATE: ready_date
        if state == "ready_date":
            offset = 0 if digits == "1" else 1 if digits == "2" else 2
            s["temp_listing"]["harvest_date"] = date.today() + timedelta(days=offset)
            s["state"] = "quality_grade"
            qual_info = PROMPTS["quality_grade"][lang]
            return {
                "session_id": session_id,
                "state": "quality_grade",
                "language": lang,
                "prompt_text": qual_info["text"],
                "options": qual_info["options"],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # STATE: quality_grade -> Save Listing!
        if state == "quality_grade":
            quality = "A" if digits == "1" else "B"
            s["temp_listing"]["quality"] = quality

            # Persist in Database
            farmer_id = s.get("farmer_id")
            if not farmer_id:
                # Default to first farmer if unlinked demo call
                f = db.query(Farmer).first()
                farmer_id = f.id if f else 1

            new_listing = HarvestListing(
                farmer_id=farmer_id,
                crop=s["temp_listing"].get("crop", "tomato"),
                quantity_kg=s["temp_listing"].get("quantity_kg", 200.0),
                quality=quality,
                harvest_date=s["temp_listing"].get("harvest_date", date.today() + timedelta(days=1)),
                source="ivr",
                created_by_id=s.get("user_id"),
            )
            db.add(new_listing)
            
            # Record SMS notification confirming registration
            db.add(Notification(
                user_id=s.get("user_id"),
                phone=s["phone"],
                channel="sms",
                type="ivr_registration",
                message=f"FarmPool AI: {new_listing.quantity_kg:.0f} kg {new_listing.crop.capitalize()} (Grade {quality}) registered via IVR. It is active for buyer pool matching.",
                status="sent",
            ))
            db.commit()

            crop_name = s["temp_listing"].get("crop", "tomato").capitalize()
            kg = s["temp_listing"].get("quantity_kg", 200.0)

            confirm_text = (
                f"অভিনন্দন! আপনার {kg:.0f} কেজি {crop_name} সফলভাবে ফার্মপুল এআই-তে সংরক্ষিত হয়েছে। এটি এখন ক্রেতাদের কাছে দৃশ্যমান। মূল মেনুতে ফিরতে * টিপুন, অথবা ফোন রাখতে পারেন।"
                if lang == "bn"
                else f"बधाई हो! आपकी {kg:.0f} किलो {crop_name} सफलतापूर्वक फार्मपूल एआई में दर्ज हो गई है। यह अब थोक खरीदारों और किसान समूह के लिए उपलब्ध है। मुख्य मेनू के लिए * दबाएं।"
                if lang == "hi"
                else f"Congratulations! Your {kg:.0f} kg of {crop_name} has been successfully registered in FarmPool AI. Press * to return to main menu or hang up."
            )

            s["state"] = "main_menu"
            return {
                "session_id": session_id,
                "state": "harvest_saved",
                "language": lang,
                "prompt_text": confirm_text,
                "options": [{"key": "*", "label": "* मुख्य मेनू (Main Menu)"}],
                "input_type": "single_digit",
                "call_status": "in_call",
                "saved_listing_id": new_listing.id,
            }

        # STATE: offer_decision
        if state == "offer_decision":
            pool_id = s.get("pending_pool_id")
            if digits == "1":
                # Farmer accepts offer via keypad
                TelephonyService._record_pool_response(s, pool_id, True, db)
                msg = (
                    "ধন্যবাদ! আপনি ক্রেতার যৌথ প্রস্তাব গ্রহণ করেছেন। গাড়ি রওনা হলে আপনাকে এসএমএস ও ফোন করা হবে। মূল মেনুতে ফিরতে * টিপুন।"
                    if lang == "bn"
                    else "धन्यवाद! आपने खरीदार का समूह आर्डर स्वीकार कर लिया है। वाहन पिकअप का समय आपको संदेश द्वारा भेजा जाएगा। मुख्य मेनू के लिए * दबाएं।"
                    if lang == "hi"
                    else "Thank you! You have accepted the buyer pool offer. Pickup details will be sent via SMS. Press * for main menu."
                )
            else:
                TelephonyService._record_pool_response(s, pool_id, False, db)
                msg = (
                    "আপনি প্রস্তাবটি প্রত্যাখ্যান করেছেন। আপনার ফসল পরবর্তী দলের জন্য উপলব্ধ থাকবে। মূল মেনুতে ফিরতে * টিপুন।"
                    if lang == "bn"
                    else "आपने यह आर्डर अस्वीकार कर दिया है। आपकी फसल अन्य खरीदारों के लिए उपलब्ध रहेगी। मुख्य मेनू के लिए * दबाएं।"
                    if lang == "hi"
                    else "You have declined this offer. Your harvest remains available for other pools. Press * for main menu."
                )

            s["state"] = "main_menu"
            return {
                "session_id": session_id,
                "state": "offer_decision_recorded",
                "language": lang,
                "prompt_text": msg,
                "options": [{"key": "*", "label": "* मुख्य मेनू (Main Menu)"}],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # Fallback to main menu
        s["state"] = "main_menu"
        menu_info = PROMPTS["main_menu"][lang]
        return {
            "session_id": session_id,
            "state": "main_menu",
            "language": lang,
            "prompt_text": menu_info["text"],
            "options": menu_info["options"],
            "input_type": "single_digit",
            "call_status": "in_call",
        }

    @staticmethod
    def _handle_offers_menu(s: Dict[str, Any], lang: str, db: Session) -> Dict[str, Any]:
        farmer_id = s.get("farmer_id")
        user_id = s.get("user_id")

        # Find active pool where this farmer is a member
        pool_membership = None
        if user_id:
            pool_membership = (
                db.query(PoolMember)
                .join(HarvestListing)
                .filter(HarvestListing.farmer_id == farmer_id)
                .join(FarmerPool)
                .filter(FarmerPool.status.in_(["Proposed", "Accepted"]))
                .order_by(FarmerPool.id.desc())
                .first()
            )

        if not pool_membership:
            # Check any proposed pool
            pool_membership = db.query(PoolMember).join(FarmerPool).filter(FarmerPool.status == "Proposed").first()

        if pool_membership:
            pool = db.get(FarmerPool, pool_membership.pool_id)
            req = db.get(BuyerRequirement, pool.requirement_id)
            listing = db.get(HarvestListing, pool_membership.listing_id)
            s["pending_pool_id"] = pool.id
            s["state"] = "offer_decision"

            prompt = (
                f"ক্রেতার প্রস্তাব: {req.buyer.org_name} আপনার {listing.crop} এর জন্য প্রতি কেজি ₹{req.price_min:.0f} থেকে ₹{req.price_max:.0f} দর দিচ্ছে। আপনার অংশ {pool_membership.kg_contributed:.0f} কেজি। এই প্রস্তাব গ্রহণ করতে ১ টিপুন, বা প্রত্যাখ্যান করতে ২ টিপুন।"
                if lang == "bn"
                else f"खरीदार का आर्डर: {req.buyer.org_name} आपके {listing.crop} के लिए ₹{req.price_min:.0f} से ₹{req.price_max:.0f} प्रति किलो का भाव दे रहे हैं। आपका हिस्सा {pool_membership.kg_contributed:.0f} किलो है। यह आर्डर स्वीकार करने के लिए १ दबाएं, अस्वीकार करने के लिए २ दबाएं।"
                if lang == "hi"
                else f"Buyer Offer: {req.buyer.org_name} offers ₹{req.price_min:.0f} to ₹{req.price_max:.0f} per kg for {listing.crop}. Your pooled share is {pool_membership.kg_contributed:.0f} kg. Press 1 to accept this offer, or 2 to decline."
            )
            return {
                "session_id": s["session_id"],
                "state": "offer_decision",
                "language": lang,
                "prompt_text": prompt,
                "options": [
                    {"key": "1", "label": "১. গ্রহণ করুন (Accept Offer)" if lang == "bn" else "१. स्वीकार करें (Accept)" if lang == "hi" else "1. Accept Offer"},
                    {"key": "2", "label": "২. প্রত্যাখ্যান করুন (Decline)" if lang == "bn" else "२. मना करें (Decline)" if lang == "hi" else "2. Decline Offer"},
                    {"key": "*", "label": "* মূল মেনু (Main Menu)" if lang == "bn" else "* मुख्य मेनू (Main Menu)" if lang == "hi" else "* Main Menu"},
                ],
                "input_type": "single_digit",
                "call_status": "in_call",
            }

        # No active pools found
        empty_text = (
            "বর্তমানে আপনার ফসলের জন্য কোনও উন্মুক্ত ক্রেতার প্রস্তাব নেই। নতুন প্রস্তাব এলে আমরা আপনাকে এসএমএস পাঠাব। মূল মেনুতে ফিরতে * টিপুন।"
            if lang == "bn"
            else "वर्तमान में आपकी फसल के लिए कोई खुला खरीदार आर्डर नहीं है। नया आर्डर आते ही आपको फोन या मैसेज भेजा जाएगा। मुख्य मेनू के लिए * दबाएं।"
            if lang == "hi"
            else "There are currently no active buyer offers for your harvest. We will notify you via SMS when a match is found. Press * for main menu."
        )
        return {
            "session_id": s["session_id"],
            "state": "main_menu",
            "language": lang,
            "prompt_text": empty_text,
            "options": [{"key": "*", "label": "* मुख्य मेनू (Main Menu)"}],
            "input_type": "single_digit",
            "call_status": "in_call",
        }

    @staticmethod
    def _handle_shipment_status(s: Dict[str, Any], lang: str, db: Session) -> Dict[str, Any]:
        msg = (
            "আপনার মাল পরিবহনের অবস্থা: সিঙ্গুর ও পার্শ্ববর্তী গ্রামে আগামীকালের পিকআপ নির্ধারিত আছে। সমস্ত চালানের অবস্থা সন্তোষজনক। মূল মেনুতে ফিরতে * টিপুন।"
            if lang == "bn"
            else "वाहन व माल की स्थिति: सिंगूर और आसपास के गांवों में कल सुबह साझा पिकअप निर्धारित है। आर्डर सक्रिय है। मुख्य मेनू के लिए * दबाएं।"
            if lang == "hi"
            else "Shipment Status: Shared pickup vehicle is scheduled for tomorrow morning across Singur cluster. Status is confirmed. Press * for main menu."
        )
        return {
            "session_id": s["session_id"],
            "state": "main_menu",
            "language": lang,
            "prompt_text": msg,
            "options": [{"key": "*", "label": "* मुख्य मेनू (Main Menu)"}],
            "input_type": "single_digit",
            "call_status": "in_call",
        }

    @staticmethod
    def _handle_coordinator_request(s: Dict[str, Any], lang: str, db: Session) -> Dict[str, Any]:
        # Record coordinator callback request in notification table
        db.add(Notification(
            user_id=s.get("user_id"),
            phone="9000000099",  # Coordinator's phone
            channel="sms",
            type="coordinator_callback_request",
            message=f"FarmPool Alert: Farmer {s.get('farmer_name')} ({s.get('phone')}) requested coordinator assistance via IVR keypad.",
            status="sent",
        ))
        db.commit()

        msg = (
            "আপনার গ্রাম সমন্বয়ক হলেন হরিশ কুমার, ফোন ৯০০০০০০০৯৯। আপনার অনুরোধ নথিভুক্ত হয়েছে। তিনি শীঘ্রই আপনার সাথে যোগাযোগ করবেন। মূল মেনুতে ফিরতে * টিপুন।"
            if lang == "bn"
            else "आपके ग्राम समन्वयक हरीश कुमार हैं, फोन ९०००००००९९। आपका सहायता अनुरोध दर्ज कर लिया गया है। वे जल्द ही आपसे संपर्क करेंगे। मुख्य मेनू के लिए * दबाएं।"
            if lang == "hi"
            else "Your village coordinator is Harish Kumar, phone 9000000099. We have recorded your request, and the coordinator will contact you shortly. Press * for main menu."
        )
        return {
            "session_id": s["session_id"],
            "state": "main_menu",
            "language": lang,
            "prompt_text": msg,
            "options": [{"key": "*", "label": "* मुख्य मेनू (Main Menu)"}],
            "input_type": "single_digit",
            "call_status": "in_call",
        }

    @staticmethod
    def _record_pool_response(s: Dict[str, Any], pool_id: Optional[int], accept: bool, db: Session):
        if not pool_id:
            return
        pool = db.get(FarmerPool, pool_id)
        if not pool:
            return
        user_id = s.get("user_id")
        
        # Find membership for this farmer or first matching member in pool
        members = db.query(PoolMember).filter_by(pool_id=pool_id).all()
        target_members = [m for m in members if db.get(HarvestListing, m.listing_id).farmer.user_id == user_id]
        if not target_members and members:
            target_members = [members[0]]

        for m in target_members:
            m.accepted = accept
            m.consent_mode = "ivr_keypad"
            m.responded_by_id = user_id

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
