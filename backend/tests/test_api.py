from conftest import login

def test_flow_and_rbac(client):
    c = client
    assert c.get("/api/health").json()["ok"]
    buyer, farmer = login(c, "9000000100", "buyer123"), login(c, "9000000001", "farmer123")
    r = c.get("/api/requirements/1/pool-preview", headers=buyer).json()
    assert r["feasible"] and r["total_kg"] == 1000
    assert c.get("/api/requirements/1/pool-preview", headers=farmer).status_code == 403
    assert c.get("/api/requirements/1/pool-preview").status_code == 401
    assert len(c.get("/api/listings", headers=farmer).json()) == 1
    bad = c.post("/api/auth/register", json={"name": "X Y", "phone": "123", "password": "abcdef", "role": "farmer"})
    assert bad.status_code == 422
