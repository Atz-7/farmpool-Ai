"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { api, rs, J, getSession } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Btn, Err, Loading, Badge, Demo } from "@/components/ui";
import CropSelector from "@/components/CropSelector";
import SackQuantitySelector from "@/components/SackQuantitySelector";
import QualityGradeSelector from "@/components/QualityGradeSelector";
import DateSelector from "@/components/DateSelector";
import OfflineBanner from "@/components/OfflineBanner";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import { getLang, t, CROPS_META, Lang } from "@/lib/i18n";
import { parseVoiceHarvestOffline, speakText } from "@/lib/voice";

export default function Farmer() {
  const s = useRole(["farmer"]);
  const listings = useLoad<J[]>(s ? "/listings" : null);
  const pools = useLoad<J[]>(s ? "/pools" : null);
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  const [cmp, setCmp] = useState<Record<number, J>>({});
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Default harvest form
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [f, setF] = useState({
    crop: "tomato",
    quantity_kg: "250",
    quality: "A" as "A" | "B" | "C",
    harvest_date: tomorrowStr,
    preferred_sell_date: "",
  });

  // Voice speech state
  const [say, setSay] = useState("");
  const [listening, setListening] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const rec = useRef<J>(null);

  const speechOk =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggleMic = () => {
    if (listening) {
      rec.current?.stop();
      setListening(false);
      return;
    }
    const SR: J = (window as J).SpeechRecognition || (window as J).webkitSpeechRecognition;
    if (!SR) {
      setErr("Voice input not supported on this browser.");
      return;
    }
    const r = new SR();
    r.lang = lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-IN" : "en-IN";
    r.interimResults = false;

    r.onresult = (e: J) => {
      const transcript = e.results[0][0].transcript;
      setSay(transcript);
      processSpokenText(transcript);
    };
    r.onerror = () => {
      setErr("Could not hear properly. Please speak again clearly.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const processSpokenText = async (text: string) => {
    setAiBusy(true);
    setErr("");
    try {
      // If online, try Gemini backend AI parser first
      let parsed: J = null;
      if (typeof window !== "undefined" && navigator.onLine) {
        try {
          const res = await api("/ai/parse-listing", { body: { text } });
          parsed = res?.parsed;
        } catch {
          // Fall back to offline parser
          parsed = parseVoiceHarvestOffline(text);
        }
      } else {
        parsed = parseVoiceHarvestOffline(text);
      }

      if (parsed) {
        setF((cur) => ({
          ...cur,
          crop: parsed.crop || cur.crop,
          quantity_kg: parsed.quantity_kg ? String(parsed.quantity_kg) : cur.quantity_kg,
          quality: (parsed.quality as "A" | "B" | "C") || cur.quality,
          harvest_date: parsed.harvest_date || cur.harvest_date,
        }));

        const cropName = CROPS_META[parsed.crop || f.crop]?.[lang] || parsed.crop || f.crop;
        const msg = `समझ लिया: ${parsed.quantity_kg || f.quantity_kg} किलो ${cropName}, ग्रेड ${parsed.quality || f.quality}`;
        setSuccessMsg(msg);
        speakText(msg, lang);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const addHarvest = async () => {
    setErr("");
    setSuccessMsg("");
    try {
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      await api("/listings", {
        body: {
          crop: f.crop,
          quantity_kg: parseFloat(f.quantity_kg),
          quality: f.quality,
          harvest_date: f.harvest_date,
          preferred_sell_date: f.preferred_sell_date || null,
          client_request_id: requestId,
          source: navigator.onLine ? "smartphone" : "offline",
        },
      });

      const cropName = CROPS_META[f.crop]?.[lang] || f.crop;
      const confirmText = `${f.quantity_kg} किलो ${cropName} सुरक्षित दर्ज हो गया!`;
      setSuccessMsg(confirmText);
      speakText(confirmText, lang);

      listings.reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const compare = async (id: number) => {
    try {
      setCmp({ ...cmp, [id]: await api(`/mandi/compare/${id}`) });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const respond = async (pid: number, accept: boolean) => {
    try {
      await api(`/pools/${pid}/respond`, { body: { accept } });
      const respVoice = accept ? "आप समूह में शामिल हो गए हैं!" : "आपने प्रस्ताव अस्वीकार कर दिया।";
      speakText(respVoice, lang);
      pools.reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (!s) return <Loading />;

  const audioIntro =
    lang === "hi"
      ? "यह आपका खेत पृष्ठ है। यहां आप अपनी फसल बोलकर या फोटो छूकर दर्ज कर सकते हैं, और खरीदार के समूह में जुड़कर ज्यादा मुनाफा पा सकते हैं।"
      : lang === "bn"
      ? "এটি আপনার খামার পৃষ্ঠা। এখানে আপনি মুখে বলে বা ছবি স্পর্শ করে ফসল যোগ করতে পারেন এবং যৌথভাবে বিক্রি করে বেশি লাভ পেতে পারেন।"
      : "This is your farm dashboard. Speak or tap to list your produce and join pooling for higher earnings.";

  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      <OfflineBanner lang={lang} />

      {/* Top Welcome Card */}
      <div className="rounded-3xl rural-gradient p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              <span>🌾 {lang === "hi" ? "किसान पोर्टल" : lang === "bn" ? "কৃষক পোর্টাল" : "Farmer Portal"}</span>
              <span>•</span>
              <span>{lang === "hi" ? "हुगली क्षेत्र" : lang === "bn" ? "হুগলি অঞ্চল" : "Hooghly Area"}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl tracking-tight">
              {t("myFarm", lang)}
            </h1>
            <p className="mt-1 text-sm text-green-100 max-w-xl">
              {lang === "hi"
                ? "अकेले मंडी जाने का भाड़ा बचाएं — आसपास के किसान भाइयों के साथ मिलकर सीधे बड़े खरीदार को बेचें।"
                : lang === "bn"
                ? "একা মণ্ডিতে যাওয়ার খরচ বাঁচান — প্রতিবেশীদের সাথে একসাথে বড় ক্রেতাকে বিক্রি করুন।"
                : "Save transport costs by pooling with nearby farmers to sell directly to bulk buyers."}
            </p>

            {/* Access Channels Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/20 text-xs">
              <span className="font-bold text-green-200">अन्य माध्यम:</span>
              <Link href="/ivr" className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 font-bold text-white transition flex items-center gap-1">
                <span>📞</span>
                <span>कीपैड IVR कॉल</span>
              </Link>
              <Link href="/coordinator" className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 font-bold text-white transition flex items-center gap-1">
                <span>🤝</span>
                <span>ग्राम समन्वयक</span>
              </Link>
              <Link href="/notifications" className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 font-bold text-white transition flex items-center gap-1">
                <span>✉️</span>
                <span>एसएमएस अलर्ट</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AudioGuideBtn text={audioIntro} lang={lang} />
          </div>
        </div>
      </div>

      <Err msg={err || listings.error || pools.error} />
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-green-300 bg-green-50 p-4 text-green-900 font-bold shadow-xs">
          <span className="text-2xl">✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* SECTION 1: BUYER GROUP INVITATIONS (High Priority for Farmer) */}
      <Card
        title={t("buyerInvitations", lang)}
        icon="🤝"
        audioText={
          lang === "hi"
            ? "यहां खरीदार के बड़े आर्डर हैं जिनमें आपकी फसल शामिल की गई है। समूह में जुड़ने पर गाड़ी का भाड़ा बंट जाता है और आपको ज्यादा रुपये मिलते हैं।"
            : "Buyer pooled orders matching your harvest appear here. Pooling shares truck cost and increases your net earnings."
        }
      >
        {pools.loading ? (
          <Loading />
        ) : !pools.data?.length ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 p-6 text-center text-stone-500">
            <span className="text-3xl block mb-2">🚜</span>
            <p className="font-semibold text-base">{t("noInvitations", lang)}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pools.data.map((p) => {
              const cropMeta = CROPS_META[p.crop] || { icon: "🌱", hi: p.crop, bn: p.crop, en: p.crop };
              const cropName = cropMeta[lang] || cropMeta.en;
              const sacksCount = (p.my_kg / 50).toFixed(0);

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border-2 border-green-500 bg-green-50/50 p-4 sm:p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-200 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{cropMeta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-green-950 capitalize">{cropName}</span>
                          <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-bold text-green-900">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-stone-700">
                          {t("myShare", lang)}:{" "}
                          <span className="text-green-800 font-black text-base">
                            {p.my_kg} kg ({sacksCount} {lang === "hi" ? "बोरी" : "sacks"})
                          </span>{" "}
                          • कुल मांग: {p.total_kg} kg
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-stone-500">मंडी/हब:</span>
                      <p className="text-sm font-bold text-stone-800">📍 {p.dest_name}</p>
                    </div>
                  </div>

                  {/* Actions for Farmer */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {p.status === "Proposed" && p.my_accepted === null && (
                        <>
                          <Btn big variant="primary" onClick={() => respond(p.id, true)}>
                            👍 {t("joinPool", lang)}
                          </Btn>
                          <Btn big variant="ghost" onClick={() => respond(p.id, false)}>
                            👎 {t("decline", lang)}
                          </Btn>
                        </>
                      )}
                      {p.my_accepted === true && (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-green-700 px-4 py-2.5 text-white font-bold text-sm shadow-xs">
                          <span>✓</span>
                          <span>{t("joinedSuccess", lang)}</span>
                        </div>
                      )}
                      {p.my_accepted === false && (
                        <span className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
                          ✗ आपने मना किया है
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/pool/${p.id}`}
                      className="btn-tactile inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-100 border-2 border-amber-300 px-4 text-sm font-black text-amber-950 hover:bg-amber-200"
                    >
                      <span>💰</span>
                      <span>{t("seeEarnings", lang)}</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SECTION 2: ONE-TAP VOICE HARVEST INPUT (SPEECH-TO-TEXT) */}
      <Card
        title={t("speakMic", lang)}
        icon="🎙️"
        audioText={
          lang === "hi"
            ? "इस लाल बटन को दबाकर बोलिए, जैसे: 300 किलो टमाटर तैयार है कल। ऐप खुद ब खुद फसल की जानकारी भर देगा।"
            : "Tap the mic button and speak your crop, quantity and date. The app will auto-fill the form."
        }
      >
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4">
          <p className="text-sm font-semibold text-stone-700 mb-3">
            💡 {lang === "hi" ? "उदाहरण बोलें:" : "Say for example:"} “
            <span className="text-amber-900 font-bold">
              {lang === "hi" ? "300 किलो टमाटर, बढ़िया क्वालिटी, कल तैयार" : "300 kg tomatoes, grade A, ready tomorrow"}
            </span>
            ”
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {speechOk && (
              <button
                type="button"
                onClick={toggleMic}
                className={`btn-tactile flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-black text-white transition ${
                  listening ? "mic-recording" : "bg-red-600 hover:bg-red-700 border-2 border-red-800"
                }`}
              >
                <span className="text-2xl">{listening ? "⏹️" : "🎤"}</span>
                <span>{listening ? t("listening", lang) : t("speakMic", lang)}</span>
              </button>
            )}

            <input
              type="text"
              value={say}
              onChange={(e) => setSay(e.target.value)}
              placeholder={lang === "hi" ? "या यहां लिखकर दर्ज करें..." : "Or type harvest details here..."}
              className="h-14 flex-1 rounded-2xl border-2 border-stone-300 px-4 text-base font-medium focus:border-amber-600 focus:outline-none"
            />

            <Btn
              big
              variant="earth"
              disabled={aiBusy || say.trim().length < 2}
              onClick={() => processSpokenText(say)}
            >
              {aiBusy ? "समझ रहे हैं..." : "✓ फॉर्म भरें"}
            </Btn>
          </div>
        </div>
      </Card>

      {/* SECTION 3: VISUAL TOUCH-TO-INPUT FORM (PICTORIAL) */}
      <Card
        title={t("addHarvestTitle", lang)}
        icon="🌱"
        audioText={
          lang === "hi"
            ? "अपनी फसल का फोटो छुएं, बोरी या किलो चुनें, और फसल सुरक्षित दर्ज करने के लिए नीचे हरा बटन दबाएं।"
            : "Tap crop image, choose sacks or kg, and press the green button to save your harvest."
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

          {/* 3. Quality Grading */}
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-2">
              {t("selectQuality", lang)}
            </label>
            <QualityGradeSelector
              value={f.quality}
              onChange={(q) => setF({ ...f, quality: q })}
              lang={lang}
            />
          </div>

          {/* 4. Harvest Timeline */}
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-2">
              {t("whenHarvest", lang)}
            </label>
            <DateSelector
              value={f.harvest_date}
              onChange={(d) => setF({ ...f, harvest_date: d })}
              lang={lang}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Btn
              big
              variant="harvest"
              className="w-full text-xl"
              onClick={addHarvest}
              disabled={!f.quantity_kg || !f.harvest_date || parseFloat(f.quantity_kg) <= 0}
            >
              🌾 {t("saveHarvestBtn", lang)}
            </Btn>
          </div>
        </div>
      </Card>

      {/* SECTION 4: MY LISTINGS & MANDI COMPARISON */}
      <Card
        title={lang === "hi" ? "मेरी दर्ज फसलें और मंडी का भाव" : "My Harvests & Mandi Comparison"}
        icon="📊"
        audioText={
          lang === "hi"
            ? "यहां आपकी दर्ज फसलें हैं। 'मंडी से तुलना करें' दबाकर देखें कि अलग-अलग मंडियों में खर्चा काटने के बाद आपकी जेब में कितने रुपये बचेंगे।"
            : "Check your listed harvests and compare net profit across local mandis vs FarmPool."
        }
      >
        {listings.loading ? (
          <Loading />
        ) : !listings.data?.length ? (
          <p className="text-stone-500 text-center py-4">अभी कोई फसल दर्ज नहीं है।</p>
        ) : (
          <div className="space-y-4">
            {listings.data.map((l) => {
              const meta = CROPS_META[l.crop] || { icon: "🌾", hi: l.crop, bn: l.crop, en: l.crop };
              const cropName = meta[lang] || meta.en;
              const sacks = (l.quantity_kg / 50).toFixed(0);

              return (
                <div
                  key={l.id}
                  className="rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-stone-900 capitalize">{cropName}</span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                            ग्रेड {l.quality}
                          </span>
                          {l.source === "ivr" && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                              📞 IVR कॉल से
                            </span>
                          )}
                          {l.source === "coordinator" && (
                            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                              🤝 समन्वयक द्वारा
                            </span>
                          )}
                          {l.source === "offline" && (
                            <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                              📡 ऑफलाइन सिंक
                            </span>
                          )}
                          {l.is_offline && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                              ⏳ फोन में सुरक्षित (सिंक बाकी)
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-stone-600">
                          {l.quantity_kg} किलो (≈ {sacks} बोरी) • कटाई: {l.harvest_date}
                        </p>
                      </div>
                    </div>

                    <Btn variant="ghost" onClick={() => compare(l.id)}>
                      🔍 मंडी से तुलना करें
                    </Btn>
                  </div>

                  {/* Net Price Comparison Table */}
                  {cmp[l.id] && (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-600">
                          सीधी बात: जेब में आने वाले असली रुपये (खर्च काटकर):
                        </span>
                        <Demo />
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-stone-300 text-left text-xs font-bold text-stone-500">
                            <th className="pb-2">मंडी (Market)</th>
                            <th className="pb-2">भाव (₹/kg)</th>
                            <th className="pb-2">कुल बिक्री</th>
                            <th className="pb-2">गाड़ी भाड़ा</th>
                            <th className="pb-2">आढ़त (कमीशन)</th>
                            <th className="pb-2">पल्लेदारी</th>
                            <th className="pb-2 text-right">जेब में कुल (Net)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cmp[l.id].options.map((o: J, i: number) => (
                            <tr
                              key={o.label}
                              className={`border-b border-stone-200/60 ${
                                i === 0 ? "bg-green-100/70 font-bold text-green-950" : ""
                              }`}
                            >
                              <td className="py-2.5">
                                {o.label}
                                {i === 0 && " 🏆 (सबसे ज्यादा)"}
                              </td>
                              <td>₹{o.price_per_kg}</td>
                              <td>{rs(o.revenue)}</td>
                              <td className="text-red-700">-{rs(o.transport)}</td>
                              <td className="text-stone-600">-{rs(o.commission)}</td>
                              <td className="text-stone-600">-{rs(o.handling)}</td>
                              <td className="text-right text-base font-extrabold text-green-800">
                                {rs(o.net)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
