"""Harvest Window Intelligence. All numbers are configurable ASSUMPTIONS, not guaranteed shelf life."""
from dataclasses import dataclass
from datetime import date, timedelta

@dataclass(frozen=True)
class CropProfile:
    max_hold_days: int      # assumed max days between harvest and pickup before quality risk
    max_transit_hours: int  # assumed max sensible transit time

CROP_PROFILES = {
    "tomato": CropProfile(max_hold_days=2, max_transit_hours=12),
    "potato": CropProfile(max_hold_days=10, max_transit_hours=36),
    "onion": CropProfile(max_hold_days=14, max_transit_hours=36),
    "spinach": CropProfile(max_hold_days=1, max_transit_hours=8),
}
DEFAULT_PROFILE = CropProfile(max_hold_days=3, max_transit_hours=16)
AVG_SPEED_KMPH = 30  # ESTIMATE incl. stops

def profile(crop: str) -> CropProfile:
    return CROP_PROFILES.get(crop.lower(), DEFAULT_PROFILE)

def transit_days(distance_km: float) -> int:
    hours = distance_km / AVG_SPEED_KMPH
    return 0 if hours <= 12 else int(hours // 24) + 1

def check_ship_date(crop: str, harvest_date: date, ship_date: date) -> tuple[bool, str]:
    """Can a listing harvested on harvest_date join a pickup on ship_date?"""
    p = profile(crop)
    if harvest_date > ship_date:
        return False, f"harvest ready {harvest_date}, after pickup {ship_date}"
    wait = (ship_date - harvest_date).days
    if wait > p.max_hold_days:
        return False, f"would wait {wait}d after harvest; assumed limit for {crop} is {p.max_hold_days}d"
    return True, f"ready {wait}d before pickup (assumed hold limit {p.max_hold_days}d)"

def meets_deadline(ship_date: date, deadline: date, route_km: float) -> bool:
    return ship_date + timedelta(days=transit_days(route_km)) <= deadline
