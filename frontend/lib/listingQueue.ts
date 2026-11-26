"use client";

/**
 * Offline queue for harvest listings.
 *
 * A listing typed while the phone has no signal must not be thrown away, and it
 * must not look like an error to the farmer. It is parked in localStorage and
 * replayed through the same POST /listings call once the browser is back online.
 *
 * The whole request body is stored - including client_request_id - because the
 * backend de-duplicates listings on that id. If the generic action queue in
 * lib/offline.ts happens to replay the same listing too, the server keeps one.
 */

export const OFFLINE_QUEUE_KEY = "farmpool_offline_queue";

/** Fired on window whenever the queue changes, so a badge can re-render. */
export const QUEUE_EVENT = "fp_listing_queue_change";

export interface QueuedListingBody {
  crop: string;
  quantity_kg: number;
  quality: string;
  harvest_date: string;
  preferred_sell_date: string | null;
  client_request_id: string;
  source: string;
}

export interface QueuedListing {
  id: string;
  queued_at: number;
  body: QueuedListingBody;
}

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

function read(): QueuedListing[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedListing =>
        !!item && typeof item === "object" && "id" in item && "body" in item
    );
  } catch {
    return [];
  }
}

function write(queue: QueuedListing[]) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function getQueuedListings(): QueuedListing[] {
  return read();
}

export function queuedListingCount(): number {
  return read().length;
}

export function queueListing(body: QueuedListingBody): QueuedListing {
  const item: QueuedListing = {
    id: "lst_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    queued_at: Date.now(),
    body,
  };
  write([...read(), item]);
  return item;
}

export function removeQueuedListing(id: string) {
  write(read().filter((item) => item.id !== id));
}

/**
 * Replay every queued listing through `send`. Each one is removed from the queue
 * as soon as it succeeds, so a crash mid-sync never loses - or double-sends - the
 * ones already accepted. Returns how many synced.
 */
export async function syncQueuedListings(
  send: (body: QueuedListingBody) => Promise<unknown>
): Promise<number> {
  let synced = 0;
  for (const item of read()) {
    try {
      await send(item.body);
      removeQueuedListing(item.id);
      synced++;
    } catch {
      // Keep it queued and let the next online event try again.
    }
  }
  return synced;
}
