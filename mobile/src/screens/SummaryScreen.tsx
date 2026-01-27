import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { loadLogs } from "../storage/logs";
import type { DailyLog } from "../types";
import { useI18n } from "../i18n/i18n";
import { emotionLabel } from "../i18n/emotionLabels";
import { analyzeEmotionLocalized } from "../ai/emotion";
import { makeMonthlyReport } from "../ai/monthly";

type Props = NativeStackScreenProps<RootStackParamList, "Summary">;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function SummaryScreen({ navigation, route }: Props) {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<DailyLog[]>([]);

  useEffect(() => {
    loadLogs().then(setLogs);
  }, []);

  const { period } = route.params;

  const title = useMemo(() => {
    if (period === "day") return t("btnDailySummary");
    if (period === "week") return t("btnWeeklySummary");
    return t("btnMonthlySummary");
  }, [period, t]);

  const body = useMemo(() => {
    if (period === "month") {
      return makeMonthlyReport({ logs, month: new Date(), locale }).body;
    }

    const now = new Date();
    const filtered =
      period === "day"
        ? logs.filter((l) => isSameDay(new Date(l.createdAtISO), now))
        : logs.filter((l) => new Date(l.createdAtISO) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    if (filtered.length === 0) {
      return locale === "en"
        ? "No logs in this period yet."
        : locale === "ja"
          ? "この期間の記録はまだありません。"
          : "이 기간의 기록이 아직 없어요.";
    }

    const top = filtered[0];
    const mood = emotionLabel(locale, top.emotion);
    const moodLine =
      locale === "en" ? `Most recent mood: ${mood}` : locale === "ja" ? `直近の感情: ${mood}` : `최근 정서: ${mood}`;

    const summary = analyzeEmotionLocalized(top.content, locale).summary;

    const lines = filtered.slice(0, 5).map((l) => {
      const d = new Date(l.createdAtISO);
      const stamp = `${d.getMonth() + 1}/${d.getDate()}`;
      const first = l.content.split("\n").map((s) => s.trim()).find(Boolean) ?? "";
      return `- ${stamp}: ${first.slice(0, 60)}…`;
    });

    const head =
      period === "day"
        ? locale === "en"
          ? `Today, you wrote ${filtered.length} log(s).`
          : locale === "ja"
            ? `今日は${filtered.length}件の記録がありました。`
            : `오늘은 ${filtered.length}개의 기록이 있어요.`
        : locale === "en"
          ? `In the last 7 days, you wrote ${filtered.length} log(s).`
          : locale === "ja"
            ? `直近7日で${filtered.length}件の記録がありました。`
            : `최근 7일 동안 ${filtered.length}개의 기록이 있어요.`;

    return [head, moodLine, summary, "", ...lines].join("\n");
  }, [logs, locale, period]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.body}>{body}</Text>
        </View>
        <View style={{ height: Spacing.lg }} />
        <PrimaryButton title={t("btnBack")} onPress={() => navigation.navigate("Dashboard")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: { fontSize: 14, lineHeight: 22, color: Colors.text },
});

