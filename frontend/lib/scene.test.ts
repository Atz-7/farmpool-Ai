import assert from "node:assert/strict";
import { project, cumulative, positionAt, stopsReached } from "./scene";

const stops = [{ lat: 22.81, lng: 88.23 }, { lat: 22.98, lng: 88.05 }, { lat: 23.0, lng: 88.44 }];
const dest = { lat: 22.5726, lng: 88.3639 };
const s = project(stops, dest, 10);
// everything fits inside the +-5 box and north is -z
assert.ok([...s.stops, s.dest].every((p) => Math.abs(p.x) <= 5.0001 && Math.abs(p.z) <= 5.0001));
assert.ok(s.stops[2].z < s.dest.z, "stop north of buyer must have smaller z");
assert.ok(s.stops[1].x < s.stops[2].x, "west of east must have smaller x");
// ~ real distance recovered from scene units (stop0 -> stop1 straight line ~ 26.3 km (independent haversine))
const d01 = Math.hypot(s.stops[0].x - s.stops[1].x, s.stops[0].z - s.stops[1].z) * s.kmPerUnit;
assert.ok(Math.abs(d01 - 26.3) < 0.5, `distance ${d01}`);
const path = [...s.stops, s.dest]; const cum = cumulative(path);
const a = positionAt(path, cum, 0), b = positionAt(path, cum, 1e9);
assert.deepEqual([a.x, a.z], [path[0].x, path[0].z]);
assert.ok(Math.hypot(b.x - s.dest.x, b.z - s.dest.z) < 1e-9);
const mid = positionAt(path, cum, cum[1] / 2);
assert.ok(Math.abs(mid.x - (path[0].x + path[1].x) / 2) < 1e-9);
assert.equal(stopsReached(cum, 0, 3), 1); assert.equal(stopsReached(cum, cum[2], 3), 3); assert.equal(stopsReached(cum, cum[1] - 0.01, 3), 1);
console.log("scene tests passed");
