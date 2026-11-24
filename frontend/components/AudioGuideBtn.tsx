"use client";

import { useState, useEffect } from "react";
import { speakText, stopSpeaking } from "@/lib/voice";
import { getLang, t, Lang } from "@/lib/i18n";

export default function AudioGuideBtn({ text, lang }: { text: string; lang?: Lang }) {
  const [speaking, setSpeaking] = useState(false);
  const currentLang = lang || getLang();

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakText(text, currentLang, () => setSpeaking(false));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={speaking ? t("stopAudio") : t("listenAudio")}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        speaking
          ? "speaker-active bg-red-100 text-red-700 border border-red-300"
          : "bg-rural-sand hover:bg-rural-sandDark text-rural-soil border border-amber-200"
      }`}
    >
      <span className="text-sm">{speaking ? "⏹️" : "🔊"}</span>
      <span>{speaking ? t("stopAudio") : t("listenAudio")}</span>
    </button>
  );
}
