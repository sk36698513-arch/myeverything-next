import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { loadLogs } from "../storage/logs";
import type { DailyLog } from "../types";
import { makeMonthlyReport } from "../ai/monthly";
import { useI18n } from "../i18n/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Review">;

export function ReviewScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const { t, locale } = useI18n();

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadLogs().then(setLogs);
    });
    return unsub;
  }, [navigation]);

  const month = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const report = useMemo(() => makeMonthlyReport({ logs, month, locale }), [logs, month, locale]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>{report.subtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.body}>{report.body}</Text>
        </View>

        <View style={{ height: Spacing.md }} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title={t("prevMonth")} variant="secondary" onPress={() => setMonthOffset((v) => v - 1)} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <PrimaryButton title={t("nextMonth")} variant="secondary" onPress={() => setMonthOffset((v) => v + 1)} />
          </View>
        </View>

        <View style={{ height: Spacing.md }} />
        <PrimaryButton title={t("goDashboard")} onPress={() => navigation.navigate("Dashboard")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  card: {
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: { fontSize: 14, lineHeight: 22, color: Colors.text },
  row: { flexDirection: "row" },
});

