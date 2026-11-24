"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, J } from "@/lib/api";
import { Card, Field, Btn, Err } from "@/components/ui";

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [f, setF] = useState({ name: "", phone: "", password: "", village: "", lat: "", lng: "", org_name: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setF((x) => ({ ...x, lat: p.coords.latitude.toFixed(5), lng: p.coords.longitude.toFixed(5) })),
      () => setErr("स्थान नहीं मिल पाया; कृपया हाथ से दर्ज करें।")
    );

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const body: J = { name: f.name, phone: f.phone, password: f.password, role };
      if (role === "farmer") {
        Object.assign(body, { village: f.village, lat: parseFloat(f.lat) || 22.81, lng: parseFloat(f.lng) || 88.22 });
      } else {
        body.org_name = f.org_name || f.name;
      }
      const t: J = await api("/auth/register", { body });
      setSession({ token: t.access_token, role: t.role });
      router.push(`/${t.role}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card title="नया खाता बनाएं (Create Account)" icon="📝">
        <div className="space-y-4">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-3">
            {(["farmer", "buyer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`btn-tactile flex items-center justify-center gap-2 rounded-2xl border-2 py-3 px-2 text-base font-black transition ${
                  role === r
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{r === "farmer" ? "👨‍🌾" : "🛒"}</span>
                <span>{r === "farmer" ? "मैं किसान हूँ" : "मैं खरीदार हूँ"}</span>
              </button>
            ))}
          </div>

          <Field
            label="पूरा नाम (Full Name)"
            placeholder="जैसे: रमेश दास"
            value={f.name}
            onChange={set("name")}
          />
          <Field
            label="मोबाइल नंबर (10 अंकों का फोन नंबर)"
            inputMode="numeric"
            placeholder="9000000001"
            value={f.phone}
            onChange={set("phone")}
          />
          <Field
            label="गुप्त पासवर्ड (कम से कम 6 अंक)"
            type="password"
            placeholder="••••••••"
            value={f.password}
            onChange={set("password")}
          />

          {role === "farmer" ? (
            <>
              <Field
                label="गांव का नाम (Village Name)"
                placeholder="जैसे: सिंगूर, हुगली"
                value={f.village}
                onChange={set("village")}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field label="अक्षांश (Latitude)" placeholder="22.810" value={f.lat} onChange={set("lat")} />
                <Field label="देशांतर (Longitude)" placeholder="88.228" value={f.lng} onChange={set("lng")} />
              </div>
              <Btn variant="ghost" className="w-full" onClick={locate}>
                📍 मेरा वर्तमान स्थान भरें (Current Location)
              </Btn>
            </>
          ) : (
            <Field
              label="प्रतिष्ठान / व्यापार का नाम (Business Name)"
              placeholder="जैसे: कोलकाता फ्रेश रिटेल"
              value={f.org_name}
              onChange={set("org_name")}
            />
          )}

          <Err msg={err} />
          <Btn
            big
            variant="harvest"
            className="w-full text-xl"
            disabled={busy || !f.name || !f.phone}
            onClick={submit}
          >
            {busy ? "खाता बन रहा है..." : "खाता सुरक्षित बनाएं (Register)"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
