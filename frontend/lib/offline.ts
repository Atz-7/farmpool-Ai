"use client";

export interface QueuedAction {
  id: string;
  path: string;
  method: string;
  body?: unknown;
  timestamp: number;
  description: string;
}

const CACHE_PREFIX = "fp_cache_";
const QUEUE_KEY = "fp_offline_queue";

// Pre-seeded fallback data for Hooghly / Bengal rural demo when offline
export const SEED_OFFLINE_DATA: Record<string, unknown> = {
  "/listings": [
    { id: 1, crop: "tomato", quantity_kg: 250, quality: "A", harvest_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], farmer_id: 1, committed: false },
    { id: 2, crop: "tomato", quantity_kg: 300, quality: "A", harvest_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], farmer_id: 2, committed: false },
    { id: 3, crop: "tomato", quantity_kg: 200, quality: "B", harvest_date: new Date(Date.now() + 172800000).toISOString().split("T")[0], farmer_id: 3, committed: false },
    { id: 4, crop: "tomato", quantity_kg: 250, quality: "A", harvest_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], farmer_id: 4, committed: false },
    { id: 5, crop: "tomato", quantity_kg: 200, quality: "B", harvest_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], farmer_id: 5, committed: false },
  ],
  "/requirements": [
    {
      id: 1,
      crop: "tomato",
      quantity_kg: 1000,
      min_quality: "B",
      price_min: 24,
      price_max: 28,
      dest_name: "Kolkata collection hub (demo)",
      dest_lat: 22.5726,
      dest_lng: 88.3639,
      deadline: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      status: "Open",
    },
    {
      id: 2,
      crop: "tomato",
      quantity_kg: 2500,
      min_quality: "B",
      price_min: 24,
      price_max: 28,
      dest_name: "Kolkata collection hub (demo)",
      dest_lat: 22.5726,
      dest_lng: 88.3639,
      deadline: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      status: "Open",
    },
  ],
  "/pools": [
    {
      id: 1,
      requirement_id: 1,
      crop: "tomato",
      total_kg: 1000,
      dest_name: "Kolkata collection hub",
      deadline: new Date(Date.now() + 172800000).toISOString().split("T")[0],
      status: "Proposed",
      my_kg: 250,
      my_accepted: null,
    },
  ],
  "/orders": [
    { shipment_id: 1, order_id: 101, crop: "tomato", kg: 1000, status: "Confirmed" }
  ]
};

export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function cacheGet<T = unknown>(path: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    if (raw) return JSON.parse(raw);
    if (SEED_OFFLINE_DATA[path]) return SEED_OFFLINE_DATA[path] as T;
  } catch (e) {
    console.warn("Cache read error for", path, e);
  }
  return null;
}

export function cacheSet(path: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch (e) {
    console.warn("Cache write error for", path, e);
  }
}

export function getOfflineQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineAction(action: Omit<QueuedAction, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  const item: QueuedAction = {
    ...action,
    id: "act_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("fp_queue_change"));
}

export function clearOfflineQueue() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new Event("fp_queue_change"));
}

export async function syncOfflineQueue(executeApi: (path: string, opts: any) => Promise<any>): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remaining: QueuedAction[] = [];

  for (const act of queue) {
    try {
      await executeApi(act.path, { method: act.method, body: act.body });
      syncedCount++;
    } catch (e) {
      console.warn("Could not sync action:", act, e);
      remaining.push(act);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new Event("fp_queue_change"));
  }

  return syncedCount;
}
