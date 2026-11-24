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
  ],
  "/coordinator/summary": {
    coordinator_name: "Harish Kumar (Coordinator)",
    cluster_name: "Singur / Hooghly Cluster",
    total_farmers: 5,
    total_farmers_assisted: 3,
    total_produce_kg: 1200,
    active_pools: 1,
    pending_confirmations: 2,
    completed_shipments: 1
  },
  "/coordinator/farmers": [
    { id: 1, user_id: 2, name: "Ramesh Das (demo)", phone: "9000000001", village: "Singur", lat: 22.81, lng: 88.228, phone_type: "feature_phone", preferred_language: "bn", assisted_by_coordinator: true, listings_count: 1, total_kg: 250 },
    { id: 2, user_id: 3, name: "Sukumar Pal (demo)", phone: "9000000002", village: "Dhaniakhali", lat: 22.98, lng: 88.05, phone_type: "smartphone", preferred_language: "bn", assisted_by_coordinator: false, listings_count: 1, total_kg: 300 },
    { id: 3, user_id: 4, name: "Anita Mondal (demo)", phone: "9000000003", village: "Haripal", lat: 22.868, lng: 88.093, phone_type: "smartphone", preferred_language: "hi", assisted_by_coordinator: false, listings_count: 1, total_kg: 200 },
    { id: 4, user_id: 5, name: "Bimal Ghosh (demo)", phone: "9000000004", village: "Bandel", lat: 22.928, lng: 88.378, phone_type: "feature_phone", preferred_language: "hi", assisted_by_coordinator: true, listings_count: 1, total_kg: 250 },
    { id: 5, user_id: 6, name: "Kabita Roy (demo)", phone: "9000000005", village: "Balagarh", lat: 23.008, lng: 88.44, phone_type: "smartphone", preferred_language: "bn", assisted_by_coordinator: false, listings_count: 1, total_kg: 200 },
  ],
  "/ivr/demo-farmers": [
    { id: 1, name: "Ramesh Das (demo)", phone: "9000000001", village: "Singur", phone_type: "feature_phone", preferred_language: "bn" },
    { id: 2, name: "Sukumar Pal (demo)", phone: "9000000002", village: "Dhaniakhali", phone_type: "smartphone", preferred_language: "bn" },
    { id: 4, name: "Bimal Ghosh (demo)", phone: "9000000004", village: "Bandel", phone_type: "feature_phone", preferred_language: "hi" },
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
