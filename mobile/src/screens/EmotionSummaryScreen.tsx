import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { getLogById } from "../storage/logs";
import type { DailyLog } from "../types";
import { useI18n } from "../i18n/i18n";
import { emotionLabel } from "../i18n/emotionLabels";
import { analyzeEmotionLocalized } from "../ai/emotion";

type Props = NativeStackScreenProps<RootStackParamList, "EmotionSummary">;

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function EmotionSummaryScreen({ navigation, route }: Props) {
  const [log, setLog] = useState<DailyLog | null>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    getLogById(route.params.logId).then(setLog);
  }, [route.params.logId]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t("emotionSummaryTitle")}</Text>
        <Text style={styles.subtitle}>{t("emotionSummarySubtitle")}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t("savedTime")}</Text>
          <Text style={styles.value}>{log ? formatTime(log.createdAtISO) : "..."}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>{t("todayEmotion")}</Text>
          <Text style={[styles.value, { color: Colors.primary }]}>
            {log ? emotionLabel(locale, log.emotion) : "..."}
          </Text>
        </View>
        <View style={{ height: Spacing.md }} />
        <Text style={styles.summary}>
          {log ? analyzeEmotionLocalized(log.content, locale).summary : ""}
        </Text>

        <View style={{ height: Spacing.xl }} />
        <PrimaryButton title={t("goDashboard")} onPress={() => navigation.replace("Dashboard")} />
        <View style={{ height: Spacing.sm }} />
        <PrimaryButton
          title={t("talkAssistant")}
          variant="secondary"
          onPress={() => navigation.navigate("Assistant")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  card: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, color: Colors.mutedText },
  value: { fontSize: 14, color: Colors.text, fontWeight: "700" },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  summary: { fontSize: 14, lineHeight: 21, color: Colors.text },
});

