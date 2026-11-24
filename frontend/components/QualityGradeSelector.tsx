"use client";

import { getLang, t, Lang } from "@/lib/i18n";

export default function QualityGradeSelector({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (grade: "A" | "B" | "C") => void;
  lang?: Lang;
}) {
  const currentLang = lang || getLang();

  const GRADES: Array<{
    id: "A" | "B" | "C";
    stars: string;
    titleHi: string;
    titleBn: string;
    titleEn: string;
    descHi: string;
    descBn: string;
    descEn: string;
    border: string;
    bgActive: string;
  }> = [
    {
      id: "A",
      stars: "⭐⭐⭐",
      titleHi: "ग्रेड A (एकदम बढ़िया माल)",
      titleBn: "গ্রেড A (সেরা মান)",
      titleEn: "Grade A (Top Quality)",
      descHi: "ताजा, ठोस, एक बराबर आकार, कोई दाग नहीं",
      descBn: "তাজা, নিটোল, সমান আকার, দাগহীন",
      descEn: "Fresh, firm, uniform size, no spots",
      border: "border-green-600",
      bgActive: "bg-green-50 ring-2 ring-green-600/30",
    },
    {
      id: "B",
      stars: "⭐⭐",
      titleHi: "ग्रेड B (मध्यम मंडी माल)",
      titleBn: "গ্রেড B (মাঝারি মান)",
      titleEn: "Grade B (Standard Market)",
      descHi: "सामान्य मंडी क्वालिटी, हल्का आकार फर्क",
      descBn: "সাধারণ মণ্ডির মান, কিছুটা আকারে তারতম্য",
      descEn: "Standard commercial quality, minor variation",
      border: "border-amber-600",
      bgActive: "bg-amber-50 ring-2 ring-amber-600/30",
    },
    {
      id: "C",
      stars: "⭐",
      titleHi: "ग्रेड C (साधारण माल)",
      titleBn: "গ্রেড C (সাধারণ মান)",
      titleEn: "Grade C (Processing / Regular)",
      descHi: "स्थानीय मंडी या चटनी/प्रोसेसिंग के लिए",
      descBn: "স্থানীয় বাজার বা প্রক্রিয়াকরণের জন্য",
      descEn: "Local sale or industrial processing",
      border: "border-stone-500",
      bgActive: "bg-stone-100 ring-2 ring-stone-400/30",
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {GRADES.map((g) => {
        const isSelected = value === g.id;
        const title = currentLang === "hi" ? g.titleHi : currentLang === "bn" ? g.titleBn : g.titleEn;
        const desc = currentLang === "hi" ? g.descHi : currentLang === "bn" ? g.descBn : g.descEn;

        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(g.id)}
            className={`btn-tactile flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition ${
              isSelected ? `${g.border} ${g.bgActive}` : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <div>
              <div className="text-xl mb-1">{g.stars}</div>
              <div className="font-bold text-stone-900 text-sm sm:text-base">{title}</div>
              <div className="mt-1 text-xs text-stone-600">{desc}</div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-500">क्वालिटी {g.id}</span>
              {isSelected && (
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  ✓ चुना हुआ
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
