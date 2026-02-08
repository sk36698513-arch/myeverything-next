import type { DailyLog } from "../types";
import { getApiBase } from "../lib/apiBase";
import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";
import { getSyncAuth } from "../lib/syncHeaders";

type PendingSyncItem = DailyLog;

async function loadQueue(): Promise<PendingSyncItem[]> {
  return (await getJson<PendingSyncItem[]>(StorageKeys.pendingSync)) ?? [];
}

async function saveQueue(q: PendingSyncItem[]) {
  await setJson(StorageKeys.pendingSync, q);
}

async function enqueue(log: DailyLog) {
  const q = await loadQueue();
  if (q.some((x) => x.id === log.id)) return;
  await saveQueue([log, ...q].slice(0, 2000)); // safety cap
}

async function sendOne(base: string, deviceId: string, syncHeaders: Record<string, string>, log: DailyLog, signal: AbortSignal) {
  const res = await fetch(`${base}/sync/logs`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...syncHeaders },
    body: JSON.stringify({ deviceId, log }),
    signal,
  });
  if (!res.ok) throw new Error(`sync_http_${res.status}`);
}

export async function flushPendingSync(params?: { max?: number }): Promise<{ sent: number; pending: number }> {
  const base = getApiBase();
  const { deviceId, headers: syncHeaders } = await getSyncAuth();
  const max = Math.min(Math.max(params?.max ?? 30, 1), 200);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const q = await loadQueue();
    if (q.length === 0) return { sent: 0, pending: 0 };

    let sent = 0;
    const next: PendingSyncItem[] = [];
    for (let i = 0; i < q.length; i++) {
      const item = q[i]!;
      if (sent >= max) {
        next.push(item);
        continue;
      }
      try {
        await sendOne(base, deviceId, syncHeaders, item, controller.signal);
        sent += 1;
      } catch {
        // stop early; keep remaining
        next.push(item, ...q.slice(i + 1));
        break;
      }
    }

    if (next.length !== q.length) {
      await saveQueue(next);
    }
    return { sent, pending: next.length };
  } finally {
    clearTimeout(timer);
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const q = await loadQueue();
  return q.length;
}

export async function syncLogToServer(log: DailyLog): Promise<void> {
  const base = getApiBase();
  const { deviceId, headers: syncHeaders } = await getSyncAuth();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    // trailing slash로 인한 308(Location) 리다이렉트 방지
    await sendOne(base, deviceId, syncHeaders, log, controller.signal);
  } catch {
    // 네트워크가 불안정해도 로컬 저장은 유지 (서버 저장은 best-effort)
    await enqueue(log);
  } finally {
    clearTimeout(timer);
  }
}

