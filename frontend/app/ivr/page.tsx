"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, J } from "@/lib/api";
import { getLang, Lang } from "@/lib/i18n";
import { Card, Btn, Badge } from "@/components/ui";

interface DemoFarmer {
  id: number;
  name: string;
  phone: string;
  village: string;
  phone_type: string;
  preferred_language: string;
}

interface MenuOption {
  key: string;
  label: string;
}

// Web Audio DTMF Sound Synthesizer
function playDtmfTone(digit: string) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const dtmfFreqs: Record<string, [number, number]> = {
      "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
      "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
      "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
      "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
    };

    const freqs = dtmfFreqs[digit] || [770, 1336];
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.18);
  } catch {
    // Ignore audio errors if audio context blocked by browser policy
  }
}

// Web Speech API Voice Prompt Player
function speakIvrPrompt(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "bn" ? "bn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 0.95; // Slightly slower, clear cadence for rural audio clarity
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch {
    // Ignore speech errors
  }
}

export default function IVRPage() {
  const [selectedPhone, setSelectedPhone] = useState("9000000001");
  const [customPhone, setCustomPhone] = useState("");
  const [demoFarmers, setDemoFarmers] = useState<DemoFarmer[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);

  // Call status: "idle" | "incoming" | "connected" | "ended"
  const [callStatus, setCallStatus] = useState<"idle" | "incoming" | "connected" | "ended">("idle");
  const [sessionId, setSessionId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [callLang, setCallLang] = useState("hi");
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [inputType, setInputType] = useState<string>("single_digit");
  const [farmerName, setFarmerName] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [bufferInput, setBufferInput] = useState("");
  const [historyLog, setHistoryLog] = useState<{ sender: "system" | "user"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  // Ringtone interval ref
  const ringtoneTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load demo farmers
    api<DemoFarmer[]>("/ivr/demo-farmers")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDemoFarmers(data);
        }
      })
      .catch(() => {
        // Fallback default demo farmers
        setDemoFarmers([
          { id: 1, name: "Ramesh Das (demo)", phone: "9000000001", village: "Singur", phone_type: "feature_phone", preferred_language: "bn" },
          { id: 2, name: "Sukumar Pal (demo)", phone: "9000000002", village: "Dhaniakhali", phone_type: "smartphone", preferred_language: "bn" },
          { id: 4, name: "Bimal Ghosh (demo)", phone: "9000000004", village: "Bandel", phone_type: "feature_phone", preferred_language: "hi" },
        ]);
      })
      .finally(() => setLoadingFarmers(false));
  }, []);

  // Call duration counter
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (callStatus === "connected") {
      t = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(t);
  }, [callStatus]);

  // Keyboard navigation for DTMF keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (callStatus !== "connected") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const validKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];
      if (validKeys.includes(e.key)) {
        handleKeyPress(e.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [callStatus, sessionId, inputType, bufferInput]);

  const activePhone = customPhone || selectedPhone;

  // Initiate Incoming Call Simulation
  const simulateIncomingCall = () => {
    setCallStatus("incoming");
    setCallDuration(0);
    setHistoryLog([]);
    setBufferInput("");

    // Simulate phone ringing sound
    if (audioEnabled) {
      playDtmfTone("5");
      ringtoneTimer.current = setInterval(() => {
        playDtmfTone("5");
      }, 2500);
    }
  };

  // Direct Outgoing Dial
  const dialDirectCall = async () => {
    await answerCall();
  };

  // Answer call
  const answerCall = async () => {
    if (ringtoneTimer.current) {
      clearInterval(ringtoneTimer.current);
      ringtoneTimer.current = null;
    }

    setBusy(true);
    try {
      const res: J = await api("/ivr/call/initiate", {
        body: { phone: activePhone },
      });

      setSessionId(res.session_id);
      setPromptText(res.prompt_text);
      setCallLang(res.language || "hi");
      setOptions(res.options || []);
      setInputType(res.input_type || "single_digit");
      setFarmerName(res.farmer_name || "Kisan");
      setCallStatus("connected");

      setHistoryLog([{ sender: "system", text: res.prompt_text }]);

      if (audioEnabled) {
        speakIvrPrompt(res.prompt_text, res.language || "hi");
      }
    } catch (e) {
      alert("Could not connect IVR call: " + (e as Error).message);
      setCallStatus("idle");
    } finally {
      setBusy(false);
    }
  };

  // Decline / Hangup call
  const hangupCall = async () => {
    if (ringtoneTimer.current) {
      clearInterval(ringtoneTimer.current);
      ringtoneTimer.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (sessionId && callStatus === "connected") {
      try {
        await api("/ivr/call/hangup", {
          body: { session_id: sessionId, digits: "0" },
        });
      } catch {
        // Ignore
      }
    }

    setCallStatus("ended");
    setTimeout(() => {
      setCallStatus("idle");
      setSessionId("");
      setBufferInput("");
    }, 2000);
  };

  // Handle Keypad Press (0-9, *, #)
  const handleKeyPress = async (digit: string) => {
    playDtmfTone(digit);

    // If input type requires quantity with # (e.g. 200#)
    if (inputType === "number_with_pound") {
      if (digit === "#") {
        if (!bufferInput) return;
        const fullDigits = bufferInput + "#";
        setBufferInput("");
        await sendInputToIvr(fullDigits);
      } else {
        setBufferInput((prev) => prev + digit);
      }
      return;
    }

    // Single digit input
    await sendInputToIvr(digit);
  };

  const sendInputToIvr = async (digits: string) => {
    if (!sessionId || busy) return;

    setBusy(true);
    setHistoryLog((prev) => [...prev, { sender: "user", text: `[Keypad: ${digits}]` }]);

    try {
      const res: J = await api("/ivr/input", {
        body: { session_id: sessionId, digits },
      });

      setPromptText(res.prompt_text);
      if (res.language) setCallLang(res.language);
      setOptions(res.options || []);
      setInputType(res.input_type || "single_digit");

      setHistoryLog((prev) => [...prev, { sender: "system", text: res.prompt_text }]);

      if (audioEnabled) {
        speakIvrPrompt(res.prompt_text, res.language || callLang);
      }

      if (res.call_status === "ended") {
        setTimeout(() => hangupCall(), 2500);
      }
    } catch (e) {
      setPromptText("Error processing input. Returning to main menu.");
    } finally {
      setBusy(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-emerald-900 p-6 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-xs mb-2">
            <span>📞 फीचर फोन एक्सेस (Feature Phone IVR)</span>
            <span>•</span>
            <span className="text-amber-300">स्मार्टफोन व इंटरनेट के बिना</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            FarmPool AI — इंटरएक्टिव IVR हेल्पलाइन सिम्युलेटर
          </h1>
          <p className="mt-2 text-sm text-emerald-100 font-medium leading-relaxed">
            यह सिम्युलेटर दिखाता है कि कैसे एक बुनियादी कीपैड फोन रखने वाला किसान (जैसे रमेश दास) बिना किसी इंटरनेट या ऐप के, केवल वॉयस कॉल और कीपैड दबाकर अपनी फसल दर्ज कर सकता है, खरीदार के आर्डर सुन सकता है और समूह में शामिल हो सकता है।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/coordinator"
            className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-black text-white hover:bg-white/20 transition flex items-center gap-1.5"
          >
            <span>🤝</span>
            <span>ग्राम समन्वयक पोर्टल (Coordinator)</span>
          </Link>
          <Link
            href="/notifications"
            className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-900 hover:bg-amber-400 transition flex items-center gap-1.5"
          >
            <span>✉️</span>
            <span>एसएमएस सिम्युलेटर (SMS)</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Handset Mockup Container (5 cols) */}
        <div className="lg:col-span-5 flex justify-center">
          {/* Classic Phone Body */}
          <div className="relative w-full max-w-[340px] rounded-[44px] bg-stone-900 p-4 shadow-2xl border-4 border-stone-700 ring-1 ring-black">
            {/* Top Earpiece Grill */}
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-stone-700" />

            {/* Handset Screen */}
            <div className="relative overflow-hidden rounded-[26px] bg-sky-950 text-white p-4 shadow-inner min-h-[290px] flex flex-col justify-between border-2 border-stone-800 font-mono">
              {/* Screen Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-sky-300/80 border-b border-sky-800/60 pb-1 mb-2">
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span className="font-bold">FarmPool GSM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">{callLang.toUpperCase()}</span>
                  <span>🔋 94%</span>
                </div>
              </div>

              {/* IDLE SCREEN */}
              {callStatus === "idle" && (
                <div className="my-auto text-center space-y-3 py-4">
                  <div className="text-4xl">🌾</div>
                  <div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-widest">
                      FarmPool Rural IVR
                    </div>
                    <div className="text-[11px] text-sky-200 mt-0.5">
                      1800-FARMPOL (मुफ्त कॉल)
                    </div>
                  </div>
                  <div className="rounded-xl bg-sky-900/60 p-2 text-[10px] text-sky-200 text-left border border-sky-700/50">
                    <div className="font-bold text-white">किसान नंबर:</div>
                    <div className="text-amber-200 font-mono font-bold text-xs">
                      {activePhone} {farmerName ? `(${farmerName})` : ""}
                    </div>
                  </div>
                  <p className="text-[10px] text-sky-300/80">
                    नीचे दिए हरे बटन से कॉल शुरू करें
                  </p>
                </div>
              )}

              {/* INCOMING CALL SCREEN */}
              {callStatus === "incoming" && (
                <div className="my-auto text-center space-y-4 py-2 animate-pulse">
                  <div className="inline-block rounded-full bg-amber-400/20 p-4 border border-amber-400/50">
                    <span className="text-4xl animate-bounce inline-block">📞</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">कॉल आ रही है...</div>
                    <div className="text-base font-black text-white">FarmPool AI Helpline</div>
                    <div className="text-[11px] text-sky-200">1800-345-2026</div>
                  </div>
                  <div className="flex justify-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={answerCall}
                      className="rounded-2xl bg-green-500 hover:bg-green-600 px-5 py-2.5 text-xs font-black text-white shadow-lg flex items-center gap-1.5 animate-pulse"
                    >
                      <span>📞</span>
                      <span>उठाएं (Answer)</span>
                    </button>
                    <button
                      type="button"
                      onClick={hangupCall}
                      className="rounded-2xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-black text-white shadow-lg"
                    >
                      <span> काटें</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CONNECTED CALL SCREEN */}
              {callStatus === "connected" && (
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                        कॉल चालू है (Connected)
                      </span>
                      <span>{formatSeconds(callDuration)}</span>
                    </div>

                    {/* Live Voice Prompt Box */}
                    <div className="rounded-xl bg-sky-900/90 p-2.5 border border-sky-600/70 text-xs text-white leading-relaxed max-h-[140px] overflow-y-auto">
                      <div className="text-[9px] uppercase tracking-wider text-amber-300 font-black flex items-center gap-1 mb-1">
                        <span>🔊</span>
                        <span>वॉयस संदेश (Voice Prompt):</span>
                      </div>
                      <div className="font-sans font-medium text-[11px]">
                        {promptText}
                      </div>

                      {/* Number buffer if typing quantity */}
                      {inputType === "number_with_pound" && (
                        <div className="mt-2 rounded bg-sky-950 p-1.5 text-center text-amber-300 font-mono text-sm font-black border border-amber-500/40">
                          मात्रा दर्ज करें: {bufferInput || "..."} <span className="text-[10px] text-white"># दबाएं</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Keypad Guidance on Screen */}
                  {options.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                      {options.slice(0, 4).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleKeyPress(opt.key.replace("#", ""))}
                          className="rounded bg-sky-800/80 px-1.5 py-1 text-left text-sky-100 hover:bg-sky-700 truncate border border-sky-700"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CALL ENDED */}
              {callStatus === "ended" && (
                <div className="my-auto text-center space-y-2 py-6">
                  <div className="text-3xl">📴</div>
                  <div className="text-sm font-black text-red-400">कॉल समाप्त (Call Ended)</div>
                  <p className="text-[10px] text-sky-200">
                    रिकॉर्ड फार्मपूल डेटाबेस में सुरक्षित हो गया है।
                  </p>
                </div>
              )}

              {/* Screen Bottom Controls */}
              <div className="flex items-center justify-between text-[10px] border-t border-sky-800/60 pt-1 text-sky-300">
                <button
                  type="button"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="hover:text-white flex items-center gap-1"
                >
                  <span>{audioEnabled ? "🔊 आवाज चालू" : "🔇 म्यूट"}</span>
                </button>
                <span>* = मेनू | 0 = समाप्त</span>
              </div>
            </div>

            {/* Middle Nav Joypad / Softkeys */}
            <div className="my-3 flex items-center justify-between px-2">
              <button
                type="button"
                disabled={busy}
                onClick={callStatus === "idle" ? simulateIncomingCall : hangupCall}
                className={`h-11 w-16 rounded-2xl font-black text-xs shadow-md transition flex items-center justify-center ${
                  callStatus === "idle"
                    ? "bg-green-600 text-white hover:bg-green-500 active:scale-95"
                    : "bg-red-600 text-white hover:bg-red-500 active:scale-95"
                }`}
              >
                {callStatus === "idle" ? "📞 कॉल" : " काटें"}
              </button>

              <div className="flex h-12 w-16 items-center justify-center rounded-2xl bg-stone-800 border-2 border-stone-700 text-stone-400 text-xs font-bold">
                OK
              </div>

              <button
                type="button"
                disabled={busy || callStatus !== "connected"}
                onClick={() => handleKeyPress("*")}
                className="h-11 w-16 rounded-2xl bg-stone-800 border border-stone-700 text-amber-300 font-black text-xs hover:bg-stone-700 active:scale-95 flex items-center justify-center"
              >
                * मेनू
              </button>
            </div>

            {/* Tactical 12-Button Keypad Grid */}
            <div className="grid grid-cols-3 gap-2 px-1">
              {[
                { k: "1", sub: ". -" },
                { k: "2", sub: "ABC" },
                { k: "3", sub: "DEF" },
                { k: "4", sub: "GHI" },
                { k: "5", sub: "JKL" },
                { k: "6", sub: "MNO" },
                { k: "7", sub: "PQRS" },
                { k: "8", sub: "TUV" },
                { k: "9", sub: "WXYZ" },
                { k: "*", sub: "Menu" },
                { k: "0", sub: "End" },
                { k: "#", sub: "Send" },
              ].map(({ k, sub }) => (
                <button
                  key={k}
                  type="button"
                  disabled={busy || callStatus !== "connected"}
                  onClick={() => handleKeyPress(k)}
                  className={`btn-tactile flex flex-col items-center justify-center rounded-2xl py-2 px-1 transition ${
                    callStatus === "connected"
                      ? "bg-stone-800 text-white hover:bg-stone-700 active:bg-amber-600 active:text-white border border-stone-700"
                      : "bg-stone-900/60 text-stone-600 border border-stone-800 cursor-not-allowed"
                  }`}
                >
                  <span className="text-base font-black leading-none">{k}</span>
                  <span className="text-[8px] font-bold text-stone-400 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>

            {/* Bottom Microphone Hole */}
            <div className="mx-auto mt-3 h-1 w-1 rounded-full bg-stone-700" />
          </div>
        </div>

        {/* Right Interactive Simulator Controls & Walkthrough (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Select Farmer Persona */}
          <Card
            title="1. किसान चुनें या फोन नंबर दर्ज करें (Select Farmer)"
            icon="👨‍🌾"
          >
            <p className="text-xs text-stone-600 mb-3 font-medium">
              जिस किसान के रूप में आप IVR कॉल का परीक्षण करना चाहते हैं, उसे चुनें:
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {demoFarmers.map((f) => (
                <button
                  key={f.phone}
                  type="button"
                  onClick={() => {
                    setSelectedPhone(f.phone);
                    setCustomPhone("");
                    setFarmerName(f.name);
                  }}
                  className={`flex flex-col text-left p-3 rounded-2xl border-2 transition ${
                    activePhone === f.phone
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-stone-900 text-sm">{f.name}</span>
                    <Badge color={f.phone_type === "feature_phone" ? "amber" : "green"}>
                      {f.phone_type === "feature_phone" ? "कीपैड फोन" : "स्मार्टफोन"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-stone-600 font-mono">
                    <span>{f.phone}</span>
                    <span>📍 {f.village}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-stone-200">
              <Btn
                variant="harvest"
                disabled={busy || callStatus !== "idle"}
                onClick={simulateIncomingCall}
                className="text-sm font-black flex items-center gap-1.5"
              >
                <span>📲</span>
                <span>FarmPool से इनकमिंग कॉल लाएं (Simulate Incoming Call)</span>
              </Btn>

              <Btn
                variant="ghost"
                disabled={busy || callStatus !== "idle"}
                onClick={dialDirectCall}
                className="text-sm font-bold flex items-center gap-1.5 text-stone-700"
              >
                <span>📞</span>
                <span>सीधा कॉल लगाएं (Direct Outgoing Dial)</span>
              </Btn>
            </div>
          </Card>

          {/* Step 2: Demonstration Walkthrough Card */}
          <Card
            title="2. डेमो परिदृश्य: रमेश दास 200 किलो टमाटर दर्ज करते हैं"
            icon="🍅"
          >
            <div className="space-y-3 text-xs leading-relaxed text-stone-700 font-medium">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                <span className="font-black text-amber-900">चरण-दर-चरण डेमो गाइड:</span>
                <ol className="mt-1.5 list-decimal list-inside space-y-1 text-stone-800">
                  <li>
                    <strong>भाषा चुनें:</strong> कॉल उठने पर <strong>1</strong> (বাংলা) या <strong>2</strong> (हिंदी) दबाएं।
                  </li>
                  <li>
                    <strong>फसल दर्ज करें:</strong> मुख्य मेनू में <strong>1</strong> दबाएं।
                  </li>
                  <li>
                    <strong>फसल चुनें:</strong> टमाटर के लिए <strong>1</strong> दबाएं।
                  </li>
                  <li>
                    <strong>मात्रा दर्ज करें:</strong> कीपैड से <strong>200#</strong> दबाएं।
                  </li>
                  <li>
                    <strong>उपलब्धता दिन:</strong> कल के लिए <strong>2</strong> दबाएं।
                  </li>
                  <li>
                    <strong>गुणवत्ता:</strong> ग्रेड A के लिए <strong>1</strong> दबाएं।
                  </li>
                </ol>
              </div>

              <p className="text-stone-600">
                ✅ <strong>परिणाम:</strong> यह फसल सीधे मुख्य फार्मपूल डेटाबेस में सुरक्षित हो जाती है। आप इसे 
                <Link href="/farmer" className="text-green-700 font-bold ml-1 underline">
                  किसान डैशबोर्ड
                </Link> या 
                <Link href="/buyer" className="text-green-700 font-bold ml-1 underline">
                  खरीदार पूलिंग इंजन
                </Link> में तुरंत देख सकते हैं!
              </p>
            </div>
          </Card>

          {/* Step 3: Live Interactive Transcript Log */}
          <Card
            title="3. लाइव कॉल संवाद लॉग (Call Transcript Log)"
            icon="📜"
          >
            <div className="rounded-2xl bg-stone-900 p-4 text-xs font-mono text-stone-200 max-h-[220px] overflow-y-auto space-y-2 border border-stone-800">
              {historyLog.length === 0 ? (
                <div className="text-stone-500 italic text-center py-4">
                  कॉल शुरू होने पर बातचीत का पूरा ट्रांसक्रिप्ट यहाँ दिखेगा...
                </div>
              ) : (
                historyLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${
                      log.sender === "user" ? "text-amber-300 justify-end" : "text-sky-300"
                    }`}
                  >
                    <span className="font-bold opacity-75">
                      {log.sender === "user" ? "👤 किसान:" : "🤖 FarmPool IVR:"}
                    </span>
                    <span>{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
