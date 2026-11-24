"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { J } from "@/lib/api";

export default function ProfitChart({ farmers }: { farmers: J[] }) {
  const data = farmers.map((f) => ({
    name: f.farmer.replace(" (demo)", ""),
    "Sell alone (best mandi)": Math.round(f.individual_best?.net ?? 0),
    "FarmPool @ buyer minimum": Math.round(f.pooled.net),
    "FarmPool @ buyer maximum": Math.round(f.pooled_if_buyer_pays_max),
  }));
  return (
    <div className="h-72 w-full"><ResponsiveContainer>
      <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
        <Tooltip formatter={(v: number) => "₹" + v.toLocaleString("en-IN")} /><Legend />
        <Bar dataKey="Sell alone (best mandi)" fill="#a8a29e" /><Bar dataKey="FarmPool @ buyer minimum" fill="#4c8a3a" /><Bar dataKey="FarmPool @ buyer maximum" fill="#305a27" />
      </BarChart></ResponsiveContainer></div>
  );
}
