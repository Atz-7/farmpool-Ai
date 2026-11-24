"use client";

import { CROPS_META, getLang, Lang } from "@/lib/i18n";

export default function CropSelector({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (crop: string) => void;
  lang?: Lang;
}) {
  const currentLang = lang || getLang();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {Object.entries(CROPS_META).map(([key, meta]) => {
        const isSelected = value.toLowerCase() === key.toLowerCase();
        const localizedName = meta[currentLang] || meta.en;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`btn-tactile flex flex-col items-center justify-center rounded-2xl p-3 text-center transition border-2 ${
              isSelected
                ? "border-green-600 bg-green-50 shadow-md ring-2 ring-green-500/30"
                : "border-stone-200 bg-white hover:border-amber-300 hover:bg-stone-50"
            }`}
          >
            <span className="text-4xl mb-1 filter drop-shadow-sm">{meta.icon}</span>
            <span className={`text-base font-bold ${isSelected ? "text-green-800" : "text-stone-800"}`}>
              {localizedName}
            </span>
            <span className="text-xs text-stone-500 capitalize">{meta.en}</span>
            {isSelected && (
              <span className="mt-1 inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                ✓ चुनी गई
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
