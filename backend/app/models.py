"""Schema. Locations are lat/lng floats (haversine in engines); on PostgreSQL the
PostGIS extension is enabled in db/init.sql for future spatial queries."""
import enum
from datetime import datetime, date
from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class Role(str, enum.Enum):
    farmer = "farmer"; buyer = "buyer"; admin = "admin"

class OrderStatus(str, enum.Enum):
    open = "Open"; matching = "Matching"; pool_proposed = "Pool Proposed"
    awaiting = "Awaiting Confirmation"; confirmed = "Confirmed"
    in_transit = "In Transit"; delivered = "Delivered"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

class Farmer(Base):
    __tablename__ = "farmers"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    village: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    user: Mapped[User] = relationship()

class Buyer(Base):
    __tablename__ = "buyers"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    org_name: Mapped[str] = mapped_column(String(160))
    user: Mapped[User] = relationship()

class HarvestListing(Base):
    __tablename__ = "harvest_listings"
    id: Mapped[int] = mapped_column(primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"))
    crop: Mapped[str] = mapped_column(String(60))
    quantity_kg: Mapped[float] = mapped_column(Float)
    quality: Mapped[str] = mapped_column(String(1))  # A best, B, C
    harvest_date: Mapped[date] = mapped_column(Date)
    preferred_sell_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    committed: Mapped[bool] = mapped_column(Boolean, default=False)
    farmer: Mapped[Farmer] = relationship()

class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"
    id: Mapped[int] = mapped_column(primary_key=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id"))
    crop: Mapped[str] = mapped_column(String(60))
    quantity_kg: Mapped[float] = mapped_column(Float)
    min_quality: Mapped[str] = mapped_column(String(1))
    price_min: Mapped[float] = mapped_column(Float)  # Rs/kg
    price_max: Mapped[float] = mapped_column(Float)
    dest_lat: Mapped[float] = mapped_column(Float)
    dest_lng: Mapped[float] = mapped_column(Float)
    dest_name: Mapped[str] = mapped_column(String(160))
    deadline: Mapped[date] = mapped_column(Date)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.open)
    buyer: Mapped[Buyer] = relationship()

class MandiPrice(Base):
    __tablename__ = "mandi_prices"
    id: Mapped[int] = mapped_column(primary_key=True)
    market: Mapped[str] = mapped_column(String(120))
    crop: Mapped[str] = mapped_column(String(60))
    price_per_kg: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    commission_pct: Mapped[float] = mapped_column(Float, default=4.0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)

class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    capacity_kg: Mapped[float] = mapped_column(Float)
    cost_per_km: Mapped[float] = mapped_column(Float)
    base_cost: Mapped[float] = mapped_column(Float, default=0)

class FarmerPool(Base):
    __tablename__ = "farmer_pools"
    id: Mapped[int] = mapped_column(primary_key=True)
    requirement_id: Mapped[int] = mapped_column(ForeignKey("buyer_requirements.id"))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    total_kg: Mapped[float] = mapped_column(Float, default=0)
    score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(40), default="Proposed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PoolMember(Base):
    __tablename__ = "pool_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    pool_id: Mapped[int] = mapped_column(ForeignKey("farmer_pools.id"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("harvest_listings.id"))
    kg_contributed: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(500), default="")
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

class TransportRoute(Base):
    __tablename__ = "transport_routes"
    id: Mapped[int] = mapped_column(primary_key=True)
    pool_id: Mapped[int] = mapped_column(ForeignKey("farmer_pools.id"))
    stop_order_json: Mapped[str] = mapped_column(String(2000))
    distance_km: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float)

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    requirement_id: Mapped[int] = mapped_column(ForeignKey("buyer_requirements.id"))
    pool_id: Mapped[int] = mapped_column(ForeignKey("farmer_pools.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.awaiting)

class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.confirmed)

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"))
    gross: Mapped[float] = mapped_column(Float)
    deductions: Mapped[float] = mapped_column(Float)
    net: Mapped[float] = mapped_column(Float)
    note: Mapped[str] = mapped_column(String(200), default="Estimate - no payment gateway integrated")
