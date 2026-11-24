// Pure geometry for the 3D pool view. Schematic only: straight legs between stops, not road geometry.
export type Pt = { lat: number; lng: number };
export type P2 = { x: number; z: number };

/** Equirectangular projection around the centroid, scaled so the widest extent is `size` scene units. */
export function project(stops: Pt[], dest: Pt, size = 10) {
  const all = [...stops, dest];
  const lat0 = all.reduce((a, p) => a + p.lat, 0) / all.length;
  const lng0 = all.reduce((a, p) => a + p.lng, 0) / all.length;
  const km = (p: Pt): P2 => ({ x: (p.lng - lng0) * 111.32 * Math.cos((lat0 * Math.PI) / 180), z: -(p.lat - lat0) * 110.57 });
  const raw = all.map(km);
  const ext = Math.max(...raw.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z))), 1e-6);
  const k = size / 2 / ext;
  const sc = raw.map((p) => ({ x: p.x * k, z: p.z * k }));
  return { stops: sc.slice(0, -1), dest: sc[sc.length - 1], kmPerUnit: 1 / k };
}

export function cumulative(path: P2[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  return out;
}

export function positionAt(path: P2[], cum: number[], d: number): P2 {
  const total = cum[cum.length - 1];
  const t = Math.min(Math.max(d, 0), total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < t) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const f = (t - cum[i - 1]) / seg;
  return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * f, z: path[i - 1].z + (path[i].z - path[i - 1].z) * f };
}

/** Number of pickups the truck has reached at distance d (path = stops..., dest). */
export const stopsReached = (cum: number[], d: number, nStops: number) => cum.slice(0, nStops).filter((c) => c <= d + 1e-9).length;
