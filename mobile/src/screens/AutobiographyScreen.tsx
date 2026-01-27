import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CalendarRangePicker } from "../components/CalendarRangePicker";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { loadLogs } from "../storage/logs";
import type { DailyLog } from "../types";
import { useI18n } from "../i18n/i18n";
import { makeAutobiography } from "../ai/autobiography";

type Props = NativeStackScreenProps<RootStackParamList, "Autobiography">;

export function AutobiographyScreen({ navigation, route }: Props) {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [start, setStart] = useState<Date | null>(route.params.startISO ? new Date(route.params.startISO) : null);
  const [end, setEnd] = useState<Date | null>(route.params.endISO ? new Date(route.params.endISO) : null);

  useEffect(() => {
    loadLogs().then(setLogs);
  }, []);

  useEffect(() => {
    setStart(route.params.startISO ? new Date(route.params.startISO) : null);
    setEnd(route.params.endISO ? new Date(route.params.endISO) : null);
  }, [route.params.startISO, route.params.endISO]);

  const report = useMemo(
    () =>
      makeAutobiography({
        logs,
        locale,
        startISO: route.params.startISO,
        endISO: route.params.endISO,
        months: route.params.months,
      }),
    [logs, locale, route.params.endISO, route.params.months, route.params.startISO]
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.sub}>{locale === "en" ? "Select period" : locale === "ja" ? "期間を選択" : "기간 선택"}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <CalendarRangePicker
          locale={locale}
          value={{ start, end }}
          onChange={(next) => {
            setStart(next.start);
            setEnd(next.end);
            if (next.start && next.end) {
              navigation.setParams({ startISO: next.start.toISOString(), endISO: next.end.toISOString(), months: undefined });
            }
          }}
        />
        <View style={{ height: Spacing.lg }} />
        <View style={styles.card}>
          <Text style={styles.body}>{report.body}</Text>
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
  sub: { marginTop: 6, fontSize: 13, color: Colors.mutedText },
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

