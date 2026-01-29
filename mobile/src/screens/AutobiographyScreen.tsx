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
import { fetchServerLogs } from "../storage/serverLogs";

type Props = NativeStackScreenProps<RootStackParamList, "Autobiography">;

export function AutobiographyScreen({ navigation, route }: Props) {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [start, setStart] = useState<Date | null>(route.params.startISO ? new Date(route.params.startISO) : null);
  const [end, setEnd] = useState<Date | null>(route.params.endISO ? new Date(route.params.endISO) : null);

  useEffect(() => {
    // 서버 DB(파일DB) 기반으로 우선 조회하고, 실패 시 로컬로 폴백
    (async () => {
      try {
        const effectiveStartISO = route.params.startISO
          ? route.params.startISO
          : route.params.months
            ? (() => {
                const now = new Date();
                const s = new Date(now);
                s.setMonth(s.getMonth() - (route.params.months ?? 12));
                return s.toISOString();
              })()
            : undefined;
        const effectiveEndISO = route.params.endISO ?? new Date().toISOString();

        // 기간이 없으면(legacy) 서버 전체를 받아도 되지만, 기본은 최근 12개월로 제한
        const serverLogs = await fetchServerLogs({
          startISO: effectiveStartISO,
          endISO: effectiveEndISO,
          limit: 5000,
        });
        setLogs(serverLogs);
      } catch {
        const local = await loadLogs();
        setLogs(local);
      }
    })();
  }, []);

  useEffect(() => {
    setStart(route.params.startISO ? new Date(route.params.startISO) : null);
    setEnd(route.params.endISO ? new Date(route.params.endISO) : null);
  }, [route.params.startISO, route.params.endISO]);

  // 사용자가 기간을 바꾸면 서버에서 해당 기간을 다시 조회
  useEffect(() => {
    const startISO = route.params.startISO;
    const endISO = route.params.endISO;
    if (!startISO || !endISO) return;
    (async () => {
      try {
        const serverLogs = await fetchServerLogs({ startISO, endISO, limit: 5000 });
        setLogs(serverLogs);
      } catch {
        // 서버 조회 실패 시 기존 로그 유지 (또는 로컬 폴백)
        try {
          const local = await loadLogs();
          setLogs(local);
        } catch {
          // ignore
        }
      }
    })();
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

