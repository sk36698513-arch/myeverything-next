import type { ChatMessage } from "../types";
import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";

export async function loadChat(): Promise<ChatMessage[]> {
  return (await getJson<ChatMessage[]>(StorageKeys.chat)) ?? [];
}

export async function appendChat(messages: ChatMessage[]): Promise<void> {
  await setJson(StorageKeys.chat, messages);
}

