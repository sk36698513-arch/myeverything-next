import type { Locale } from "./translations";
import type { EmotionLabel } from "../types";

export function emotionLabel(locale: Locale, label: EmotionLabel): string {
  const map: Record<Locale, Record<EmotionLabel, string>> = {
    ko: { 안정: "안정", 피곤: "피곤", 불안: "불안", 혼란: "혼란" },
    en: { 안정: "Stable", 피곤: "Tired", 불안: "Anxious", 혼란: "Confused" },
    ja: { 안정: "安定", 피곤: "疲れ", 불안: "不安", 혼란: "混乱" },
  };
  return map[locale][label];
}

