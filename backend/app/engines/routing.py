"""Pickup route optimisation with Google OR-Tools (capacitated VRP, open start, end at buyer).

Distances: live OSRM road matrix when OSRM_URL is set and reachable; otherwise a clearly
labelled offline ESTIMATE (haversine x 1.3). The objective is rupees (per-km cost + fixed
vehicle cost), so with a mixed fleet the solver also chooses which vehicles to use."""
from dataclasses import dataclass, field
from itertools import chain
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from .geo import road_km

@dataclass
class Stop:
    id: int; lat: float; lng: float; kg: float

@dataclass
class VehicleRoute:
    vehicle_id: int; vehicle_name: str; stop_ids: list[int]; load_kg: float
    distance_km: float; cost: float; leg_km: list[float]  # leg_km: stop->stop..., last leg -> buyer

@dataclass
class RouteResult:
    feasible: bool
    routes: list[VehicleRoute] = field(default_factory=list)
    total_km: float = 0.0
    total_cost: float = 0.0
    distance_source: str = "estimate"
    reason: str = ""

def _osrm_matrix(points, url):
    """Road distances in metres via OSRM /table; None on any failure (caller falls back)."""
    try:
        import httpx
        coords = ";".join(f"{lng},{lat}" for lat, lng in points)
        r = httpx.get(f"{url.rstrip('/')}/table/v1/driving/{coords}", params={"annotations": "distance"}, timeout=4)
        r.raise_for_status()
        m = r.json().get("distances")
        if not m or any(v is None for row in m for v in row): return None
        return m
    except Exception:
        return None

def matrix_m(points, osrm_url: str = "") -> tuple[list[list[float]], str]:
    if osrm_url:
        m = _osrm_matrix(points, osrm_url)
        if m: return m, "OSRM road network"
    return [[road_km(a, b) * 1000 for b in points] for a in points], "estimate (straight-line x 1.3, not live routing)"

def optimise(stops: list[Stop], dest: tuple[float, float], fleet: list[dict],
             osrm_url: str = "", time_limit_s: int = 1) -> RouteResult:
    if not stops: return RouteResult(False, reason="No pickup stops.")
    n = len(stops)
    pts = [(s.lat, s.lng) for s in stops] + [dest]           # matrix index i -> pts[i-1] for pickups, n+1 = buyer
    base, source = matrix_m(pts, osrm_url)
    N = n + 2                                                  # 0 = virtual start (free), 1..n pickups, n+1 buyer
    d = [[0.0] * N for _ in range(N)]
    for i in range(1, N):
        for j in range(1, N): d[i][j] = base[i - 1][j - 1]
    # row 0 stays 0: the vehicle may start at any pickup at no cost
    demand = [0] + [int(round(s.kg)) for s in stops] + [0]
    mgr = pywrapcp.RoutingIndexManager(N, len(fleet), [0] * len(fleet), [n + 1] * len(fleet))
    rt = pywrapcp.RoutingModel(mgr)
    for k, v in enumerate(fleet):
        per_m = v["cost_per_km"] * 100 / 1000                  # paise per metre
        cb = rt.RegisterTransitCallback(lambda a, b, per_m=per_m: int(d[mgr.IndexToNode(a)][mgr.IndexToNode(b)] * per_m))
        rt.SetArcCostEvaluatorOfVehicle(cb, k)
        rt.SetFixedCostOfVehicle(int(v["base_cost"] * 100), k)
    dcb = rt.RegisterUnaryTransitCallback(lambda i: demand[mgr.IndexToNode(i)])
    rt.AddDimensionWithVehicleCapacity(dcb, 0, [int(v["capacity_kg"]) for v in fleet], True, "load")
    p = pywrapcp.DefaultRoutingSearchParameters()
    p.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    p.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    p.time_limit.FromSeconds(time_limit_s)
    sol = rt.SolveWithParameters(p)
    if not sol:
        return RouteResult(False, distance_source=source, reason=(
            f"No assignment fits: {sum(demand):.0f} kg across vehicles with capacities "
            f"{[v['capacity_kg'] for v in fleet]} kg."))
    res = RouteResult(True, distance_source=source)
    for k, v in enumerate(fleet):
        idx, nodes = rt.Start(k), []
        while not rt.IsEnd(idx):
            idx = sol.Value(rt.NextVar(idx)); nodes.append(mgr.IndexToNode(idx))
        nodes = [x for x in nodes if 1 <= x <= n]
        if not nodes: continue
        seq = nodes + [n + 1]
        legs = [d[a][b] / 1000 for a, b in zip(seq, seq[1:])]
        km = sum(legs); cost = v["base_cost"] + v["cost_per_km"] * km
        res.routes.append(VehicleRoute(v["id"], v["name"], [stops[i - 1].id for i in nodes],
                                       sum(stops[i - 1].kg for i in nodes), round(km, 1), round(cost, 2), [round(x, 1) for x in legs]))
    res.total_km = round(sum(r.distance_km for r in res.routes), 1)
    res.total_cost = round(sum(r.cost for r in res.routes), 2)
    return res
