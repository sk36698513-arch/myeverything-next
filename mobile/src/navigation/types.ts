export type RootStackParamList = {
  Splash: undefined;
  Start: undefined;
  Dashboard: undefined;
  Record: undefined;
  EmotionSummary: { logId: string };
  Assistant: undefined;
  Review: undefined;
  Settings: undefined;
  Summary: { period: "day" | "week" | "month" };
  Autobiography: { months?: number; startISO?: string; endISO?: string };
};

