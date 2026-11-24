"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, J } from "@/lib/api";
import { Card, Btn, Field, Badge, Loading } from "@/components/ui";

interface NotificationItem {
  id: number;
  phone: string;
  channel: "sms" | "voice";
  type: string;
  message: string;
  related_pool_id: number | null;
  status: "sent" | "delivered" | "replied";
  reply_text: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [phoneFilter, setPhoneFilter] = useState("9000000001");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyInput, setReplyInput] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Test Dispatch Form
  const [testForm, setTestForm] = useState({
    phone: "9000000001",
    type: "buyer_offer",
    message: "FarmPool AI: A buyer has offered ₹24-28/kg for your tomatoes. Your estimated transport contribution is ₹1.4/kg. Reply 1 to accept or 2 to reject.",
  });

  const loadNotifications = async () => {
    try {
      const q = phoneFilter ? `?phone=${phoneFilter}` : "";
      const res: J = await api(`/notifications${q}`);
      if (Array.isArray(res)) {
        setNotifications(res);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [phoneFilter]);

  // Simulate Inbound SMS Reply
  const sendReply = async (notifId: number, text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setStatusMsg("");
    try {
      const res: J = await api("/notifications/simulate-reply", {
        body: { notification_id: notifId, reply_text: text },
      });
      setStatusMsg(
        res.accepted
          ? "✅ एसएमएस उत्तर '1' भेजा गया: खरीदार का समूह आर्डर स्वीकार हुआ!"
          : "❌ एसएमएस उत्तर भेजा गया।"
      );
      setReplyInput((prev) => ({ ...prev, [notifId]: "" }));
      await loadNotifications();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Dispatch Test Notification
  const dispatchTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/notifications/send", {
        body: {
          phone: testForm.phone,
          message: testForm.message,
          type: testForm.type,
        },
      });
      setStatusMsg("नया सिम्युलेटेड एसएमएस सफलतापूर्वक भेजा गया!");
      await loadNotifications();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const NOTIF_TEMPLATES: Record<string, string> = {
    buyer_offer: "FarmPool AI: A buyer has offered ₹24-28/kg for your tomatoes. Your estimated transport contribution is ₹1.4/kg. Reply 1 to accept or 2 to reject.",
    pool_confirmation: "FarmPool AI: Pool #1 is CONFIRMED! 4 farmers joined for 1,000 kg shipment. Vehicle: Mini-truck. Scheduled pickup: Tomorrow 8:00 AM.",
    pickup_schedule: "FarmPool AI: Pickup vehicle is scheduled to arrive at your Singur collection point tomorrow between 8:30 AM - 9:00 AM.",
    transport_update: "FarmPool AI: Vehicle is on the way. Current stop: Dhaniakhali. Estimated arrival in Singur: 35 minutes.",
    delivery: "FarmPool AI: Produce delivered successfully to Kolkata collection hub! All crates inspected and received.",
    payment: "FarmPool AI: Payment estimate finalized: Gross ₹6,500 - Transport ₹350 = Net Take-Home ₹6,150. Statement ready in app.",
  };

  const handleTemplateChange = (type: string) => {
    setTestForm({
      ...testForm,
      type,
      message: NOTIF_TEMPLATES[type] || testForm.message,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-blue-950 p-6 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-xs mb-2">
            <span>✉️ एसएमएस व वॉयस अलर्ट सिम्युलेटर (SMS & Voice Notification)</span>
            <span>•</span>
            <span className="text-amber-300">टू-वे इंटरएक्टिव रिप्लाई</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            FarmPool AI — एसएमएस व सूचना इतिहास
          </h1>
          <p className="mt-2 text-sm text-blue-100 font-medium leading-relaxed">
            कीपैड फोन रखने वाले किसानों को खरीदार के नए आर्डर, पिकअप समय, वाहन ट्रैकिंग और भुगतान की जानकारी एसएमएस व वॉयस कॉल द्वारा मिलती है। किसान एसएमएस का उत्तर देकर (जैसे 1 या 2) आर्डर स्वीकार भी कर सकते हैं।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ivr"
            className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/20 transition flex items-center gap-1.5"
          >
            <span>📞</span>
            <span>IVR हेल्पलाइन सिम्युलेटर</span>
          </Link>
          <Link
            href="/farmer"
            className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-900 hover:bg-amber-400 transition"
          >
            👨‍🌾 किसान डैशबोर्ड
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500 p-4 text-sm font-black text-emerald-900 flex items-center gap-2">
          <span>🔔</span>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Simulated Phone SMS Inbox (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="सिम्युलेटेड किसान एसएमएस इनबॉक्स (Simulated SMS Inbox)"
            icon="📱"
          >
            {/* Phone Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-stone-200">
              <span className="text-xs font-bold text-stone-600">किसान नंबर चुनें:</span>
              {[
                { phone: "9000000001", name: "रमेश दास (Singur)" },
                { phone: "9000000002", name: "सुकुमार पाल" },
                { phone: "9000000004", name: "बिमल घोष" },
                { phone: "", name: "सभी सूचनाएं (All)" },
              ].map((p) => (
                <button
                  key={p.phone}
                  type="button"
                  onClick={() => setPhoneFilter(p.phone)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                    phoneFilter === p.phone
                      ? "bg-blue-900 text-white shadow-xs"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {loading ? (
              <Loading />
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-stone-500 text-sm font-medium">
                इस फोन नंबर के लिए अभी कोई एसएमएस नहीं है। दाईं ओर दिए गए फॉर्म से एक टेस्ट एसएमएस भेजें।
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-3xl border-2 border-stone-200 bg-stone-50 p-4 space-y-3 shadow-xs"
                  >
                    {/* SMS Bubble Header */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-950 font-mono">
                          {n.phone}
                        </span>
                        <Badge
                          color={
                            n.type === "buyer_offer"
                              ? "amber"
                              : n.type === "pool_confirmation"
                              ? "green"
                              : "stone"
                          }
                        >
                          {n.type.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* SMS Message Bubble */}
                    <div className="rounded-2xl bg-white p-3.5 border border-stone-200 text-xs sm:text-sm text-stone-900 font-medium leading-relaxed shadow-inner">
                      {n.message}
                    </div>

                    {/* Inbound Reply Actions (if offer) */}
                    <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs">
                        {n.status === "replied" ? (
                          <span className="font-bold text-green-700 flex items-center gap-1">
                            <span>✅ उत्तर दर्ज:</span>
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-stone-900 font-mono">
                              "{n.reply_text}"
                            </span>
                          </span>
                        ) : (
                          <span className="text-stone-500 text-[11px]">
                            {n.type === "buyer_offer"
                              ? "👇 उत्तर देकर आर्डर स्वीकार करें:"
                              : "सूचना प्राप्त हुई (Delivered)"}
                          </span>
                        )}
                      </div>

                      {/* Quick 1-Tap Reply Buttons */}
                      {n.type === "buyer_offer" && n.status !== "replied" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => sendReply(n.id, "1")}
                            className="rounded-xl bg-green-700 hover:bg-green-800 px-3 py-1 text-xs font-black text-white shadow-xs"
                          >
                            Reply "1" (Accept)
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => sendReply(n.id, "2")}
                            className="rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 px-3 py-1 text-xs font-bold"
                          >
                            Reply "2" (Decline)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Dispatch Simulator & Telephony Architecture (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dispatcher Card */}
          <Card
            title="टेस्ट अधिसूचना भेजें (Simulate Dispatch)"
            icon="📤"
          >
            <p className="text-xs text-stone-600 mb-3 font-medium">
              सिस्टम में विभिन्न चरणों के एसएमएस का परीक्षण करने के लिए नीचे दिए गए टेम्पलेट चुनें:
            </p>

            <form onSubmit={dispatchTestNotification} className="space-y-3">
              <Field
                label="प्राप्तकर्ता फोन (Recipient Phone)"
                value={testForm.phone}
                onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })}
              />

              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                  अधिसूचना प्रकार (Template)
                </label>
                <select
                  value={testForm.type}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-stone-300 p-2.5 text-xs font-bold bg-white text-stone-900"
                >
                  <option value="buyer_offer">1. New Buyer Offer (खरीदार का आर्डर)</option>
                  <option value="pool_confirmation">2. Pool Confirmed (समूह आर्डर पक्का)</option>
                  <option value="pickup_schedule">3. Pickup Schedule (पिकअप समय)</option>
                  <option value="transport_update">4. In Transit Update (वाहन रास्ते में)</option>
                  <option value="delivery">5. Delivery Confirmation (डिलीवरी पूर्ण)</option>
                  <option value="payment">6. Payment Status (मुनाफा व भुगतान)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                  एसएमएस संदेश (SMS Message)
                </label>
                <textarea
                  rows={3}
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  className="w-full rounded-2xl border-2 border-stone-300 p-3 text-xs font-medium text-stone-900"
                />
              </div>

              <Btn
                big
                variant="harvest"
                className="w-full text-xs font-black"
                disabled={busy}
              >
                {busy ? "भेजा जा रहा है..." : "📨 सिम्युलेटेड एसएमएस भेजें (Dispatch SMS)"}
              </Btn>
            </form>
          </Card>

          {/* Telephony Architecture Note */}
          <Card
            title="टेलीफोनी सर्विस आर्किटेक्चर (Modular Architecture)"
            icon="⚙️"
          >
            <div className="space-y-2 text-xs text-stone-700 leading-relaxed font-medium">
              <p>
                FarmPool AI का टेलीफोनी व एसएमएस मॉड्यूल एक <strong>क्लीन सर्विस एब्स्ट्रैक्शन (Service Abstraction)</strong> का उपयोग करता है:
              </p>
              <div className="rounded-xl bg-stone-100 p-2.5 font-mono text-[11px] text-stone-800">
                Core Engine ➔ SMSService / TelephonyService ➔ MockGateway / Twilio / Exotel / Gupshup
              </div>
              <p className="text-[11px] text-stone-500">
                * उत्पादन परिवेश में किसी भी दूरसंचार प्राधिकरण या ऑपरेटर गेटवे (TRAI DLT पंजीकृत) को बिना किसी कोर कोड बदले केवल एक प्लग-इन से जोड़ा जा सकता है।
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
