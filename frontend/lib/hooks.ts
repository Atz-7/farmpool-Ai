"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getSession, Session, J } from "./api";

export function useRole(allowed: Session["role"][]) {
  const router = useRouter();
  const [session, setS] = useState<Session | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s || !allowed.includes(s.role)) router.replace("/login"); else setS(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return session;
}

export function useLoad<T = J>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    try { setError(""); setData(await api<T>(path)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}
