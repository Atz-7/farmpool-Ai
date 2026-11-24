"use client";

import { useState, useEffect } from "react";
import { api, getSession, J } from "@/lib/api";
import { useRole, useLoad } from "@/lib/hooks";
import { Card, Btn, Err, Loading, Badge } from "@/components/ui";
import Stepper from "@/components/Stepper";
import OfflineBanner from "@/components/OfflineBanner";
import AudioGuideBtn from "@/components/AudioGuideBtn";
import { getLang, Lang } from "@/lib/i18n";

export default function Orders() {
  const s = useRole(["farmer", "buyer", "admin", "coordinator"]);
  const o = useLoad<J[]>(s ? "/orders" : null);
  const [err, setErr] = useState("");
  const [lang, setL] = useState<Lang>("hi");

  useEffect(() => {
    setL(getLang());
    const onLang = () => setL(getLang());
    window.addEventListener("fp_lang_change", onLang);
    return () => window.removeEventListener("fp_lang_change", onLang);
  }, []);

  const advance = async (id: number) => {
    try {
      await api(`/shipments/${id}/advance`, { method: "POST" });
      o.reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (!s || o.loading) return <Loading />;

  return (
    <div className="space-y-6">
      <OfflineBanner lang={lang} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-soil-700">
            🚚 {lang === "hi" ? "आर्डर व गाड़ी ट्रैकिंग" : "Order & Vehicle Tracking"}
          </h1>
          <p className="text-sm text-stone-600 font-medium">
            {lang === "hi"
              ? "पक्के हुए आर्डर और खेत से खरीदार तक गाड़ी की स्थिति यहां देखें।"
              : "Track confirmed shipments from farmer farms to destination hub."}
          </p>
        </div>
        <AudioGuideBtn
          text={
            lang === "hi"
              ? "यह आर्डर ट्रैकिंग पृष्ठ है। यहां आप देख सकते हैं कि कौन सी गाड़ी खेत से माल लेकर निकल चुकी है और कब तक पहुंचेगी।"
              : "Order tracking page. Check shipment progress and status."
          }
          lang={lang}
        />
      </div>

      <Err msg={err || o.error} />

      {!o.data?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-stone-500">
          <span className="text-4xl block mb-2">📦</span>
          <p className="font-bold text-base">अभी कोई पक्का आर्डर नहीं है।</p>
          <p className="text-xs text-stone-400 mt-1">खरीदार द्वारा आर्डर पक्का करने के बाद यहां दिखेगा।</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {o.data.map((x) => (
            <Card key={x.shipment_id}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚚</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900">
                      आर्डर #{x.order_id} • {x.kg} kg {x.crop}
                    </h3>
                    <p className="text-xs text-stone-500 font-semibold">
                      शिपमेंट आईडी: #{x.shipment_id}
                    </p>
                  </div>
                </div>
                <Badge>{x.status}</Badge>
              </div>

              <div className="my-4">
                <Stepper status={x.status} />
              </div>

              {/* Admin advance simulation button */}
              {getSession()?.role === "admin" && x.status !== "Delivered" && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-200">
                  <span className="text-xs font-bold text-stone-600">
                    प्रबंधक नियंत्रण (Manager Control):
                  </span>
                  <Btn
                    variant="earth"
                    onClick={() => advance(x.shipment_id)}
                  >
                    स्थिति आगे बढ़ाएं: {x.status === "Confirmed" ? "गाड़ी रवाना (In Transit)" : "पहुंचा (Delivered)"}
                  </Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
