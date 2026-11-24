"use client";

import { useEffect, useState } from "react";
import { getLang, setLang, Lang } from "@/lib/i18n";

export default function LanguageSelector() {
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLangChange = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLangChange);
    return () => window.removeEventListener("fp_lang_change", onLangChange);
  }, []);

  const switchLang = (target: Lang) => {
    setLang(target);
    setL(target);
  };

  return (
    <div className="flex items-center rounded-xl border border-stone-300 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => switchLang("hi")}
        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
          lang === "hi" ? "bg-amber-700 text-white shadow-xs" : "text-stone-700 hover:text-stone-900"
        }`}
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => switchLang("bn")}
        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
          lang === "bn" ? "bg-amber-700 text-white shadow-xs" : "text-stone-700 hover:text-stone-900"
        }`}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => switchLang("en")}
        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
          lang === "en" ? "bg-amber-700 text-white shadow-xs" : "text-stone-700 hover:text-stone-900"
        }`}
      >
        English
      </button>
    </div>
  );
}
