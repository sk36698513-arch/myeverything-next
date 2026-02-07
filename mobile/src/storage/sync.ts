import type { DailyLog } from "../types";
import { getApiBase } from "../lib/apiBase";
import { getOrCreateDeviceId } from "./device";

export async function syncLogToServer(log: DailyLog): Promise<void> {
  const base = getApiBase();
  const deviceId = await getOrCreateDeviceId();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    // trailing slash로 인한 308(Location) 리다이렉트 방지
    await fetch(`${base}/sync/logs`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ deviceId, log }),
      signal: controller.signal,
    });
  } catch {
    // 네트워크가 불안정해도 로컬 저장은 유지 (서버 저장은 best-effort)
  } finally {
    clearTimeout(timer);
  }
}

