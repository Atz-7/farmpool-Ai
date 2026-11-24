"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { J } from "@/lib/api";

export default function RouteMap({ route }: { route: J }) {
  const stops: J[] = route.stops;
  const dest: LatLngTuple = [route.destination.lat, route.destination.lng];
  const line: LatLngTuple[] = [...stops.map((s): LatLngTuple => [s.lat, s.lng]), dest];
  return (
    <MapContainer bounds={line as LatLngBoundsExpression} boundsOptions={{ padding: [30, 30] }} className="h-80 w-full rounded-lg md:h-96" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={line} pathOptions={{ color: "#3d7230", weight: 4 }} />
      {stops.map((s) => (
        <CircleMarker key={s.seq} center={[s.lat, s.lng]} radius={11} pathOptions={{ color: "#305a27", fillColor: "#4c8a3a", fillOpacity: 1 }}>
          <Tooltip permanent direction="center" className="!border-0 !bg-transparent !p-0 !text-white !shadow-none">{s.seq}</Tooltip>
          <Tooltip direction="top">{s.farmer} · {s.village} · {s.kg} kg</Tooltip>
        </CircleMarker>))}
      <CircleMarker center={dest} radius={12} pathOptions={{ color: "#6b4f2a", fillColor: "#b45309", fillOpacity: 1 }}>
        <Tooltip direction="top">{route.destination.name} (buyer)</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
