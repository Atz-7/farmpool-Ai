"""MandiMind + Farmer Profit Simulator. Deterministic arithmetic only (no LLM).
Net Earnings = Revenue - Transport - Commission - Handling - Other.
All rates below are ASSUMPTIONS for the demo and are returned with every result."""
from dataclasses import dataclass, asdict
from .geo import road_km

HANDLING_PER_KG = 1.0       # Rs/kg loading, crates, weighing (assumption)
PLATFORM_FEE_PCT = 2.0      # FarmPool service fee on pooled sales (assumption)
ASSUMPTIONS = {"handling_per_kg": HANDLING_PER_KG, "platform_fee_pct": PLATFORM_FEE_PCT,
               "prices": "DEMO data, not live mandi/e-NAM prices",
               "pooled_price": "buyer's minimum offered price (conservative); not guaranteed",
               "transport": "estimated road distance = 1.3 x straight line"}

@dataclass
class Breakdown:
    label: str
    kg: float
    price_per_kg: float
    revenue: float
    transport: float
    commission: float
    handling: float
    other: float
    net: float
    def to_dict(self): return asdict(self)

def net_earnings(label, kg, price, transport, commission_pct=0.0, handling_per_kg=HANDLING_PER_KG, other=0.0) -> Breakdown:
    revenue = kg * price
    commission = revenue * commission_pct / 100
    handling = kg * handling_per_kg
    net = revenue - transport - commission - handling - other
    return Breakdown(label, kg, price, round(revenue, 2), round(transport, 2), round(commission, 2),
                     round(handling, 2), round(other, 2), round(net, 2))

def solo_transport(kg, distance_km, vehicles) -> float:
    """Cheapest single vehicle that fits the farmer's own quantity, hired just for them."""
    fit = [v for v in vehicles if v["capacity_kg"] >= kg]
    if not fit: return float("inf")
    return min(v["base_cost"] + v["cost_per_km"] * distance_km for v in fit)

def mandi_options(kg, origin, mandis, vehicles) -> list[Breakdown]:
    """Individual-selling options, one per mandi, ranked by NET (not by headline price)."""
    out = []
    for m in mandis:
        d = road_km(origin, (m["lat"], m["lng"]))
        out.append(net_earnings(m["market"], kg, m["price_per_kg"], solo_transport(kg, d, vehicles),
                                m["commission_pct"]))
    return sorted(out, key=lambda b: b.net, reverse=True)

def pooled_share(kg, price, pool_transport, pool_total_kg) -> Breakdown:
    share = pool_transport * kg / pool_total_kg  # allocated by kg contributed
    return net_earnings("FarmPool (shared shipment)", kg, price, share, PLATFORM_FEE_PCT)

def compare(kg, origin, mandis, vehicles, price_lo, price_hi, pool_transport, pool_total_kg) -> dict:
    opts = mandi_options(kg, origin, mandis, vehicles)
    solo = opts[0] if opts else None
    pooled = pooled_share(kg, price_lo, pool_transport, pool_total_kg)
    upside = pooled_share(kg, price_hi, pool_transport, pool_total_kg)
    out = {"individual_best": solo.to_dict() if solo else None, "individual_all": [o.to_dict() for o in opts],
           "pooled": pooled.to_dict(), "pooled_if_buyer_pays_max": upside.net, "assumptions": ASSUMPTIONS}
    if solo:
        d = round(pooled.net - solo.net, 2)
        out["difference"] = d
        out["explanation"] = [
            f"Revenue: {pooled.price_per_kg:.2f} vs {solo.price_per_kg:.2f} Rs/kg -> {pooled.revenue - solo.revenue:+.2f}",
            f"Transport: shared {pooled.transport:.2f} vs solo {solo.transport:.2f} -> {solo.transport - pooled.transport:+.2f} saved",
            f"Commission/fees: {pooled.commission:.2f} vs {solo.commission:.2f} -> {solo.commission - pooled.commission:+.2f}",
            f"Handling: {pooled.handling:.2f} vs {solo.handling:.2f}",
            "Estimate only: depends on the buyer's final price and actual route; not guaranteed."]
    return out
