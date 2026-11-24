"use client";

import { useEffect, useState } from "react";
import { getOfflineQueue, syncOfflineQueue, isOnline } from "@/lib/offline";
import { api } from "@/lib/api";
import { getLang, t, Lang } from "@/lib/i18n";

export default function OfflineBanner({ lang }: { lang?: Lang }) {
  const currentLang = lang || getLang();
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const updateStatus = () => {
    setOnline(typeof window !== "undefined" ? navigator.onLine : true);
    setQueueCount(getOfflineQueue().length);
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setOnline(true);
      triggerSync();
    };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => setQueueCount(getOfflineQueue().length);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("fp_queue_change", handleQueue);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fp_queue_change", handleQueue);
    };
  }, []);

  const triggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setMessage("");
    try {
      const count = await syncOfflineQueue((path, opts) => api(path, opts));
      if (count > 0) {
        setMessage(t("syncSuccess", currentLang));
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (e) {
      console.warn("Sync error:", e);
    } finally {
      setSyncing(false);
      updateStatus();
    }
  };

  if (online && queueCount === 0 && !message) {
    return null;
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🌾</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-950">
                {!online ? t("offlineMode", currentLang) : "सिंक स्थिति (Sync Status)"}
              </span>
              {!online ? (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  No Internet
                </span>
              ) : (
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Online
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-amber-900">
              {!online ? t("offlineMsg", currentLang) : "आपका पूरा काम आपके फोन पर सुरक्षित है।"}
            </p>
            {queueCount > 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-800">
                ⏳ {queueCount} {t("unsyncedCount", currentLang)}
              </p>
            )}
            {message && <p className="mt-1 text-xs font-bold text-green-700">✓ {message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queueCount > 0 && (
            <button
              type="button"
              disabled={syncing}
              onClick={triggerSync}
              className="btn-tactile rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {syncing ? "सिंक हो रहा है..." : `🔄 ${t("syncNow", currentLang)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
