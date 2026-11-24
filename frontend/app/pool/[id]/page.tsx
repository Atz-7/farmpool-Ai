"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { rs, J } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Err, Loading, Badge, Demo } from "@/components/ui";
import ProfitChart from "@/components/ProfitChart";
import OfflineBanner from "@/components/OfflineBanner";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import { getLang, Lang } from "@/lib/i18n";

const Pool3D = dynamic(() => import("@/components/Pool3D"), { ssr: false, loading: () => <Loading /> });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false, loading: () => <Loading /> });

export default function Pool() {
  const { id } = useParams<{ id: string }>();
  const s = useRole(["farmer", "buyer", "admin"]);
  const pool = useLoad<J>(s ? `/pools/${id}` : null);
  const profit = useLoad<J>(s ? `/pools/${id}/profit` : null);
  const route = useLoad<J>(s ? `/pools/${id}/route` : null);
  const [view, setView] = useState<"map" | "3d">("map");
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  if (!s || pool.loading) return <Loading />;
  const p = pool.data;
  if (!p) return <Err msg={pool.error || "Pool not found"} />;
  const rows: J[] = profit.data?.farmers ?? [];

  return (
    <div className="space-y-6">
      <OfflineBanner lang={lang} />

      {/* Header Banner */}
      <div className="rounded-3xl rural-gradient p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🤝</span>
              <h1 className="text-2xl sm:text-3xl font-black">
                {lang === "hi" ? `किसान समूह #${p.id}` : `Farmer Pool #${p.id}`}
              </h1>
              <Badge>{p.status}</Badge>
              <Demo />
            </div>
            <p className="mt-2 text-sm text-green-100 font-medium">
              {p.total_kg} kg {p.requirement?.crop} • गंतव्य: {p.requirement?.dest_name} • अंतिम तारीख: {p.requirement?.deadline}
            </p>
          </div>
          <AudioGuideBtn
            text={
              lang === "hi"
                ? `यह किसान समूह नंबर ${p.id} है। यहां आप गाड़ी का साझा रास्ता देख सकते हैं और यह भी कि अकेले बेचने के मुकाबले समूह में बेचने पर हर किसान को कितने रुपये ज्यादा मिले।`
                : "Farmer pool details. View optimized shared pickup route and transparent net earnings comparison."
            }
            lang={lang}
          />
        </div>
      </div>

      {/* Why These Farmers Card */}
      <Card
        title={lang === "hi" ? "इन किसानों को क्यों चुना गया?" : "Why these farmers were selected"}
        icon="👥"
        audioText={
          lang === "hi"
            ? "सिस्टम ने वही किसान चुने हैं जिनका खेत गाड़ी के रास्ते पर है और जिनकी फसल उसी दिन तैयार है। जिससे किसी का समय और भाड़ा व्यर्थ न हो।"
            : "Engine matched farmers with overlapping harvest readiness along the vehicle route."
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {p.members.map((m: J) => (
            <div
              key={m.farmer}
              className="rounded-2xl border-2 border-stone-200 bg-stone-50/50 p-4 transition hover:bg-white"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-base">
                  👨‍🌾 {m.farmer} • {m.village}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    m.accepted === true
                      ? "bg-green-100 text-green-800"
                      : m.accepted === false
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {m.accepted === true ? "✓ शामिल हुए" : m.accepted === false ? "✗ मना किया" : "जवाब की प्रतीक्षा"}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                💡 {m.reason}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Pickup Route Card */}
      <Card
        title={lang === "hi" ? "साझा गाड़ी का रूट (Pickup Route)" : "Pickup Route"}
        icon="🚚"
        audioText={
          lang === "hi"
            ? "यह गाड़ी का नक्शा है। एक ही गाड़ी सभी किसानों के गांव से होकर माल उठाएगी और सीधे कोलकाता कलेक्शन हब पहुंचेगी।"
            : "Vehicle route map showing stops and distance."
        }
      >
        {route.error ? (
          <Err msg={route.error} />
        ) : route.loading || !route.data ? (
          <Loading />
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              {(["map", "3d"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`btn-tactile h-11 rounded-2xl px-5 text-sm font-bold transition ${
                    view === v
                      ? "bg-green-700 text-white border-2 border-green-800"
                      : "border-2 border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                  }`}
                >
                  {v === "map" ? "🗺️ नक्शा (Map)" : "🎮 3D गाड़ी यात्रा (3D Simulation)"}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-stone-200">
              {view === "map" ? <RouteMap route={route.data} /> : <Pool3D route={route.data} />}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-sm">
              <span className="font-bold text-amber-950">
                🚚 {route.data.vehicle} • {route.data.distance_km} km कुल दूरी • साझा भाड़ा {rs(route.data.cost)}
              </span>
              <span className="text-xs text-amber-800">
                भाड़ा नियम: {route.data.cost_share_rule}
              </span>
            </div>

            <ol className="mt-3 grid gap-2 sm:grid-cols-2 text-xs font-semibold text-stone-700">
              {route.data.stops.map((st: J) => (
                <li
                  key={st.seq}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 flex items-center justify-between"
                >
                  <span>
                    {st.seq}. 📍 {st.farmer} ({st.village})
                  </span>
                  <span className="rounded-lg bg-green-100 text-green-900 px-2 py-0.5 font-bold">
                    {st.kg} kg
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Card>

      {/* PROFIT SIMULATOR: CLEAR VISUAL MONEY IN POCKET */}
      <Card
        title={
          lang === "hi"
            ? "सीधी बात: आपकी जेब में कितने रुपये आएंगे? (मुनाफा कैलकुलेटर)"
            : "Profit Simulator: Alone vs. FarmPool"
        }
        icon="💰"
        audioText={
          lang === "hi"
            ? "यहां देखिए कि अकेले मंडी जाने के मुकाबले समूह में बेचने पर हर किसान को कितने रुपये ज्यादा मिल रहे हैं। हरा नंबर ज्यादा मुनाफे को दर्शाता है।"
            : "Per-farmer profit comparison. Net take-home earnings pooled vs alone."
        }
      >
        {profit.error ? (
          <Err msg={profit.error} />
        ) : profit.loading ? (
          <Loading />
        ) : (
          <>
            <div className="mb-4">
              <ProfitChart farmers={rows} />
            </div>

            <div className="space-y-4">
              {rows.map((f) => {
                const isPositive = f.difference >= 0;
                return (
                  <div
                    key={f.farmer}
                    className="rounded-2xl border-2 border-stone-300 bg-white p-4 shadow-sm"
                  >
                    {/* Big Summary Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <div className="text-lg font-black text-stone-900">
                          👨‍🌾 {f.farmer}
                        </div>
                        <div className="text-xs text-stone-500 font-medium">
                          फसल मात्रा: {f.pooled.kg} kg
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-stone-500">समूह से फायदा:</div>
                        <div
                          className={`text-xl sm:text-2xl font-black ${
                            isPositive ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {rs(f.difference)} {isPositive && "🎉"}
                        </div>
                      </div>
                    </div>

                    {/* Direct Visual Rupee Comparison */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-center">
                        <span className="text-xs font-semibold text-stone-500 block">
                          अकेले बेचते तो (Mandi Alone):
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-stone-700">
                          {rs(f.individual_best?.net ?? 0)}
                        </span>
                      </div>

                      <div className="rounded-xl border-2 border-green-500 bg-green-50 p-3 text-center">
                        <span className="text-xs font-bold text-green-900 block">
                          फार्मपूल समूह में (In Pool):
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-green-800">
                          {rs(f.pooled.net)}
                        </span>
                      </div>
                    </div>

                    {/* Itemised Breakdown */}
                    <details className="mt-3 rounded-xl bg-stone-50 p-3 text-xs">
                      <summary className="cursor-pointer font-bold text-stone-700">
                        📋 रुपये का पूरा हिसाब देखें (खर्च और कटौती)
                      </summary>
                      <table className="mt-2 w-full text-stone-700">
                        <thead>
                          <tr className="border-b border-stone-300 text-left font-bold">
                            <th className="pb-1">विवरण</th>
                            <th className="pb-1">अकेले ({f.individual_best?.label})</th>
                            <th className="pb-1 text-green-800">फार्मपूल समूह</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-stone-200/50">
                            <td className="py-1">कुल बिक्री (Gross)</td>
                            <td>{rs(f.individual_best?.revenue ?? 0)}</td>
                            <td className="font-bold">{rs(f.pooled.revenue)}</td>
                          </tr>
                          <tr className="border-b border-stone-200/50 text-red-700">
                            <td className="py-1">गाड़ी भाड़ा</td>
                            <td>-{rs(f.individual_best?.transport ?? 0)}</td>
                            <td>-{rs(f.pooled.transport)}</td>
                          </tr>
                          <tr className="border-b border-stone-200/50 text-stone-500">
                            <td className="py-1">कमीशन / आढ़त</td>
                            <td>-{rs(f.individual_best?.commission ?? 0)}</td>
                            <td>-{rs(f.pooled.commission)}</td>
                          </tr>
                          <tr className="border-b border-stone-200/50 text-stone-500">
                            <td className="py-1">पल्लेदारी (Handling)</td>
                            <td>-{rs(f.individual_best?.handling ?? 0)}</td>
                            <td>-{rs(f.pooled.handling)}</td>
                          </tr>
                          <tr className="border-t-2 border-stone-300 font-bold text-sm">
                            <td className="py-1.5">जेब में कुल रुपये (Net Take-home)</td>
                            <td>{rs(f.individual_best?.net ?? 0)}</td>
                            <td className="text-green-800 text-base font-extrabold">{rs(f.pooled.net)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </details>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
