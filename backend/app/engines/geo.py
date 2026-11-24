from math import radians, sin, cos, asin, sqrt

ROAD_FACTOR = 1.3  # ESTIMATE: road distance ~ 1.3x straight line when live routing is unavailable

def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (*a, *b))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(h))

def road_km(a, b) -> float:
    return haversine_km(a, b) * ROAD_FACTOR
