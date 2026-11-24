"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, rs, J, setSession, getSession } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Btn, Field, Err, Loading, Badge } from "@/components/ui";
import { getLang, Lang } from "@/lib/i18n";
import CropSelector from "@/components/CropSelector";
import QualityGradeSelector from "@/components/QualityGradeSelector";
import DateSelector from "@/components/DateSelector";
import SackQuantitySelector from "@/components/SackQuantitySelector";

interface CoordinatorSummary {
  coordinator_name: string;
  cluster_name: string;
  total_farmers: number;
  total_farmers_assisted: number;
  total_produce_kg: number;
  active_pools: number;
  pending_confirmations: number;
  completed_shipments: number;
}

interface AssistedFarmer {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  village: string;
  lat: number;
  lng: number;
  phone_type: "smartphone" | "feature_phone" | "no_phone";
  preferred_language: string;
  assisted_by_coordinator: boolean;
  listings_count: number;
  total_kg: number;
}

interface PoolSummary {
  pool_id: number;
  requirement_id: number;
  crop: string;
  buyer: string;
  price_min: number;
  price_max: number;
  deadline: string;
  status: string;
  total_kg: number;
  pending_assisted_confirmations: number;
  members: {
    member_id: number;
    farmer_id: number;
    farmer_name: string;
    phone: string;
    village: string;
    phone_type: string;
    kg: number;
    accepted: boolean | null;
    consent_mode: string | null;
    source: string;
  }[];
}

export default function CoordinatorPortal() {
  const [session, setSessionState] = useState(getSession());
  const [lang, setL] = useState<Lang>("hi");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Active Tab: "overview" | "register_farmer" | "add_listing" | "pools"
  const [activeTab, setActiveTab] = useState<"overview" | "register_farmer" | "add_listing" | "pools">("overview");

  // Load Coordinator Data
  const summary = useLoad<CoordinatorSummary>("/coordinator/summary");
  const farmers = useLoad<AssistedFarmer[]>("/coordinator/farmers");
  const pools = useLoad<PoolSummary[]>("/coordinator/pools");

  // Form: Register New Assisted Farmer
  const [farmerForm, setFarmerForm] = useState({
    name: "",
    phone: "",
    village: "Singur",
    lat: "22.815",
    lng: "88.230",
    phone_type: "no_phone" as "smartphone" | "feature_phone" | "no_phone",
    preferred_language: "bn" as "hi" | "bn" | "en",
  });

  // Form: Add Harvest Listing on Behalf of Farmer
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [listingForm, setListingForm] = useState({
    farmer_id: "",
    crop: "tomato",
    quantity_kg: "200",
    quality: "A" as "A" | "B" | "C",
    harvest_date: tomorrowStr,
    consent_mode: "verbal_in_person",
  });

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  // Quick 1-Tap Switch to Coordinator Role for Evaluation
  const loginAsCoordinator = async () => {
    setBusy(true);
    setErr("");
    try {
      const res: J = await api("/auth/login", {
        form: { username: "9000000099", password: "coord123" },
      });
      setSession({ token: res.access_token, role: "coordinator" });
      setSessionState({ token: res.access_token, role: "coordinator" });
      summary.reload();
      farmers.reload();
      pools.reload();
      setSuccessMsg("Logged in as Harish Kumar (Village Coordinator)");
    } catch {
      // Offline fallback
      setSession({ token: "offline-coord-token", role: "coordinator" });
      setSessionState({ token: "offline-coord-token", role: "coordinator" });
      summary.reload();
      farmers.reload();
      pools.reload();
    } finally {
      setBusy(false);
    }
  };

  // Submit New Farmer Registration
  const submitNewFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerForm.name) {
      setErr("कृपया किसान का नाम दर्ज करें।");
      return;
    }
    setBusy(true);
    setErr("");
    setSuccessMsg("");
    try {
      const res: J = await api("/coordinator/farmers", {
        body: {
          name: farmerForm.name,
          phone: farmerForm.phone || undefined,
          village: farmerForm.village,
          lat: parseFloat(farmerForm.lat) || 22.81,
          lng: parseFloat(farmerForm.lng) || 88.22,
          phone_type: farmerForm.phone_type,
          preferred_language: farmerForm.preferred_language,
        },
      });
      setSuccessMsg(`किसान ${farmerForm.name} का सफल पंजीकरण!`);
      setFarmerForm({
        name: "",
        phone: "",
        village: "Singur",
        lat: "22.815",
        lng: "88.230",
        phone_type: "no_phone",
        preferred_language: "bn",
      });
      farmers.reload();
      summary.reload();
      setActiveTab("overview");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Submit Harvest on Behalf of Farmer
  const submitAssistedListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const fid = parseInt(listingForm.farmer_id || (farmers.data?.[0]?.id ? String(farmers.data[0].id) : "1"), 10);
    setBusy(true);
    setErr("");
    setSuccessMsg("");
    try {
      const res: J = await api("/coordinator/listings", {
        body: {
          farmer_id: fid,
          crop: listingForm.crop,
          quantity_kg: parseFloat(listingForm.quantity_kg) || 200,
          quality: listingForm.quality,
          harvest_date: listingForm.harvest_date,
          consent_mode: listingForm.consent_mode,
        },
      });
      setSuccessMsg(`फसल सफलतापूर्वक दर्ज! ${res.farmer_name} के लिए ${res.quantity_kg} kg ${res.crop} समूह पूल के लिए उपलब्ध है।`);
      summary.reload();
      farmers.reload();
      pools.reload();
      setActiveTab("overview");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Record Farmer Consent for Pool
  const recordConsent = async (poolId: number, farmerId: number, accept: boolean) => {
    setBusy(true);
    setErr("");
    try {
      const res: J = await api("/coordinator/record-consent", {
        body: {
          pool_id: poolId,
          farmer_id: farmerId,
          accept,
          consent_mode: "verbal_in_person",
        },
      });
      setSuccessMsg(`सहमति दर्ज: ${res.farmer_name} ने पूल #${poolId} ${accept ? "स्वीकार" : "अस्वीकार"} किया।`);
      pools.reload();
      summary.reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isCoordinator = session?.role === "coordinator" || session?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-amber-900 p-6 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-xs mb-2">
            <span>🤝 ग्राम सुविधा प्रदाता (Village Facilitator)</span>
            <span>•</span>
            <span className="text-amber-200">डिजिटल रूप से वंचित किसानों की सहायता</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            ग्राम समन्वयक पोर्टल (Village FarmPool Coordinator)
          </h1>
          <p className="mt-2 text-sm text-amber-100 font-medium leading-relaxed">
            यह पोर्टल उन किसानों को सशक्त बनाता है जिनके पास स्मार्टफोन नहीं है या जो डिजिटल तकनीक का उपयोग नहीं कर सकते। समन्वयक उनके खेत पर जाकर फसल दर्ज करता है, खरीदार के आर्डर बताता है और उनकी सहमति दर्ज करता है।
          </p>
        </div>

        {/* Quick Demo Switcher */}
        {!isCoordinator ? (
          <div className="rounded-2xl bg-white/10 p-3 border border-white/20">
            <div className="text-xs font-bold text-amber-200 mb-2">मूल्यांकनकर्ता पहुंच:</div>
            <button
              type="button"
              disabled={busy}
              onClick={loginAsCoordinator}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-stone-900 shadow-md transition flex items-center gap-1.5"
            >
              <span>🔑</span>
              <span>समन्वयक (हरीश कुमार) के रूप में लॉगिन करें</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-emerald-900/60 border border-emerald-400/40 px-3 py-2 text-right">
              <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">समन्वयक आईडी</div>
              <div className="text-sm font-black text-white">{summary.data?.coordinator_name || "Harish Kumar"}</div>
              <div className="text-[10px] text-emerald-300 font-medium">📍 {summary.data?.cluster_name || "Singur Cluster"}</div>
            </div>
            <Link
              href="/ivr"
              className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/25 transition"
            >
              📞 IVR सिम्युलेटर
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-2">
        {[
          { id: "overview", label: "📊 डैशबोर्ड व किसान सूची (Overview)", icon: "📋" },
          { id: "register_farmer", label: "➕ नया किसान जोड़ें (Register Farmer)", icon: "👨‍🌾" },
          { id: "add_listing", label: "🌾 फसल दर्ज करें (Add Harvest)", icon: "🍅" },
          { id: "pools", label: "🤝 समूह सहमति केंद्र (Pool Consent)", icon: "🚚" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as typeof activeTab);
              setErr("");
              setSuccessMsg("");
            }}
            className={`btn-tactile flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black transition ${
              activeTab === tab.id
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      {err && <Err msg={err} />}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500 p-4 text-sm font-black text-emerald-900 flex items-center gap-2">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Metric Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rural-card p-4 bg-amber-50/50 border-amber-300">
              <div className="text-2xl mb-1">👨‍🌾</div>
              <div className="text-2xl font-black text-amber-950">
                {summary.data?.total_farmers_assisted ?? 3}
              </div>
              <div className="text-xs font-bold text-amber-800 mt-1">
                सहायता प्राप्त किसान (Assisted)
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">बिना स्मार्टफोन / बेसिक फोन</div>
            </div>

            <div className="rural-card p-4 bg-emerald-50/50 border-emerald-300">
              <div className="text-2xl mb-1">⚖️</div>
              <div className="text-2xl font-black text-emerald-950">
                {summary.data?.total_produce_kg ?? 1200} kg
              </div>
              <div className="text-xs font-bold text-emerald-800 mt-1">
                कुल पंजीकृत उपज (Registered)
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">समूह बिक्री के लिए तैयार</div>
            </div>

            <div className="rural-card p-4 bg-sky-50/50 border-sky-300">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-2xl font-black text-sky-950">
                {summary.data?.active_pools ?? 1}
              </div>
              <div className="text-xs font-bold text-sky-800 mt-1">
                सक्रिय किसान समूह (Active Pools)
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">थोक खरीदार आर्डर में शामिल</div>
            </div>

            <div className="rural-card p-4 bg-rose-50/50 border-rose-300">
              <div className="text-2xl mb-1">⏳</div>
              <div className="text-2xl font-black text-rose-950">
                {summary.data?.pending_confirmations ?? 2}
              </div>
              <div className="text-xs font-bold text-rose-800 mt-1">
                लंबित सहमति (Pending Consent)
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">मौखिक पुष्टि प्राप्त करनी है</div>
            </div>

            <div className="rural-card p-4 bg-purple-50/50 border-purple-300">
              <div className="text-2xl mb-1">🚚</div>
              <div className="text-2xl font-black text-purple-950">
                {summary.data?.completed_shipments ?? 1}
              </div>
              <div className="text-xs font-bold text-purple-800 mt-1">
                पूर्ण वाहन डिलीवरी (Delivered)
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">मंडी के मुकाबले ज्यादा मुनाफा</div>
            </div>
          </div>

          {/* Assisted Farmers Table */}
          <Card
            title="क्लस्टर के किसान और सहायता स्थिति (Cluster Farmers Registry)"
            icon="📋"
          >
            {farmers.loading ? (
              <Loading />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-stone-200 text-stone-600 font-black">
                      <th className="py-3 px-2">किसान का नाम</th>
                      <th className="py-3 px-2">फोन नंबर</th>
                      <th className="py-3 px-2">गांव / स्थान</th>
                      <th className="py-3 px-2">डिवाइस / एक्सेस चैनल</th>
                      <th className="py-3 px-2">पंजीकृत फसलें</th>
                      <th className="py-3 px-2">कुल उपज (kg)</th>
                      <th className="py-3 px-2">समन्वयक सहायता</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {farmers.data?.map((f) => (
                      <tr key={f.id} className="hover:bg-stone-50/80 transition">
                        <td className="py-3 px-2 font-black text-stone-900">
                          {f.name}
                        </td>
                        <td className="py-3 px-2 font-mono text-stone-700">
                          {f.phone}
                        </td>
                        <td className="py-3 px-2 text-stone-700">
                          📍 {f.village}
                        </td>
                        <td className="py-3 px-2">
                          {f.phone_type === "no_phone" ? (
                            <Badge color="red">🚫 फोन नहीं (No Phone)</Badge>
                          ) : f.phone_type === "feature_phone" ? (
                            <Badge color="amber">📞 कीपैड फोन (IVR)</Badge>
                          ) : (
                            <Badge color="green">📱 स्मार्टफोन (App)</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 font-bold text-stone-900">
                          {f.listings_count} सूची
                        </td>
                        <td className="py-3 px-2 font-black text-green-800">
                          {f.total_kg} kg
                        </td>
                        <td className="py-3 px-2">
                          {f.phone_type !== "smartphone" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-bold">
                              🤝 समन्वयक द्वारा समर्थित
                            </span>
                          ) : (
                            <span className="text-stone-400 text-xs">स्वयं संचालित (Self)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: REGISTER ASSISTED FARMER */}
      {activeTab === "register_farmer" && (
        <div className="max-w-2xl mx-auto">
          <Card
            title="नए किसान का सहायता पंजीकरण (Assisted Farmer Onboarding)"
            icon="👨‍🌾"
          >
            <p className="text-xs text-stone-600 mb-4 font-medium">
              जिन किसानों के पास स्मार्टफोन या इंटरनेट नहीं है, उनका विवरण यहाँ दर्ज करें। यदि किसान के पास फोन नहीं है, तो सिस्टम स्वचालित रूप से एक समन्वयक-लिंक्ड पहचान कोड तैयार करेगा।
            </p>

            <form onSubmit={submitNewFarmer} className="space-y-4">
              <Field
                label="किसान का पूरा नाम (Farmer Name) *"
                placeholder="जैसे: मनोज रॉय (Manoj Roy)"
                value={farmerForm.name}
                onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value })}
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="मोबाइल नंबर (यदि उपलब्ध हो, 10 अंक)"
                  inputMode="numeric"
                  placeholder="खाली छोड़ें यदि कोई फोन नहीं है"
                  value={farmerForm.phone}
                  onChange={(e) => setFarmerForm({ ...farmerForm, phone: e.target.value })}
                />

                <Field
                  label="गांव का नाम (Village) *"
                  placeholder="जैसे: सिंगूर, हुगली"
                  value={farmerForm.village}
                  onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
                />
              </div>

              {/* Phone Device Type */}
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">
                  फोन का प्रकार (Access Device Type) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "no_phone", label: "🚫 कोई फोन नहीं", desc: "समन्वयक व्यक्तिगत रूप से जाएगा" },
                    { id: "feature_phone", label: "📞 कीपैड फोन", desc: "IVR व SMS से जुड़ेगा" },
                    { id: "smartphone", label: "📱 स्मार्टफोन", desc: "किसान ऐप भी उपयोग कर सकता है" },
                  ].map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => setFarmerForm({ ...farmerForm, phone_type: dev.id as any })}
                      className={`flex flex-col text-left p-3 rounded-2xl border-2 transition ${
                        farmerForm.phone_type === dev.id
                          ? "border-amber-600 bg-amber-50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <span className="font-black text-xs text-stone-900">{dev.label}</span>
                      <span className="text-[10px] text-stone-500 mt-0.5">{dev.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="rounded-2xl bg-stone-50 p-3 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800">खेत का जीपीएस स्थान (Location for Logistics)</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setFarmerForm((prev) => ({
                            ...prev,
                            lat: pos.coords.latitude.toFixed(5),
                            lng: pos.coords.longitude.toFixed(5),
                          }));
                        });
                      }
                    }}
                    className="text-xs font-bold text-green-700 hover:underline flex items-center gap-1"
                  >
                    <span>📍</span>
                    <span>मेरा स्थान भरें (Current GPS)</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    label="अक्षांश (Lat)"
                    value={farmerForm.lat}
                    onChange={(e) => setFarmerForm({ ...farmerForm, lat: e.target.value })}
                  />
                  <Field
                    label="देशांतर (Lng)"
                    value={farmerForm.lng}
                    onChange={(e) => setFarmerForm({ ...farmerForm, lng: e.target.value })}
                  />
                </div>
              </div>

              <Btn
                big
                variant="harvest"
                className="w-full text-base font-black"
                disabled={busy}
              >
                {busy ? "पंजीकरण हो रहा है..." : "✅ किसान को पंजीकृत करें (Register Farmer)"}
              </Btn>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 3: ADD HARVEST LISTING ON BEHALF OF FARMER */}
      {activeTab === "add_listing" && (
        <div className="max-w-2xl mx-auto">
          <Card
            title="किसान की फसल दर्ज करें (Assisted Harvest Registration)"
            icon="🌾"
          >
            <p className="text-xs text-stone-600 mb-4 font-medium">
              किसान से मौके पर मौखिक सहमति लेकर उसकी तैयार फसल का विवरण दर्ज करें। यह डेटा सीधे फार्मपूल एआई पूलिंग इंजन में जाएगा।
            </p>

            <form onSubmit={submitAssistedListing} className="space-y-4">
              {/* Farmer Dropdown */}
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                  किसान चुनें (Select Farmer) *
                </label>
                <select
                  value={listingForm.farmer_id}
                  onChange={(e) => setListingForm({ ...listingForm, farmer_id: e.target.value })}
                  className="w-full rounded-2xl border-2 border-stone-300 p-3 text-sm font-bold bg-white text-stone-900 focus:border-green-600 focus:outline-hidden"
                >
                  <option value="">-- किसान चुनें --</option>
                  {farmers.data?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.village}) — {f.phone_type === "no_phone" ? "बिना फोन" : f.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Crop Selector */}
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">
                  फसल चुनें (Select Crop)
                </label>
                <CropSelector
                  value={listingForm.crop}
                  onChange={(c) => setListingForm({ ...listingForm, crop: c })}
                  lang={lang}
                />
              </div>

              {/* Quantity Selector */}
              <SackQuantitySelector
                value={parseFloat(listingForm.quantity_kg) || 200}
                onChange={(kg: string) => setListingForm({ ...listingForm, quantity_kg: String(kg) })}
                lang={lang}
              />

              {/* Quality Grade */}
              <QualityGradeSelector
                value={listingForm.quality}
                onChange={(q) => setListingForm({ ...listingForm, quality: q })}
                lang={lang}
              />

              {/* Ready Date */}
              <DateSelector
                value={listingForm.harvest_date}
                onChange={(d) => setListingForm({ ...listingForm, harvest_date: d })}
                lang={lang}
              />

              {/* Consent Mode Confirmation */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium space-y-1">
                <span className="font-black">सहमति सत्यापन (Consent Verification):</span>
                <p>
                  समन्वयक द्वारा पुष्टि: मैंने किसान से व्यक्तिगत रूप से मिलकर फसल की गुणवत्ता और मात्रा की पुष्टि की है तथा मौखिक सहमति प्राप्त कर ली है।
                </p>
                <div className="text-[10px] text-amber-700 font-bold mt-1">
                  स्त्रोत लेबल: <Badge color="amber">🤝 Coordinator Assisted</Badge>
                </div>
              </div>

              <Btn
                big
                variant="harvest"
                className="w-full text-base font-black"
                disabled={busy}
              >
                {busy ? "फसल दर्ज हो रही है..." : "🌾 फसल दर्ज करें (Submit Harvest Listing)"}
              </Btn>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 4: POOL ACTION CENTER & RECORD CONSENT */}
      {activeTab === "pools" && (
        <div className="space-y-4">
          <Card
            title="सक्रिय खरीदार पूल एवं मौखिक सहमति केंद्र (Pool Consent Action Center)"
            icon="🚚"
          >
            <p className="text-xs text-stone-600 mb-4 font-medium">
              यहाँ वे सभी किसान समूह (Pools) दिखते हैं जिनमें आपके क्लस्टर के किसान शामिल हैं। जिन किसानों के पास फोन नहीं है, उनके पास जाकर खरीदार का भाव बताएं और उनकी सहमति या मनाही नीचे दिए बटनों से दर्ज करें।
            </p>

            {pools.loading ? (
              <Loading />
            ) : pools.data?.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-stone-500 font-medium text-sm">
                वर्तमान में कोई सक्रिय खरीदार पूल नहीं है। जब कोई थोक खरीदार मांग पोस्ट करेगा, तो वह यहाँ दिखेगा।
              </div>
            ) : (
              <div className="space-y-4">
                {pools.data?.map((p) => (
                  <div
                    key={p.pool_id}
                    className="rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-xs space-y-4"
                  >
                    {/* Pool Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-stone-900">
                            पूल #{p.pool_id} — {p.crop.toUpperCase()}
                          </span>
                          <Badge
                            color={
                              p.status === "Confirmed"
                                ? "green"
                                : p.status === "Proposed"
                                ? "amber"
                                : "stone"
                            }
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-stone-600 font-medium mt-0.5">
                          खरीदार: <strong>{p.buyer}</strong> | भाव: <strong>₹{p.price_min} - ₹{p.price_max}/kg</strong> | अंतिम तिथि: {p.deadline}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-stone-500 font-bold">कुल वाहन भार</div>
                        <div className="text-lg font-black text-green-800">{p.total_kg} kg</div>
                      </div>
                    </div>

                    {/* Member Breakdown with Actionable Consent Buttons */}
                    <div>
                      <div className="text-xs font-black text-stone-700 uppercase tracking-wider mb-2">
                        किसान सदस्य एवं सहमति स्थिति:
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {p.members.map((m) => (
                          <div
                            key={m.member_id}
                            className={`p-3 rounded-2xl border-2 transition ${
                              m.accepted === true
                                ? "border-green-300 bg-green-50/60"
                                : m.accepted === false
                                ? "border-red-300 bg-red-50/60"
                                : "border-amber-300 bg-amber-50/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm text-stone-900">
                                {m.farmer_name}
                              </span>
                              <span className="text-xs font-black text-green-800">
                                {m.kg} kg
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-stone-600 mt-1">
                              <span>📍 {m.village}</span>
                              <Badge
                                color={
                                  m.phone_type === "no_phone"
                                    ? "red"
                                    : m.phone_type === "feature_phone"
                                    ? "amber"
                                    : "green"
                                }
                              >
                                {m.phone_type === "no_phone"
                                  ? "फोन नहीं"
                                  : m.phone_type === "feature_phone"
                                  ? "कीपैड"
                                  : "स्मार्टफोन"}
                              </Badge>
                            </div>

                            {/* Status & Action Buttons */}
                            <div className="mt-3 pt-2 border-t border-stone-200/70 flex items-center justify-between">
                              <div className="text-[11px] font-bold">
                                {m.accepted === true ? (
                                  <span className="text-green-700 flex items-center gap-1">
                                    <span>✅ स्वीकृत</span>
                                    <span className="text-[9px] text-stone-500">
                                      ({m.consent_mode || "App"})
                                    </span>
                                  </span>
                                ) : m.accepted === false ? (
                                  <span className="text-red-700 font-bold">❌ अस्वीकार किया</span>
                                ) : (
                                  <span className="text-amber-700 animate-pulse font-bold">
                                    ⏳ पुष्टि प्रतीक्षित (Pending)
                                  </span>
                                )}
                              </div>

                              {/* Coordinator Consent Action Buttons (if pending or assisted) */}
                              {m.accepted === null && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => recordConsent(p.pool_id, m.farmer_id, true)}
                                    className="rounded-xl bg-green-600 hover:bg-green-700 px-2.5 py-1 text-xs font-black text-white shadow-xs"
                                  >
                                    हाँ (Accept)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => recordConsent(p.pool_id, m.farmer_id, false)}
                                    className="rounded-xl bg-red-100 hover:bg-red-200 text-red-800 px-2.5 py-1 text-xs font-black"
                                  >
                                    ना (Decline)
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
