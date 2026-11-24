from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^\d{10}$")
    password: str = Field(min_length=6)
    role: Literal["farmer", "buyer"]  # admin accounts are seeded only
    village: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    org_name: str | None = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class ListingIn(BaseModel):
    crop: str
    quantity_kg: float = Field(gt=0, le=100000)
    quality: Literal["A", "B", "C"]
    harvest_date: date
    preferred_sell_date: date | None = None

class RequirementIn(BaseModel):
    crop: str = Field(min_length=2)
    quantity_kg: float = Field(gt=0, le=100000)
    min_quality: Literal["A", "B", "C"]
    price_min: float = Field(ge=0)
    price_max: float = Field(ge=0)
    dest_name: str = Field(min_length=2)
    dest_lat: float = Field(ge=-90, le=90)
    dest_lng: float = Field(ge=-180, le=180)
    deadline: date

    @model_validator(mode="after")
    def _check(self):
        if self.price_max < self.price_min: raise ValueError("price_max must be >= price_min")
        if self.deadline < date.today(): raise ValueError("deadline cannot be in the past")
        return self

class ParseIn(BaseModel):
    text: str = Field(min_length=3, max_length=500)
