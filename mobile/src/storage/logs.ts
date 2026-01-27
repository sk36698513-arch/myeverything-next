import type { DailyLog } from "../types";
import { makeId } from "../lib/id";
import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";
import { analyzeEmotion } from "../ai/emotion";

export async function loadLogs(): Promise<DailyLog[]> {
  const logs = (await getJson<DailyLog[]>(StorageKeys.logs)) ?? [];
  // 최신순 정렬
  return [...logs].sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export async function addLog(params: { content: string }): Promise<DailyLog> {
  const nowISO = new Date().toISOString();
  const emo = analyzeEmotion(params.content);

  const log: DailyLog = {
    id: makeId("log"),
    createdAtISO: nowISO,
    content: params.content.trim(),
    emotion: emo.label,
    emotionSummary: emo.summary,
  };

  const existing = (await getJson<DailyLog[]>(StorageKeys.logs)) ?? [];
  const next = [log, ...existing];
  await setJson(StorageKeys.logs, next);
  return log;
}

export async function getLogById(id: string): Promise<DailyLog | null> {
  const all = await loadLogs();
  return all.find((l) => l.id === id) ?? null;
}

