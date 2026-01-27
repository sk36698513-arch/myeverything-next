import type { UserProfile } from "../types";
import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";

export async function loadProfile(): Promise<UserProfile | null> {
  return await getJson<UserProfile>(StorageKeys.profile);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await setJson(StorageKeys.profile, profile);
}

