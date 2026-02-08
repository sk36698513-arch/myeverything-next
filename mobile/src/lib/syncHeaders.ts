import { getOrCreateDeviceId } from "../storage/device";

function getSyncKey(): string | null {
  // Expo public env var (note: this is NOT a secret once shipped)
  // - used as a basic abuse barrier for /sync/* endpoints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = (process as any)?.env?.EXPO_PUBLIC_SYNC_KEY;
  if (typeof k === "string" && k.trim()) return k.trim();
  return null;
}

export async function getSyncAuth() {
  const deviceId = await getOrCreateDeviceId();
  const key = getSyncKey();

  const headers: Record<string, string> = { "x-device-id": deviceId };
  if (key) {
    // Prefer standard header so proxies/servers are less likely to drop it
    headers.authorization = `Bearer ${key}`;
    // Keep legacy header too (useful for debugging)
    headers["x-sync-key"] = key;
  }

  return { deviceId, headers };
}

