import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";
import { makeId } from "../lib/id";

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getJson<string>(StorageKeys.deviceId);
  if (existing && typeof existing === "string") return existing;
  const next = makeId("device");
  await setJson(StorageKeys.deviceId, next);
  return next;
}

