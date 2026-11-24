import { STATUSES } from "@/lib/api";

const STATUS_ICONS: Record<string, string> = {
  Open: "📝",
  Matching: "🔍",
  "Pool Proposed": "🤝",
  "Awaiting Confirmation": "⏳",
  Confirmed: "✓",
  "In Transit": "🚚",
  Delivered: "✅",
};

const STATUS_NAMES_HI: Record<string, string> = {
  Open: "मांग खुली",
  Matching: "किसान खोज जारी",
  "Pool Proposed": "समूह बना",
  "Awaiting Confirmation": "स्वीकृति बाकी",
  Confirmed: "आर्डर पक्का",
  "In Transit": "गाड़ी रास्ते में",
  Delivered: "माल पहुंच गया",
};

export default function Stepper({ status }: { status: string }) {
  const currentIndex = STATUSES.indexOf(status);

  return (
    <div className="overflow-x-auto py-1">
      <ol className="flex min-w-max items-center gap-2 text-xs">
        {STATUSES.map((s, k) => {
          const isPassed = k < currentIndex;
          const isCurrent = k === currentIndex;
          const icon = STATUS_ICONS[s] || "•";
          const nameHi = STATUS_NAMES_HI[s] || s;

          return (
            <li
              key={s}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition ${
                isCurrent
                  ? "bg-green-700 text-white shadow-sm ring-2 ring-green-600/30 scale-105"
                  : isPassed
                  ? "bg-green-100 text-green-900 border border-green-300"
                  : "bg-stone-100 text-stone-400 border border-stone-200"
              }`}
            >
              <span>{icon}</span>
              <span>{nameHi}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
