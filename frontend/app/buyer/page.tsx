"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, J } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Btn, Field, Err, Loading, Badge } from "@/components/ui";
import Stepper from "@/components/Stepper";
import CropSelector from "@/components/CropSelector";
import SackQuantitySelector from "@/components/SackQuantitySelector";
import QualityGradeSelector from "@/components/QualityGradeSelector";
import DateSelector from "@/components/DateSelector";
import OfflineBanner from "@/components/OfflineBanner";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import { getLang, t, CROPS_META, Lang } from "@/lib/i18n";
import { speakText } from "@/lib/voice";

export default function Buyer() {
  const s = useRole(["buyer"]);
  const reqs = useLoad<J[]>(s ? "/requirements" : null);
  const pools = useLoad<J[]>(s ? "/pools" : null);
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  const [err, setErr] = useState("");
  const [result, setResult] = useState<Record<number, J>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const tomorrow2Str = new Date(Date.now() + 172800000).toISOString().split("T")[0];
  const [f, setF] = useState({
    crop: "tomato",
    quantity_kg: "1000",
    min_quality: "B" as "A" | "B" | "C",
    price_min: "24",
    price_max: "28",
    dest_name: "कोलकाता कलेक्शन हब (Kolkata Hub)",
    dest_lat: "22.5726",
    dest_lng: "88.3639",
    deadline: tomorrow2Str,
  });

  const refresh = () => {
    reqs.reload();
    pools.reload();
  };

  const createRequirement = async () => {
    setErr("");
    try {
      await api("/requirements", {
        body: {
          crop: f.crop,
          quantity_kg: +f.quantity_kg,
          min_quality: f.min_quality,
          price_min: +f.price_min,
          price_max: +f.price_max,
          dest_name: f.dest_name,
          dest_lat: +f.dest_lat,
          dest_lng: +f.dest_lng,
          deadline: f.deadline,
        },
      });
      speakText("आपकी खरीद मांग दर्ज कर ली गई है।", lang);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const findPool = async (id: number) => {
    setBusy(id);
    setErr("");
    try {
      const res = await api(`/requirements/${id}/propose-pool`, { method: "POST" });
      setResult({ ...result, [id]: res });
      speakText(
        res.feasible
          ? "किसान समूह मिल गया है! चार किसानों को आर्डर भेजा गया है।"
          : "पर्याप्त फसल उपलब्ध नहीं है।",
        lang
      );
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const confirmOrder = async (id: number) => {
    try {
      await api(`/requirements/${id}/confirm`, { method: "POST" });
      speakText("आर्डर पक्का हो गया है! गाड़ी रवाना होने के लिए तैयार है।", lang);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (!s) return <Loading />;

  return (
    <div className="space-y-6">
      <OfflineBanner lang={lang} />

      {/* Welcome Top Banner */}
      <div className="rounded-3xl terracotta-gradient p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              <span>🛒 {lang === "hi" ? "खरीदार व व्यापारी मंच" : "Buyer & Mandi Trader"}</span>
              <span>•</span>
              <span>Kolkata Fresh Hub</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl tracking-tight">
              {t("procurementTitle", lang)}
            </h1>
            <p className="mt-1 text-sm text-amber-100 max-w-xl">
              {lang === "hi"
                ? "अपनी थोक मांग दर्ज करें। हमारा सिस्टम आसपास के छोटे किसानों को मिलाकर एक ही गाड़ी में आपका आर्डर पूरा करेगा।"
                : "Post bulk crop demand. We aggregate nearby small farmers into a single optimized vehicle run."}
            </p>
          </div>
          <AudioGuideBtn
            text={
              lang === "hi"
                ? "यह खरीदार पृष्ठ है। यहां आप अपनी जरूरत की फसल, मात्रा और भाव चुनकर किसान समूह खोज सकते हैं।"
                : "Buyer portal. Post your produce requirement, set price band, and find matching farmer pools."
            }
            lang={lang}
          />
        </div>
      </div>

      <Err msg={err || reqs.error} />

      {/* NEW REQUIREMENT CARD */}
      <Card
        title={t("newRequirement", lang)}
        icon="📝"
        audioText={
          lang === "hi"
            ? "फसल का फोटो छुएं, बोरी या वजन चुनें, खरीद भाव तय करें और 'मांग प्रकाशित करें' बटन दबाएं।"
            : "Select crop, volume, price range and publish your requirement."
        }
      >
        <div className="space-y-5">
          {/* 1. Crop Selector */}
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-2">
              {t("selectCrop", lang)}
            </label>
            <CropSelector value={f.crop} onChange={(c) => setF({ ...f, crop: c })} lang={lang} />
          </div>

          {/* 2. Sack & Quantity Selector */}
          <div>
            <SackQuantitySelector
              value={f.quantity_kg}
              onChange={(kg) => setF({ ...f, quantity_kg: kg })}
              lang={lang}
            />
          </div>

          {/* 3. Minimum Quality */}
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-2">
              न्यूनतम स्वीकार्य क्वालिटी:
            </label>
            <QualityGradeSelector
              value={f.min_quality}
              onChange={(q) => setF({ ...f, min_quality: q })}
              lang={lang}
            />
          </div>

          {/* 4. Price & Delivery details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-stone-200 bg-stone-50 p-4">
              <label className="block text-sm font-bold text-stone-800 mb-2">
                💰 खरीद भाव सीमा (₹ प्रति किलो):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="न्यूनतम भाव (₹/kg)"
                  type="number"
                  value={f.price_min}
                  onChange={(e) => setF({ ...f, price_min: e.target.value })}
                />
                <Field
                  label="अधिकतम भाव (₹/kg)"
                  type="number"
                  value={f.price_max}
                  onChange={(e) => setF({ ...f, price_max: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-2xl border-2 border-stone-200 bg-stone-50 p-4">
              <label className="block text-sm font-bold text-stone-800 mb-2">
                📍 डिलीवरी स्थान और डिलीवरी तारीख:
              </label>
              <Field
                label="स्थान"
                value={f.dest_name}
                onChange={(e) => setF({ ...f, dest_name: e.target.value })}
              />
              <div className="mt-2">
                <DateSelector
                  label="कब तक माल चाहिए?"
                  value={f.deadline}
                  onChange={(d) => setF({ ...f, deadline: d })}
                  lang={lang}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Btn
            big
            variant="earth"
            className="w-full text-xl"
            onClick={createRequirement}
            disabled={!f.quantity_kg || !f.deadline}
          >
            📢 खरीद मांग प्रकाशित करें (Publish Demand)
          </Btn>
        </div>
      </Card>

      {/* REQUIREMENTS LIST & POOL ACTIONS */}
      {reqs.loading ? (
        <Loading />
      ) : (
        reqs.data?.map((r) => {
          const rp = (pools.data || []).filter((p) => p.requirement_id === r.id);
          const live = rp.find((p) => ["Proposed", "Accepted", "Confirmed"].includes(p.status));
          const res = result[r.id];
          const meta = CROPS_META[r.crop] || { icon: "🌱", hi: r.crop, bn: r.crop, en: r.crop };
          const sacks = (r.quantity_kg / 50).toFixed(0);

          return (
            <Card key={r.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">
                      मांग #{r.id} • {r.quantity_kg} kg {meta[lang] || r.crop} (≈ {sacks} बोरी)
                    </h3>
                    <p className="text-xs text-stone-600 font-medium">
                      क्वालिटी ग्रेड {r.min_quality}+ • भाव सीमा: ₹{r.price_min}–{r.price_max}/kg • तारीख: {r.deadline}
                    </p>
                  </div>
                </div>
                <Badge>{r.status}</Badge>
              </div>

              <div className="my-3">
                <Stepper status={r.status} />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                {["Open", "Matching"].includes(r.status) && (
                  <Btn
                    big
                    variant="primary"
                    disabled={busy === r.id}
                    onClick={() => findPool(r.id)}
                  >
                    {busy === r.id ? "समूह मिला रहे हैं..." : `🔍 ${t("findPoolBtn", lang)}`}
                  </Btn>
                )}

                {r.status === "Awaiting Confirmation" && (
                  <Btn big variant="harvest" onClick={() => confirmOrder(r.id)}>
                    ✓ {t("confirmOrderBtn", lang)}
                  </Btn>
                )}

                {live && (
                  <Link
                    href={`/pool/${live.id}`}
                    className="btn-tactile inline-flex h-14 items-center gap-2 rounded-2xl bg-amber-100 border-2 border-amber-300 px-5 text-base font-black text-amber-950 hover:bg-amber-200"
                  >
                    <span>🗺️</span>
                    <span>समूह, गाड़ी का नक्शा व लाभ देखें</span>
                    <span>→</span>
                  </Link>
                )}
              </div>

              {r.status === "Pool Proposed" && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 border border-amber-200">
                  <span>⏳</span>
                  <span>किसानों को प्रस्ताव भेजा गया है। उनके स्वीकार करते ही आप आर्डर पक्का कर सकेंगे।</span>
                </div>
              )}

              {/* Feasibility / Shortfall explanation */}
              {res && !res.feasible && (
                <div className="mt-3 rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 text-sm text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <span>⚠️</span>
                    <span>इस समय पूरा समूह नहीं बन पा रहा:</span>
                  </div>
                  <ul className="ml-5 list-disc mt-1 space-y-1 font-medium">
                    {res.reasons.map((x: string) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  {res.excluded?.length > 0 && (
                    <p className="mt-2 text-xs text-stone-600">
                      अलग रहे किसान: {res.excluded.map((e: J) => `${e.farmer} (${e.why})`).join("; ")}
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
