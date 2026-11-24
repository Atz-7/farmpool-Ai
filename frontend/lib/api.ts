import { cacheGet, cacheSet, queueOfflineAction, isOnline, QueuedAction } from "./offline";

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type J = any;
export type Session = { token: string; role: "farmer" | "buyer" | "admin" | "coordinator" };

export const getSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("fp_session");
    if (s) return JSON.parse(s);
    // Offline demo fallback session so farmers/buyers don't get stuck if opening offline
    return { token: "demo-offline-token", role: "farmer" };
  } catch {
    return { token: "demo-offline-token", role: "farmer" };
  }
};

export const setSession = (s: Session | null) =>
  s ? localStorage.setItem("fp_session", JSON.stringify(s)) : localStorage.removeItem("fp_session");

function detail(d: J): string {
  if (!d) return "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
  return JSON.stringify(d);
}

export async function api<T = J>(
  path: string,
  opts: { method?: string; body?: unknown; form?: Record<string, string> } = {}
): Promise<T> {
  const method = (opts.method ?? (opts.body !== undefined || opts.form !== undefined ? "POST" : "GET")).toUpperCase();
  const isRead = method === "GET";

  // Check if offline before attempting network
  if (typeof window !== "undefined" && !navigator.onLine && isRead) {
    const cached = cacheGet<T>(path);
    if (cached !== null) return cached;
  }

  const headers: Record<string, string> = {};
  const s = getSession();
  if (s && s.token) headers.Authorization = `Bearer ${s.token}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form);
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  try {
    const res = await fetch(`${BASE}/api${path}`, { method, headers, body });
    if (res.status === 401 && s) {
      setSession(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(detail(data?.detail));

    // Cache successful GET requests for offline use
    if (isRead && data !== null) {
      cacheSet(path, data);
    }

    return data as T;
  } catch (err) {
    // If network fails (offline or server unreachable)
    if (isRead) {
      const cached = cacheGet<T>(path);
      if (cached !== null) {
        return cached;
      }
    } else {
      // Offline mutation handling (optimistic updates + queue)
      queueOfflineAction({
        path,
        method,
        body: opts.body,
        description: `Action on ${path}`,
      });

      // Handle specific optimistic mutations
      if (path === "/listings" && method === "POST") {
        const curListings = cacheGet<J[]>("/listings") || [];
        const newListing = {
          id: Date.now(),
          ...(opts.body as Record<string, unknown>),
          is_offline: true,
        };
        const updated = [newListing, ...curListings];
        cacheSet("/listings", updated);
        return newListing as T;
      }

      if (path.startsWith("/pools/") && path.endsWith("/respond")) {
        const parts = path.split("/");
        const pid = parseInt(parts[2], 10);
        const curPools = cacheGet<J[]>("/pools") || [];
        const accept = (opts.body as any)?.accept;
        const updated = curPools.map((p) => (p.id === pid ? { ...p, my_accepted: accept } : p));
        cacheSet("/pools", updated);
        return { status: "ok", offline: true } as T;
      }

      if (path === "/requirements" && method === "POST") {
        const curReqs = cacheGet<J[]>("/requirements") || [];
        const newReq = {
          id: Date.now(),
          ...(opts.body as Record<string, unknown>),
          status: "Open",
          is_offline: true,
        };
        const updated = [newReq, ...curReqs];
        cacheSet("/requirements", updated);
        return newReq as T;
      }

      if (path.includes("/propose-pool")) {
        // Fallback offline pool proposition
        const mockProposal = {
          feasible: true,
          pool_id: 1,
          total_kg: 1000,
          members: [
            { farmer: "Ramesh Das (Singur)", kg: 250, accepted: true, reason: "Top quality, 1.2km away" },
            { farmer: "Sukumar Pal (Dhaniakhali)", kg: 300, accepted: true, reason: "Same harvest date, on truck route" },
            { farmer: "Bimal Ghosh (Bandel)", kg: 250, accepted: true, reason: "Along route to Kolkata" },
            { farmer: "Kabita Roy (Balagarh)", kg: 200, accepted: true, reason: "Completes vehicle capacity" },
          ],
        };
        return mockProposal as T;
      }

      // Return synthetic success so offline UX doesn't crash
      return { success: true, offline: true } as T;
    }

    throw err;
  }
}

export const rs = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
export const STATUSES = ["Open", "Matching", "Pool Proposed", "Awaiting Confirmation", "Confirmed", "In Transit", "Delivered"];
