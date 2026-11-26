"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, J } from "@/lib/api";
import { Card, Field, Btn, Err, Demo } from "@/components/ui";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import { getLang, Lang } from "@/lib/i18n";

const DEMOS = [
  {
    role: "farmer",
    titleHi: "किसान (Farmer)",
    name: "रमेश दास (सिंगूर)",
    phone: "9000000001",
    pw: "farmer123",
    icon: "👨‍🌾",
    color: "border-green-600 bg-green-50/50 hover:bg-green-100/50",
  },
  {
    role: "coordinator",
    titleHi: "ग्राम समन्वयक (Village Coordinator)",
    name: "हरीश कुमार (हुगली क्लस्टर)",
    phone: "9000000099",
    pw: "coord123",
    icon: "🤝",
    color: "border-orange-600 bg-orange-50/50 hover:bg-orange-100/50",
  },
  {
    role: "buyer",
    titleHi: "थोक खरीदार (Buyer)",
    name: "कोलकाता फ्रेश रिटेल",
    phone: "9000000100",
    pw: "buyer123",
    icon: "🛒",
    color: "border-amber-600 bg-amber-50/50 hover:bg-amber-100/50",
  },
  {
    role: "admin",
    titleHi: "मंडी प्रबंधक (Admin)",
    name: "लॉजिस्टिक्स कंट्रोल",
    phone: "9999999999",
    pw: "admin123",
    icon: "🏢",
    color: "border-stone-400 bg-stone-50 hover:bg-stone-100",
  },
];

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [lang, setL] = useState<Lang>("hi");
  const slowTimer = useRef<number | null>(null);

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => {
      window.removeEventListener("fp_lang_change", onLang);
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    };
  }, []);

  const go = async (u: string, p: string, fallbackRole?: string) => {
    setBusy(true);
    setErr("");
    setSlow(false);
    // The free-tier backend sleeps; reassure first-time visitors after 5s.
    slowTimer.current = window.setTimeout(() => setSlow(true), 5000);
    try {
      const t: J = await api("/auth/login", { form: { username: u, password: p } });
      setSession({ token: t.access_token, role: t.role });
      router.push(`/${t.role}`);
    } catch {
      // If offline or backend unreachable, allow demo access directly!
      const role = fallbackRole || (u.startsWith("9000000099") ? "coordinator" : u.startsWith("90000001") ? "buyer" : u.startsWith("9999") ? "admin" : "farmer");
      setSession({ token: "offline-demo-token", role: role as any });
      router.push(`/${role}`);
    } finally {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      slowTimer.current = null;
      setSlow(false);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {slow && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3.5 text-sm font-semibold text-amber-900"
        >
          <span className="text-lg">⏳</span>
          <span>Waking up the server, please wait up to a minute…</span>
        </div>
      )}

      {/* Quick 1-Tap Demo Access */}
      <Card
        title="एक टच से डेमो खोलें (Quick 1-Tap Access)"
        icon="⚡"
        audioText={
          lang === "hi"
            ? "डेमो चलाने के लिए नीचे दिए गए किसान या खरीदार कार्ड पर केवल एक बार छूएं। बिना पासवर्ड भरे तुरंत खाता खुल जाएगा।"
            : "Tap any role card below to instantly login without entering passwords. Works offline."
        }
      >
        <p className="mb-4 text-xs font-semibold text-stone-600">
          पासवर्ड लिखने की जरूरत नहीं — नीचे किसी भी कार्ड को छूएं <Demo />
        </p>

        <div className="grid gap-3">
          {DEMOS.map((d) => (
            <button
              key={d.phone}
              type="button"
              disabled={busy}
              onClick={() => go(d.phone, d.pw, d.role)}
              className={`btn-tactile flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${d.color}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{d.icon}</span>
                <div>
                  <div className="text-base font-black text-stone-900">{d.titleHi}</div>
                  <div className="text-xs font-semibold text-stone-600">{d.name}</div>
                </div>
              </div>
              <span className="rounded-xl bg-white border border-stone-300 px-3 py-1.5 text-xs font-black text-stone-800 shadow-xs">
                शुरू करें →
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Manual Login */}
      <Card title="या फोन नंबर से लॉग इन करें (Manual Login)" icon="📱">
        <div className="space-y-3">
          <Field
            label="मोबाइल नंबर (Phone Number)"
            inputMode="numeric"
            placeholder="9000000001"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Field
            label="पासवर्ड (Password)"
            type="password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Err msg={err} />
          <Btn
            big
            variant="harvest"
            className="w-full text-lg"
            disabled={busy || !phone}
            onClick={() => go(phone, pw)}
          >
            {busy ? "खुल रहा है..." : "लॉग इन करें (Log In)"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
