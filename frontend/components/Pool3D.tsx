"use client";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import type { Mesh } from "three";
import { J } from "@/lib/api";
import { project, cumulative, positionAt, stopsReached } from "@/lib/scene";

function Truck({ path, cum, playing, onDone, onReach, reset }: { path: { x: number; z: number }[]; cum: number[]; playing: boolean; onDone: () => void; onReach: (n: number) => void; reset: number }) {
  const ref = useRef<Mesh>(null);
  const d = useRef(0); const last = useRef(-1); const seen = useRef(reset);
  const total = cum[cum.length - 1];
  useFrame((_, dt) => {
    if (seen.current !== reset) { seen.current = reset; d.current = 0; last.current = -1; }
    if (playing) { d.current = Math.min(total, d.current + (total / 9) * Math.min(dt, 0.05)); if (d.current >= total) onDone(); }
    const p = positionAt(path, cum, d.current);
    ref.current?.position.set(p.x, 0.22, p.z);
    const n = stopsReached(cum, d.current, path.length - 1);
    if (n !== last.current) { last.current = n; onReach(n); }
  });
  return <mesh ref={ref} castShadow><boxGeometry args={[0.5, 0.3, 0.28]} /><meshStandardMaterial color="#1c1917" /></mesh>;
}

export default function Pool3D({ route }: { route: J }) {
  const stops: J[] = route.stops;
  const { stops: sp, dest } = useMemo(() => project(stops, { lat: route.destination.lat, lng: route.destination.lng }, 10), [stops, route]);
  const path = useMemo(() => [...sp, dest], [sp, dest]);
  const cum = useMemo(() => cumulative(path), [path]);
  const maxKg = Math.max(...stops.map((s) => s.kg));
  const [playing, setPlaying] = useState(false);
  const [reached, setReached] = useState(0);
  const [reset, setReset] = useState(0);
  const loaded = stops.slice(0, reached).reduce((a, s) => a + s.kg, 0);
  const total = stops.reduce((a, s) => a + s.kg, 0);
  return (
    <div>
      <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gradient-to-b from-sky-100 to-brand-50 md:h-[28rem]">
        <Canvas camera={{ position: [0, 8, 11], fov: 45 }} shadows>
          <ambientLight intensity={0.7} /><directionalLight position={[6, 10, 4]} intensity={1.1} castShadow />
          <gridHelper args={[14, 14, "#a8a29e", "#d6d3d1"]} />
          <Line points={path.map((p) => [p.x, 0.04, p.z] as [number, number, number])} color="#3d7230" lineWidth={3} />
          {sp.map((p, i) => { const h = 0.4 + (stops[i].kg / maxKg) * 1.6; return (
            <group key={i} position={[p.x, 0, p.z]}>
              <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, h, 24]} /><meshStandardMaterial color={i < reached ? "#305a27" : "#4c8a3a"} /></mesh>
              <Html position={[0, h + 0.35, 0]} center distanceFactor={9}><div className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[11px] shadow">{i + 1}. {stops[i].farmer.replace(" (demo)", "")} · {stops[i].kg} kg</div></Html>
            </group>); })}
          <group position={[dest.x, 0, dest.z]}>
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.9, 1, 0.9]} /><meshStandardMaterial color="#b45309" /></mesh>
            <Html position={[0, 1.4, 0]} center distanceFactor={9}><div className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[11px] shadow">Buyer · {route.destination.name}</div></Html>
          </group>
          <Truck path={path} cum={cum} playing={playing} reset={reset} onDone={() => setPlaying(false)} onReach={setReached} />
          <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={20} />
        </Canvas>
        <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">Load: {loaded} / {total} kg</div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => setPlaying((p) => !p)} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white">{playing ? "Pause" : reached > 0 ? "Resume pickup run" : "Play pickup run"}</button>
        <button onClick={() => { setPlaying(false); setReset((r) => r + 1); }} className="h-10 rounded-lg border border-stone-300 px-4 text-sm">Reset</button>
        <span className="text-xs text-stone-500">Drag to rotate, scroll to zoom. Schematic view: straight legs, pillar height = kg. Not road geometry.</span>
      </div>
    </div>
  );
}
