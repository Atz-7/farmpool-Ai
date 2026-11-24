"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import OfflineBanner from "@/components/OfflineBanner";
import { getLang, t, Lang } from "@/lib/i18n";

export default function Landing() {
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  const voicePitch =
    lang === "hi"
      ? "फार्मपूल में आपका स्वागत है। जब एक किसान अकेले मंडी जाता है, तो पूरी गाड़ी का भाड़ा उसे अकेले देना पड़ता है। फार्मपूल आसपास के किसानों को जोड़कर एक ही गाड़ी में माल भेजता है, जिससे भाड़ा बंट जाता है और हर किसान को ज्यादा मुनाफा मिलता है। यह ऐप बिना इंटरनेट भी काम करता है।"
      : "Welcome to FarmPool. Small farmers selling alone bear full transport costs. FarmPool matches buyer demand to aggregate nearby farmers into one shared shipment, increasing net take-home earnings. Works fully offline.";

  const steps = [
    {
      num: "1",
      icon: "📢",
      titleHi: "थोक खरीदार की मांग",
      titleBn: "পাইকারি ক্রেতার চাহিদা",
      titleEn: "Buyer Posts Demand",
      descHi: "खरीदार बताता है: कौन सी फसल, कितनी बोरी, किस भाव पर और कब तक चाहिए।",
      descEn: "Buyer specifies crop, quantity, quality, price band and deadline.",
    },
    {
      num: "2",
      icon: "🌾",
      titleHi: "किसानों की फसल का मिलान",
      titleBn: "কৃষকদের ফসল মেলানো",
      titleEn: "Smart Farmer Matching",
      descHi: "आसपास के उन किसानों को चुना जाता है जिनकी फसल उसी दिन तैयार है।",
      descEn: "Engine finds compatible farmers ready for pickup within vehicle capacity.",
    },
    {
      num: "3",
      icon: "🚚",
      titleHi: "साझा गाड़ी और कम भाड़ा",
      titleBn: "যৌথ পরিবহন ও কম খরচ",
      titleEn: "Shared Truck Route",
      descHi: "एक ही गाड़ी सभी किसानों के खेत से माल उठाती है — भाड़ा आपस में बंट जाता है।",
      descEn: "Optimised single pickup run splits logistics costs fairly by weight.",
    },
    {
      num: "4",
      icon: "💰",
      titleHi: "सीधा ज्यादा मुनाफा",
      titleBn: "সরাসরি বেশি লাভ",
      titleEn: "Higher Take-Home Profit",
      descHi: "हर किसान को स्क्रीन पर साफ दिखता है: अकेले के मुकाबले कितने रुपये ज्यादा बचे।",
      descEn: "Each farmer sees their exact net earnings compared to local mandi.",
    },
    {
      num: "5",
      icon: "📡",
      titleHi: "बिना इंटरनेट भी चालू",
      titleBn: "ইন্টারনেট ছাড়াই সচল",
      titleEn: "Full Offline Support",
      descHi: "खेत में नेटवर्क न हो तब भी फसल दर्ज करें, नेटवर्क आते ही सब सिंक हो जाएगा।",
      descEn: "List crops and view pools even in remote fields with zero signal.",
    },
  ];

  return (
    <div className="space-y-8">
      <OfflineBanner lang={lang} />

      {/* Hero Card */}
      <section className="relative overflow-hidden rounded-3xl rural-gradient p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold backdrop-blur-xs mb-3">
            <span>🌾 कृषि और ग्रामीण आजीविका (Rural Livelihoods)</span>
            <span>•</span>
            <span className="text-amber-200">100% Offline Ready</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            {lang === "hi"
              ? "अकेला किसान मजबूर, मिलकर किसान मजबूत!"
              : lang === "bn"
              ? "একা কৃষক অসহায়, একসাথে কৃষক শক্তিশালী!"
              : "Turning Individual Harvests into Collective Market Power."}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-green-100 font-medium leading-relaxed">
            {lang === "hi"
              ? "मंडी जाने का भारी भाड़ा अकेले मत भरिए। आसपास के किसान भाइयों के साथ एक ही गाड़ी में माल भेजें और हर बोरी पर ₹200 से ₹800 ज्यादा मुनाफा कमाएं।"
              : lang === "bn"
              ? "মণ্ডির অতিরিক্ত পরিবহন খরচ একা দেবেন না। প্রতিবেশীদের সাথে যৌথভাবে এক ট্রাকে মাল পাঠান এবং বেশি লাভ ঘরে তুলুন।"
              : "Stop paying full vehicle freight alone. FarmPool combines nearby harvests into an optimized shared vehicle, unlocking higher net earnings for every farmer."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="btn-tactile inline-flex h-14 items-center justify-center rounded-2xl bg-amber-500 px-6 text-lg font-black text-amber-950 hover:bg-amber-400"
            >
              🚀 डेमो खोलें (Open Demo)
            </Link>
            <AudioGuideBtn text={voicePitch} lang={lang} />
          </div>

          <p className="mt-4 text-xs text-green-200/90 font-medium">
            * सभी आंकड़े, किसान और खरीदार प्रदर्शन (डेमो) के लिए हैं। बिना इंटरनेट भी चलेगा।
          </p>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute -bottom-10 -right-10 select-none opacity-15 text-[180px] pointer-events-none">
          🚜
        </div>
      </section>

      {/* Quick Visual Role Selectors */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/login"
          className="btn-tactile rural-card p-6 flex items-center gap-5 hover:border-green-600 transition group"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-100 text-4xl group-hover:scale-110 transition">
            👨‍🌾
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              {lang === "hi" ? "किसानों के लिए" : "For Farmers"}
            </span>
            <h3 className="text-xl font-black text-stone-900">
              {lang === "hi" ? "मैं किसान हूँ (Farmer Login)" : "I am a Farmer"}
            </h3>
            <p className="mt-1 text-sm text-stone-600 font-medium">
              {lang === "hi"
                ? "फसल दर्ज करें, समूह आर्डर देखें और अपना मुनाफा जानें।"
                : "List harvest with voice, join pools and check net earnings."}
            </p>
          </div>
        </Link>

        <Link
          href="/login"
          className="btn-tactile rural-card p-6 flex items-center gap-5 hover:border-amber-600 transition group"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-4xl group-hover:scale-110 transition">
            🛒
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {lang === "hi" ? "खरीदारों के लिए" : "For Bulk Buyers"}
            </span>
            <h3 className="text-xl font-black text-stone-900">
              {lang === "hi" ? "मैं खरीदार हूँ (Buyer Login)" : "I am a Buyer"}
            </h3>
            <p className="mt-1 text-sm text-stone-600 font-medium">
              {lang === "hi"
                ? "थोक मांग दर्ज करें और सीधे किसान समूह से माल मंगवाएं।"
                : "Post requirements and source fresh produce in aggregated pools."}
            </p>
          </div>
        </Link>
      </section>

      {/* How it works with visual cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-soil-700">
            {lang === "hi" ? "यह कैसे काम करता है?" : "How FarmPool Works"}
          </h2>
          <AudioGuideBtn
            text={
              lang === "hi"
                ? "पांच आसान चरणों में समझें: खरीदार मांग करता है, किसान समूह बनता है, एक गाड़ी आती है, और ज्यादा मुनाफा सीधा किसान की जेब में जाता है।"
                : "Five simple steps from buyer demand to farmer net earnings."
            }
            lang={lang}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((st) => (
            <div key={st.num} className="rural-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{st.icon}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-800">
                    {st.num}
                  </span>
                </div>
                <h3 className="font-black text-stone-900 text-base">
                  {lang === "hi" ? st.titleHi : lang === "bn" ? st.titleBn : st.titleEn}
                </h3>
                <p className="mt-1 text-xs text-stone-600 leading-relaxed font-medium">
                  {lang === "hi" ? st.descHi : st.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
