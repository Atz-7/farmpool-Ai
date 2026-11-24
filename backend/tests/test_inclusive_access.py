"""Tests for FarmPool AI Inclusive Farmer Access:
1. Feature Phone IVR Simulation
2. Village Coordinator Portal
3. SMS Notification Simulation
4. Offline Deduplication
"""
from datetime import date, timedelta
from conftest import login

def test_ivr_full_harvest_registration_flow(client):
    c = client
    # 1. Initiate call to Ramesh Das (9000000001)
    init_res = c.post("/api/ivr/call/initiate", json={"phone": "9000000001"})
    assert init_res.status_code == 200
    data = init_res.json()
    session_id = data["session_id"]
    assert data["state"] == "welcome_lang"
    assert "বাংলা" in data["prompt_text"]

    # 2. Select language: 1 for Bengali
    step1 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "1"}).json()
    assert step1["state"] == "main_menu"
    assert step1["language"] == "bn"

    # 3. Select 1 to register harvest
    step2 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "1"}).json()
    assert step2["state"] == "crop_select"
    assert "টমেটো" in step2["prompt_text"]

    # 4. Select 1 for Tomatoes
    step3 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "1"}).json()
    assert step3["state"] == "quantity_input"

    # 5. Enter 200# for 200 kg
    step4 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "200#"}).json()
    assert step4["state"] == "ready_date"

    # 6. Select 2 for Tomorrow
    step5 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "2"}).json()
    assert step5["state"] == "quality_grade"

    # 7. Select 1 for Grade A
    step6 = c.post("/api/ivr/input", json={"session_id": session_id, "digits": "1"}).json()
    assert step6["state"] == "harvest_saved"
    assert "সফলভাবে" in step6["prompt_text"]
    assert "saved_listing_id" in step6

    # Verify listing appears in farmer's listings with source="ivr"
    f_auth = login(c, "9000000001", "farmer123")
    listings = c.get("/api/listings", headers=f_auth).json()
    saved = [l for l in listings if l["id"] == step6["saved_listing_id"]]
    assert len(saved) == 1
    assert saved[0]["quantity_kg"] == 200
    assert saved[0]["source"] == "ivr"

def test_ivr_pool_offer_acceptance(client):
    c = client
    buyer = login(c, "9000000100", "buyer123")
    # Propose pool for requirement 1
    p = c.post("/api/requirements/1/propose-pool", headers=buyer).json()
    assert p["feasible"]
    pid = p["pool_id"]

    # Ramesh (9000000001) calls IVR
    init_res = c.post("/api/ivr/call/initiate", json={"phone": "9000000001"}).json()
    sid = init_res["session_id"]

    # Select 2 for Hindi
    c.post("/api/ivr/input", json={"session_id": sid, "digits": "2"})
    # Select 2 to hear buyer offers
    offers_step = c.post("/api/ivr/input", json={"session_id": sid, "digits": "2"}).json()
    assert offers_step["state"] == "offer_decision"
    assert "₹24" in offers_step["prompt_text"] or "खरीदार" in offers_step["prompt_text"]

    # Press 1 to accept offer
    accept_step = c.post("/api/ivr/input", json={"session_id": sid, "digits": "1"}).json()
    assert accept_step["state"] == "offer_decision_recorded"
    assert "स्वीकार" in accept_step["prompt_text"]

    # Verify pool profit shows accepted=True for Ramesh
    prof = c.get(f"/api/pools/{pid}/profit", headers=buyer).json()
    ramesh_row = [f for f in prof["farmers"] if "Ramesh" in f["farmer"]][0]
    assert ramesh_row["accepted"] is True

def test_coordinator_workflow(client):
    c = client
    coord = login(c, "9000000099", "coord123")

    # 1. Summary
    summ = c.get("/api/coordinator/summary", headers=coord).json()
    assert summ["total_farmers"] >= 5
    assert summ["coordinator_name"] == "Harish Kumar (Coordinator)"

    # 2. Register an assisted farmer with no personal phone
    reg_res = c.post("/api/coordinator/farmers", json={
        "name": "Manoj Roy (No phone)",
        "village": "Singur",
        "lat": 22.815,
        "lng": 88.230,
        "phone_type": "no_phone",
        "preferred_language": "bn"
    }, headers=coord).json()
    assert reg_res["success"]
    farmer_id = reg_res["farmer_id"]

    # 3. Add harvest listing on his behalf
    list_res = c.post("/api/coordinator/listings", json={
        "farmer_id": farmer_id,
        "crop": "potato",
        "quantity_kg": 150,
        "quality": "B",
        "harvest_date": str(date.today() + timedelta(days=1)),
        "consent_mode": "verbal_in_person"
    }, headers=coord).json()
    assert list_res["success"]
    assert list_res["source"] == "coordinator"

    # Check listings API
    admin = login(c, "9999999999", "admin123")
    all_l = c.get("/api/listings", headers=admin).json()
    m_listing = [l for l in all_l if l["id"] == list_res["listing_id"]][0]
    assert m_listing["source"] == "coordinator"
    assert m_listing["farmer"] == "Manoj Roy (No phone)"

def test_sms_notification_and_inbound_reply(client):
    c = client
    buyer = login(c, "9000000100", "buyer123")
    p = c.post("/api/requirements/1/propose-pool", headers=buyer).json()
    pid = p["pool_id"]

    # Verify SMS notifications were created for Ramesh (9000000001)
    notifs = c.get("/api/notifications?phone=9000000001").json()
    assert len(notifs) >= 1
    offer_notif = [n for n in notifs if n["type"] == "buyer_offer"][0]
    assert "Reply 1 to accept" in offer_notif["message"]

    # Simulate inbound SMS reply '1'
    reply_res = c.post("/api/notifications/simulate-reply", json={
        "notification_id": offer_notif["id"],
        "reply_text": "1"
    }).json()
    assert reply_res["success"]
    assert reply_res["accepted"] is True

    # Check pool response was recorded
    prof = c.get(f"/api/pools/{pid}/profit", headers=buyer).json()
    ramesh_entry = [f for f in prof["farmers"] if "Ramesh" in f["farmer"]][0]
    assert ramesh_entry["accepted"] is True

def test_offline_listing_deduplication(client):
    c = client
    f = login(c, "9000000001", "farmer123")
    req_id = "offline_sync_test_uuid_12345"

    # First submission
    body = {
        "crop": "tomato",
        "quantity_kg": 180,
        "quality": "A",
        "harvest_date": str(date.today() + timedelta(days=1)),
        "client_request_id": req_id,
        "source": "offline"
    }
    res1 = c.post("/api/listings", json=body, headers=f).json()
    assert "id" in res1
    listing_id = res1["id"]

    # Duplicate submission with same client_request_id
    res2 = c.post("/api/listings", json=body, headers=f).json()
    assert res2["id"] == listing_id
    assert res2.get("deduplicated") is True
