"use client";

import { getLang, t, Lang } from "@/lib/i18n";

export default function SackQuantitySelector({
  value,
  onChange,
  lang,
}: {
  value: string | number;
  onChange: (kg: string) => void;
  lang?: Lang;
}) {
  const currentLang = lang || getLang();
  const numValue = Math.max(0, parseFloat(String(value)) || 0);
  const sacks = (numValue / 50).toFixed(1).replace(".0", "");

  const adjust = (delta: number) => {
    const updated = Math.max(0, numValue + delta);
    onChange(updated > 0 ? String(updated) : "");
  };

  const preset = (kg: number) => {
    onChange(String(kg));
  };

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4">
      {/* Sacks Visual Display */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div>
          <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
            {t("selectQuantity", currentLang)}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-extrabold text-amber-950">{numValue}</span>
            <span className="text-base font-bold text-amber-800">kg (किलो)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1.5 border border-amber-300">
          <span className="text-2xl">🎒</span>
          <div>
            <div className="text-xs text-amber-800 font-medium">{t("sacks", currentLang)}</div>
            <div className="text-lg font-bold text-amber-950">
              ≈ {sacks} {currentLang === "hi" ? "बोरी" : currentLang === "bn" ? "বস্তা" : "sacks"}
            </div>
          </div>
        </div>
      </div>

      {/* Big + / - Stepper buttons */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => adjust(-50)}
          disabled={numValue <= 0}
          className="btn-tactile flex h-14 flex-1 items-center justify-center rounded-2xl bg-white border-2 border-stone-300 text-2xl font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          - 50 kg
        </button>
        <button
          type="button"
          onClick={() => adjust(-10)}
          disabled={numValue <= 0}
          className="btn-tactile flex h-14 w-16 items-center justify-center rounded-2xl bg-white border-2 border-stone-300 text-xl font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
        >
          -10
        </button>

        {/* Direct input fallback */}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-28 rounded-2xl border-2 border-amber-400 bg-white text-center text-2xl font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          type="button"
          onClick={() => adjust(10)}
          className="btn-tactile flex h-14 w-16 items-center justify-center rounded-2xl bg-white border-2 border-stone-300 text-xl font-bold text-stone-700 hover:bg-stone-50"
        >
          +10
        </button>
        <button
          type="button"
          onClick={() => adjust(50)}
          className="btn-tactile flex h-14 flex-1 items-center justify-center rounded-2xl bg-green-700 border-2 border-green-800 text-2xl font-bold text-white hover:bg-green-800"
        >
          + 50 kg
        </button>
      </div>

      {/* Quick Presets */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-stone-500 self-center">जल्दी चुनें:</span>
        {[100, 250, 500, 1000].map((kg) => (
          <button
            key={kg}
            type="button"
            onClick={() => preset(kg)}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            {kg} kg ({kg / 50} बोरी)
          </button>
        ))}
      </div>
    </div>
  );
}
