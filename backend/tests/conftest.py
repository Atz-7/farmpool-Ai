import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
import pytest
from fastapi.testclient import TestClient

@pytest.fixture()
def client():
    from app.db import Base, engine
    from app.main import app
    Base.metadata.drop_all(engine)  # fresh seeded DB for every test
    with TestClient(app) as c:      # lifespan recreates tables + seed
        yield c

def login(c, phone, pw):
    t = c.post("/api/auth/login", data={"username": phone, "password": pw}).json()["access_token"]
    return {"Authorization": "Bearer " + t}
