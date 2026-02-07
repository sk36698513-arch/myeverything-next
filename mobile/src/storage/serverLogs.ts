import type { DailyLog } from "../types";
import { getApiBase } from "../lib/apiBase";
import { getOrCreateDeviceId } from "./device";

export async function fetchServerLogs(params: {
  startISO?: string;
  endISO?: string;
  limit?: number;
  timeoutMs?: number;
}): Promise<DailyLog[]> {
  const base = getApiBase();
  const deviceId = await getOrCreateDeviceId();
  const limit = Math.min(Math.max(params.limit ?? 5000, 1), 5000);
  const timeoutMs = Math.min(Math.max(params.timeoutMs ?? 15000, 2000), 30000);

  // trailing slash로 인한 308(Location) 리다이렉트 방지
  const url = new URL(`${base}/sync/logs`);
  url.searchParams.set("deviceId", deviceId);
  url.searchParams.set("limit", String(limit));
  if (params.startISO) url.searchParams.set("startISO", params.startISO);
  if (params.endISO) url.searchParams.set("endISO", params.endISO);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`server_logs_http_${res.status}`);
    const data = (await res.json().catch(() => null)) as null | { ok?: boolean; logs?: unknown };
    const logs = Array.isArray(data?.logs) ? (data!.logs as DailyLog[]) : [];
    return logs;
  } finally {
    clearTimeout(timer);
  }
}

