"use client";
import { useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, J } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Btn, Err, Loading, Badge } from "@/components/ui";

export default function Admin() {
  const s = useRole(["admin"]);
  const d = useLoad<J>(s ? "/admin/summary" : null);
  const pools = useLoad<J[]>(s ? "/pools" : null);
  const [err, setErr] = useState("");
  const advance = async (id: number) => { try { await api(`/shipments/${id}/advance`, { method: "POST" }); d.reload(); } catch (e) { setErr((e as Error).message); } };
  if (!s || d.loading) return <Loading />;
  const x = d.data; if (!x) return <Err msg={d.error} />;
  const Stat = ({ k, v }: { k: string; v: string | number }) => <Card><p className="text-sm text-stone-500">{k}</p><p className="text-2xl font-bold text-brand-700">{v}</p></Card>;
  return (
    <div className="space-y-5"><h1 className="text-2xl font-bold">Logistics control</h1><Err msg={err} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat k="Farmers" v={x.farmers.length} /><Stat k="Buyers" v={x.buyers.length} /><Stat k="Listed produce (kg)" v={x.total_listed_kg} /><Stat k="Aggregated & confirmed (kg)" v={x.total_aggregated_kg} /><Stat k="Active pools" v={x.active_pools} />
      </div>
      <Card title="Produce: listed vs. aggregated into confirmed pools"><div className="h-56"><ResponsiveContainer><BarChart data={[{ name: "kg", Listed: x.total_listed_kg, Aggregated: x.total_aggregated_kg }]}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="Listed" fill="#a8a29e" /><Bar dataKey="Aggregated" fill="#3d7230" /></BarChart></ResponsiveContainer></div>
        <p className="text-xs text-stone-500">Savings are shown per farmer on each pool page as estimates; no aggregate savings figure is claimed.</p></Card>
      <Card title="Pools"><ul className="space-y-1 text-sm">{(pools.data || []).map((p) => (<li key={p.id} className="flex items-center justify-between"><span>Pool #{p.id} · {p.total_kg} kg {p.crop} → {p.dest_name}</span>
        <span className="flex items-center gap-3"><Badge>{p.status}</Badge><Link className="text-brand-700" href={`/pool/${p.id}`}>Open</Link></span></li>))}</ul></Card>
      <Card title="Shipments">{!x.shipments.length ? <p className="text-stone-500 text-sm">None yet.</p> : x.shipments.map((sh: J) => (
        <div key={sh.id} className="flex items-center justify-between py-1 text-sm"><span>Shipment #{sh.id} · order #{sh.order_id}</span><span className="flex items-center gap-2"><Badge>{sh.status}</Badge>
          {sh.status !== "Delivered" && <Btn variant="ghost" onClick={() => advance(sh.id)}>Advance</Btn>}</span></div>))}</Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Farmers"><ul className="text-sm">{x.farmers.map((f: J) => <li key={f.phone}>{f.name} · {f.village}</li>)}</ul></Card>
        <Card title="Buyers & vehicles"><ul className="text-sm">{x.buyers.map((b: J) => <li key={b.phone}>{b.name}</li>)}{x.vehicles.map((v: J) => <li key={v.id} className="text-stone-600">{v.name}: {v.capacity_kg} kg, ₹{v.cost_per_km}/km</li>)}</ul></Card>
      </div>
      <Card title="All harvest listings"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-stone-500"><th>Farmer</th><th>Crop</th><th>kg</th><th>Grade</th><th>Harvest</th><th>Committed</th></tr></thead>
        <tbody>{x.listings.map((l: J, i: number) => <tr key={i}><td>{l.farmer}</td><td>{l.crop}</td><td>{l.kg}</td><td>{l.quality}</td><td>{l.harvest_date}</td><td>{l.committed ? "yes" : "no"}</td></tr>)}</tbody></table></div></Card>
    </div>
  );
}
