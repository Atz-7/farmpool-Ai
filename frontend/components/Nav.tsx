"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, setSession, Session } from "@/lib/api";
import LanguageSelector from "./LanguageSelector";
import { getLang, t, Lang } from "@/lib/i18n";
import { isOnline } from "@/lib/offline";

export default function Nav() {
  const [s, setS] = useState<Session | null>(null);
  const [online, setOnline] = useState(true);
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setS(getSession());
    setOnline(typeof window !== "undefined" ? navigator.onLine : true);
    setL(getLang());

    const onLang = () => setL(getLang());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("fp_lang_change", onLang);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("fp_lang_change", onLang);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const logout = () => {
    setSession(null);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-[1000] border-b-2 border-stone-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Brand Logo & Offline Dot */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-xl shadow-xs group-hover:scale-105 transition">
              🌾
            </span>
            <div>
              <span className="text-xl font-black text-soil-700 tracking-tight">
                FarmPool <span className="text-green-700">ग्रामीण</span>
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500">
                <span
                  className={`h-2 w-2 rounded-full ${
                    online ? "bg-green-600 animate-pulse" : "bg-amber-600"
                  }`}
                />
                <span>{online ? "ऑनलाइन (Online)" : "बिना इंटरनेट (Offline)"}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Navigation & Access Channel Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
          <Link
            href="/ivr"
            className="rounded-xl px-2.5 py-1.5 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1 border border-stone-200"
            title="Feature Phone IVR Simulation"
          >
            <span>📞</span>
            <span className="hidden md:inline">IVR कॉल</span>
          </Link>
          <Link
            href="/coordinator"
            className="rounded-xl px-2.5 py-1.5 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1 border border-stone-200"
            title="Village Coordinator Portal"
          >
            <span>🤝</span>
            <span className="hidden md:inline">समन्वयक</span>
          </Link>
          <Link
            href="/notifications"
            className="rounded-xl px-2.5 py-1.5 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1 border border-stone-200"
            title="SMS & Voice Notification Simulation"
          >
            <span>✉️</span>
            <span className="hidden md:inline">एसएमएस</span>
          </Link>

          <LanguageSelector />

          {s ? (
            <>
              <Link
                href={`/${s.role}`}
                className="rounded-xl bg-stone-100 px-3 py-1.5 text-stone-900 hover:bg-stone-200 transition font-black"
              >
                {t("dashboard", lang)}
              </Link>
              <Link
                href="/orders"
                className="rounded-xl px-3 py-1.5 text-stone-700 hover:bg-stone-100 transition flex items-center gap-1"
              >
                <span>🚚</span>
                <span>{t("orders", lang)}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl px-3 py-1.5 text-red-700 hover:bg-red-50 transition"
              >
                {t("logout", lang)}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-1.5 text-stone-700 hover:bg-stone-100 transition"
              >
                {t("login", lang)}
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-green-700 px-4 py-2 text-white font-black hover:bg-green-800 transition shadow-xs"
              >
                🚀 डेमो शुरू करें
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
