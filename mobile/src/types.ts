export type EmotionLabel = "안정" | "피곤" | "불안" | "혼란";

export type UserProfile = {
  email?: string;
  isAnonymous: boolean;
  createdAtISO: string;
};

export type DailyLog = {
  id: string;
  createdAtISO: string; // includes date & time
  content: string;
  emotion: EmotionLabel;
  emotionSummary: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAtISO: string;
};

