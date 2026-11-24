"use client";

import { getLang, t, Lang } from "@/lib/i18n";

export default function DateSelector({
  value,
  onChange,
  label,
  lang,
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  lang?: Lang;
}) {
  const currentLang = lang || getLang();

  const getDateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);
  const in2DaysStr = getDateStr(2);
  const in7DaysStr = getDateStr(7);

  const OPTIONS = [
    { labelHi: "आज", labelBn: "আজ", labelEn: "Today", date: todayStr, icon: "🌅" },
    { labelHi: "कल", labelBn: "কাল", labelEn: "Tomorrow", date: tomorrowStr, icon: "📅" },
    { labelHi: "2 दिन में", labelBn: "২ দিনে", labelEn: "In 2 Days", date: in2DaysStr, icon: "⏳" },
    { labelHi: "1 हफ्ते में", labelBn: "১ সপ্তাহে", labelEn: "In 1 Week", date: in7DaysStr, icon: "🗓️" },
  ];

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold text-stone-700">{label}</label>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.date;
          const text = currentLang === "hi" ? opt.labelHi : currentLang === "bn" ? opt.labelBn : opt.labelEn;

          return (
            <button
              key={opt.date}
              type="button"
              onClick={() => onChange(opt.date)}
              className={`btn-tactile flex items-center justify-center gap-1.5 rounded-xl border-2 py-3 px-2 text-sm font-bold transition ${
                isSelected
                  ? "border-amber-600 bg-amber-100 text-amber-950 ring-2 ring-amber-500/20"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span>{opt.icon}</span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1 text-xs text-stone-500">
        <span>या सटीक तारीख चुनें:</span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>
  );
}
