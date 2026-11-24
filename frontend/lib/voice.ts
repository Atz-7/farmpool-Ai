"use client";

import { Lang } from "./i18n";

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function speakText(text: string, lang: Lang = "hi", onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    if (onEnd) onEnd();
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-IN" : "en-IN";
  utterance.lang = langCode;
  utterance.rate = 0.95; // Slightly slower, clear pace for rural users

  // Try to pick a natural regional voice if available
  const voices = window.speechSynthesis.getVoices();
  const regionalVoice = voices.find((v) => v.lang === langCode || v.lang.startsWith(lang));
  if (regionalVoice) {
    utterance.voice = regionalVoice;
  }

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export interface ParsedHarvestResult {
  crop?: string;
  quantity_kg?: number;
  quality?: "A" | "B" | "C";
  harvest_date?: string;
  confidence: number;
  summary: string;
}

export function parseVoiceHarvestOffline(rawText: string): ParsedHarvestResult {
  const t = rawText.toLowerCase().trim();
  const res: ParsedHarvestResult = {
    confidence: 0.5,
    summary: rawText,
  };

  // 1. Detect Crop
  if (/tomato|tamatar|टमाटर|টমেটো/.test(t)) res.crop = "tomato";
  else if (/potato|aalu|aloo|आलू|আলু/.test(t)) res.crop = "potato";
  else if (/onion|pyaaz|pyaz|प्याज|পেঁয়াজ/.test(t)) res.crop = "onion";
  else if (/spinach|palak|पालक|পালং/.test(t)) res.crop = "spinach";
  else if (/wheat|gehu|gehun|गेहूं|গম/.test(t)) res.crop = "wheat";

  // 2. Detect Quantity (kg or sacks / bori / bosta)
  // Check sacks: e.g. "4 bori", "10 boori", "5 bosta"
  const sackMatch = t.match(/(\d+)\s*(?:bori|boori|बोरी|bosta|বস্তা|sacks?|bag|bags?)/);
  if (sackMatch) {
    const sacks = parseInt(sackMatch[1], 10);
    res.quantity_kg = sacks * 50;
  } else {
    // Check direct kg / kilo: e.g. "300 kg", "250 kilo", "५०० किलो"
    const kgMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|किलो|केजी|কেজি)?/);
    if (kgMatch && parseFloat(kgMatch[1]) > 0) {
      res.quantity_kg = parseFloat(kgMatch[1]);
    }
  }

  // 3. Detect Quality
  if (/grade\s*a|badiya|uttam|best|टॉप|बढ़िया|সেরা|প্রথম/.test(t)) {
    res.quality = "A";
  } else if (/grade\s*b|medium|madhyam|good|मध्यम|ভালো/.test(t)) {
    res.quality = "B";
  } else if (/grade\s*c|regular|sadharan|साधारण|সাধারণ/.test(t)) {
    res.quality = "C";
  }

  // 4. Detect Date
  const today = new Date();
  if (/aaj|today|आज|আজ/.test(t)) {
    res.harvest_date = today.toISOString().split("T")[0];
  } else if (/kal|tomorrow|कल|কাল/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    res.harvest_date = d.toISOString().split("T")[0];
  } else if (/parso|2\s*din|2\s*days|परसों|২\s*দিন/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    res.harvest_date = d.toISOString().split("T")[0];
  }

  return res;
}
