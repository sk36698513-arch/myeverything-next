import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CalendarRangePicker } from "../components/CalendarRangePicker";
import { LanguageSelector } from "../components/LanguageSelector";
import { Screen } from "../components/Screen";
import { useI18n } from "../i18n/i18n";
import { emotionLabel } from "../i18n/emotionLabels";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import { addLog, loadLogs } from "../storage/logs";
import { loadChat, appendChat } from "../storage/chat";
import type { DailyLog } from "../types";
import { makeId } from "../lib/id";
import { fetchMentorAdvice } from "../ai/mentorApi";
import { isMentorQuotaError } from "../ai/mentorApi";
import { makeAssistantReply } from "../ai/assistant";
import { getMentorQuotaStatus } from "../storage/mentorQuota";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

function formatKoreanDate(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

export function DashboardScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [recentVisible, setRecentVisible] = useState(false);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState("");
  const [mentorDraft, setMentorDraft] = useState("");
  const [mentorReply, setMentorReply] = useState<string | null>(null);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [mentorSending, setMentorSending] = useState(false);
  const mentorSendingRef = useRef(false);
  const [mentorQuotaHint, setMentorQuotaHint] = useState<string | null>(null);
  const [autoPickerOpen, setAutoPickerOpen] = useState(false);
  const [autoStart, setAutoStart] = useState<Date | null>(null);
  const [autoEnd, setAutoEnd] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const savedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadLogs().then(setLogs);
      // 서버 AI 사용량 표시(5회/일 + 60초 쿨다운)
      getMentorQuotaStatus()
        .then((s) => {
          const sec = Math.ceil((s.nextAllowedInMs ?? 0) / 1000);
          const base =
            locale === "en"
              ? `Server AI: ${s.usedRequests}/${s.maxRequests} used · ${s.remainingRequests} left`
              : locale === "ja"
                ? `サーバーAI: ${s.usedRequests}/${s.maxRequests} 回使用 · 残り ${s.remainingRequests} 回`
                : `서버 AI: ${s.usedRequests}/${s.maxRequests}회 사용 · 남은 ${s.remainingRequests}회`;
          const cool =
            sec > 0
              ? locale === "en"
                ? ` · next in ${sec}s`
                : locale === "ja"
                  ? ` · ${sec}秒後に可能`
                  : ` · ${sec}초 후 가능`
              : "";
          setMentorQuotaHint(base + cool);
        })
        .catch(() => setMentorQuotaHint(null));
    });
    return unsub;
  }, [navigation]);

  const today = useMemo(() => {
    const d = new Date();
    if (locale === "ko") return formatKoreanDate(d);
    return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [locale]);
  const last = logs[0];

  async function askMentorInline() {
    if (mentorSendingRef.current) return;
    const msg = mentorDraft.trim();
    if (!msg) {
      Alert.alert(t("mentorEmptyTitle"), t("mentorEmptyBody"));
      return;
    }

    mentorSendingRef.current = true;
    setMentorSending(true);
    setMentorReply(null);
    setMentorError(null);
    try {
      const history = (await loadChat())
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-5)
        .map((m) => ({ role: m.role, text: m.text }));
      const replyText = await fetchMentorAdvice({ message: msg, locale, history });
      setMentorReply(replyText);

      // 채팅에 저장(Assistant 화면에서도 이어서 보이게)
      const prev = await loadChat();
      const now = new Date().toISOString();
      const next = [
        ...prev,
        { id: makeId("user"), role: "user" as const, text: msg, createdAtISO: now },
        { id: makeId("assistant"), role: "assistant" as const, text: replyText, createdAtISO: new Date().toISOString() },
      ];
      await appendChat(next);
    } catch (e) {
      // 토큰/요청 제한: 서버 호출 없이 로컬 질문 모드로 답변
      if (isMentorQuotaError(e)) {
        const note =
          e.code === "mentor_message_too_long"
            ? locale === "en"
              ? "Server AI call skipped (message too long). Using offline mode."
              : locale === "ja"
                ? "サーバーAI呼び出しをスキップ（文章が長すぎます）。オフラインに切り替えます。"
                : "서버 AI 호출 생략(메시지 과다). 오프라인으로 처리합니다."
            : e.code === "mentor_rate_limited"
              ? locale === "en"
                ? "Server AI call skipped (cooldown). Using offline mode."
                : locale === "ja"
                  ? "サーバーAI呼び出しをスキップ（クールダウン中）。オフラインに切り替えます。"
                  : "서버 AI 호출 생략(쿨다운). 오프라인으로 처리합니다."
              : locale === "en"
                ? "Server AI call skipped (daily limit). Using offline mode."
                : locale === "ja"
                  ? "サーバーAI呼び出しをスキップ（本日の上限）。オフラインに切り替えます。"
                  : "서버 AI 호출 생략(일일 제한). 오프라인으로 처리합니다.";

        const local = makeAssistantReply({ userText: msg, logs, locale });
        const replyText = `${note}\n\n${local.text}`;
        setMentorReply(replyText);
        setMentorError(null);
        return;
      }

      const errText =
        locale === "en"
          ? "Failed to connect. Please try again in a moment."
          : locale === "ja"
            ? "接続に失敗しました。しばらくしてからもう一度お試しください。"
            : "연결에 실패했어요. 잠시 후 다시 시도해 주세요.";
      setMentorError(errText);
      // 웹에서는 Alert가 눈에 안 띌 수 있어, 화면에도 표시함
      Alert.alert(
        locale === "en" ? "Failed to connect" : locale === "ja" ? "接続に失敗しました" : "연결에 실패했어요",
        errText
      );
    } finally {
      setMentorSending(false);
      mentorSendingRef.current = false;
      // 사용량 힌트 갱신
      getMentorQuotaStatus()
        .then((s) => {
          const sec = Math.ceil((s.nextAllowedInMs ?? 0) / 1000);
          const base =
            locale === "en"
              ? `Server AI: ${s.usedRequests}/${s.maxRequests} used · ${s.remainingRequests} left`
              : locale === "ja"
                ? `サーバーAI: ${s.usedRequests}/${s.maxRequests} 回使用 · 残り ${s.remainingRequests} 回`
                : `서버 AI: ${s.usedRequests}/${s.maxRequests}회 사용 · 남은 ${s.remainingRequests}회`;
          const cool =
            sec > 0
              ? locale === "en"
                ? ` · next in ${sec}s`
                : locale === "ja"
                  ? ` · ${sec}秒後に可能`
                  : ` · ${sec}초 후 가능`
              : "";
          setMentorQuotaHint(base + cool);
        })
        .catch(() => setMentorQuotaHint(null));
    }
  }

  async function onSaveInline() {
    if (saving) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      Alert.alert(t("emptyLogTitle"), t("emptyLogBody"));
      return;
    }
    setSaving(true);
    try {
      await addLog({ content: trimmed });
      setDraft("");
      const next = await loadLogs();
      setLogs(next);
      setSavedNoticeVisible(true);
      if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
      savedNoticeTimerRef.current = setTimeout(() => {
        setSavedNoticeVisible(false);
      }, 2000);
    } finally {
      setSaving(false);
    }
  }

  function scrollTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function reloadRecentLogs() {
    setRecentVisible(true);
    const next = await loadLogs();
    setRecentLogs(next);
  }

  function closeRecentLogs() {
    setRecentVisible(false);
    setRecentLogs([]);
    scrollTop();
  }

  function goAutobiographyWithSelectedRange() {
    const start = autoStart ?? autoEnd;
    const end = autoEnd ?? autoStart;
    if (!start || !end) {
      Alert.alert(
        locale === "en" ? "Select a period" : locale === "ja" ? "期間を選択してください" : "기간을 선택해 주세요",
        locale === "en"
          ? "Please select start and end dates on the calendar."
          : locale === "ja"
            ? "カレンダーで開始日と終了日を選択してください。"
            : "캘린더에서 시작일과 종료일을 선택해 주세요."
      );
      return;
    }
    // 생성 화면으로 이동하면 캘린더는 접기
    setAutoPickerOpen(false);
    navigation.navigate("Autobiography", { startISO: start.toISOString(), endISO: end.toISOString() });
  }

  return (
    <Screen padded={false}>
      <ScrollView
        ref={(r) => {
          // RN/web 호환
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scrollRef.current = r as any;
        }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t("myAllTitle")}</Text>
          <View style={{ height: 10 }} />
          <LanguageSelector />
          {last ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {t("recentEmotion")}: {emotionLabel(locale, last.emotion)}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint}>{t("firstHint")}</Text>
          )}
        </View>

        {/* 기록 */}
        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>📝 {t("sectionRecord")}</Text>
          </View>
          <View style={styles.hr} />

          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (savedNoticeVisible) setSavedNoticeVisible(false);
            }}
            placeholder={locale === "en" ? "Write a log..." : locale === "ja" ? "記録を書いてください…" : "지금 기록을 남겨주세요 ..."} 
            placeholderTextColor="#9AB2C4"
            style={styles.textarea}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.rowLeft}>
            <Pressable
              accessibilityRole="button"
              onPress={onSaveInline}
              style={({ pressed }) => [
                styles.bigBtnWide,
                styles.bigBtnPrimary,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.bigBtnText}>{saving ? t("saving") : t("btnSave")}</Text>
            </Pressable>
          </View>

          {savedNoticeVisible ? <Text style={styles.savedNotice}>{t("savedNotice")}</Text> : null}
          <Text style={styles.footnote}>{t("hintRecordSpace")}</Text>
        </View>

        {/* 최근 기록 보기 */}
        <View style={styles.sectionOnly}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>📂 {t("sectionRecentLogs")}</Text>
            <View />
          </View>
          <View style={styles.hr} />
          <Text style={styles.miniHint}>
            {locale === "en"
              ? "* Recent logs will appear below. (read-only)"
              : locale === "ja"
                ? "※ 最近の記録は下に表示されます。（読み取り専用）"
                : "※ 최근 기록을 불러오면 아래에 표시됩니다. (읽기 전용)"}
          </Text>

          <View style={{ height: 10 }} />
          {recentVisible
            ? recentLogs.slice(0, 3).map((l) => {
                const first = l.content
                  .split("\n")
                  .map((s) => s.trim())
                  .find(Boolean) ?? "";
                return (
                  <View key={l.id} style={styles.logItem}>
                    <Text style={styles.logMeta}>
                      {new Date(l.createdAtISO).toLocaleString()} · {emotionLabel(locale, l.emotion)}
                    </Text>
                    <Text style={styles.logText}>{first}</Text>
                  </View>
                );
              })
            : null}

          <View style={styles.buttonStack}>
            {!recentVisible ? (
              <Pressable
                accessibilityRole="button"
                onPress={reloadRecentLogs}
                style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Text style={styles.bigBtnText}>{t("btnLoadRecentLogs")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={closeRecentLogs}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnNeutral, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnTextNeutral}>{t("btnBack")}</Text>
            </Pressable>
          </View>
        </View>

        {/* AI 멘토 */}
        <View style={styles.card}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>🤖 {t("sectionAiMentor")}</Text>
            <View />
          </View>
          <View style={styles.hr} />
          <TextInput
            value={mentorDraft}
            onChangeText={(v) => {
              setMentorDraft(v);
              if (mentorReply) setMentorReply(null);
              if (mentorError) setMentorError(null);
            }}
            placeholder={t("mentorQuickPlaceholder")}
            placeholderTextColor="#9AB2C4"
            style={styles.mentorInput}
            multiline
            textAlignVertical="top"
          />

          {mentorQuotaHint ? <Text style={styles.miniHint}>{mentorQuotaHint}</Text> : null}
          {mentorSending ? <Text style={styles.miniHint}>{t("mentorSending")}</Text> : null}
          {mentorReply ? (
            <View style={styles.mentorReplyBox}>
              <Text style={styles.mentorReplyText}>{mentorReply}</Text>
            </View>
          ) : null}
          {mentorError ? (
            <View style={styles.mentorErrorBox}>
              <Text style={styles.mentorErrorText}>{mentorError}</Text>
            </View>
          ) : null}

          <View style={styles.buttonStack}>
            <Pressable
              accessibilityRole="button"
              onPress={askMentorInline}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{mentorSending ? t("mentorSending") : t("btnAskMentor")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Assistant")}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{t("btnConnect")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={scrollTop}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnNeutral, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnTextNeutral}>{t("btnBack")}</Text>
            </Pressable>
          </View>
        </View>

        {/* 요약 */}
        <View style={styles.card}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>📊 {t("sectionSummary")}</Text>
            <View />
          </View>
          <View style={styles.hr} />
          <View style={styles.buttonStack}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Summary", { period: "day" })}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{t("btnDailySummary")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Summary", { period: "week" })}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{t("btnWeeklySummary")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Summary", { period: "month" })}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{t("btnMonthlySummary")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={scrollTop}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnNeutral, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnTextNeutral}>{t("btnBack")}</Text>
            </Pressable>
          </View>

          <Text style={styles.miniHint}>
            {locale === "en"
              ? "* A feature that helps you understand yourself by organizing scattered logs into a single flow."
              : locale === "ja"
                ? "※ バラバラな記録をひとつの流れに整え、自分を理解するための機能です。"
                : "※ 흩어진 기록을 한 흐름으로 정리해 스스로를 이해하도록 돕는 기능입니다."}
          </Text>
        </View>

        {/* 자서전 */}
        <View style={styles.card}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>📘 {t("sectionAutobiography")}</Text>
            <View />
          </View>
          <View style={styles.hr} />

          <View style={styles.buttonStack}>
            {!autoPickerOpen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setAutoStart(null);
                  setAutoEnd(null);
                  setAutoPickerOpen(true);
                }}
                style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Text style={styles.bigBtnText}>{t("btnGenerateAutobiography")}</Text>
              </Pressable>
            ) : null}

            {autoPickerOpen ? (
              <>
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>
                    {locale === "en" ? "Period:" : locale === "ja" ? "期間:" : "기간:"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setAutoStart(null);
                        setAutoEnd(null);
                      }}
                      style={({ pressed }) => [styles.clearPill, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={styles.clearPillText}>
                        {locale === "en" ? "Reset" : locale === "ja" ? "リセット" : "초기화"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAutoPickerOpen(false)}
                      style={({ pressed }) => [styles.clearPill, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={styles.clearPillText}>
                        {locale === "en" ? "Close" : locale === "ja" ? "閉じる" : "닫기"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <CalendarRangePicker
                  locale={locale}
                  value={{ start: autoStart, end: autoEnd }}
                  onChange={(next) => {
                    setAutoStart(next.start);
                    setAutoEnd(next.end);
                  }}
                />

                {(autoStart || autoEnd) ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={goAutobiographyWithSelectedRange}
                    style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnPrimary, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text style={styles.bigBtnText}>{t("btnGenerateAutobiography")}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={scrollTop}
              style={({ pressed }) => [styles.bigBtnWide, styles.bigBtnNeutral, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.bigBtnTextNeutral}>{t("btnBack")}</Text>
            </Pressable>
          </View>

          <Text style={styles.miniHint}>
            {locale === "en"
              ? "* A space where your accumulated logs become one story."
              : locale === "ja"
                ? "※ 積み重ねた記録が一つの物語として整えられる場所です。"
                : "※ 쌓아온 기록이 하나의 이야기로 정리되는 공간입니다."}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: 18,
  },
  pageHeader: {
    paddingBottom: 6,
    maxWidth: 840,
    alignSelf: "center",
    width: "100%",
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  hint: { marginTop: 10, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  chip: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#E4F0FF",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, color: Colors.primary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 840,
    width: "100%",
    alignSelf: "center",
  },
  sectionOnly: {
    maxWidth: 840,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  sectionHead: { paddingVertical: 8 },
  sectionHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: Colors.text },
  hr: { height: 3, backgroundColor: "#2E6BA8", borderRadius: 999, marginBottom: 14 },
  textarea: {
    minHeight: 150,
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
  },
  rowLeft: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginTop: 12 },
  rowSpace: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 14 },
  buttonStack: { flexDirection: "column", alignItems: "flex-start", marginTop: 12, gap: 12 },
  bigBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  bigBtnWide: {
    width: 220,
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  bigBtnPrimary: { backgroundColor: "#2563EB", borderColor: "#111827" },
  bigBtnNeutral: { backgroundColor: "#6B7280", borderColor: "#111827" },
  bigBtnText: { color: "white", fontSize: 16, fontWeight: "900" },
  bigBtnTextNeutral: { color: "white", fontSize: 16, fontWeight: "900" },
  savedNotice: { marginTop: 10, fontSize: 13, fontWeight: "800", color: Colors.primary },
  footnote: { marginTop: 10, fontSize: 12, color: Colors.mutedText },
  miniHint: { marginTop: 12, fontSize: 12, lineHeight: 18, color: Colors.mutedText },
  logItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logMeta: { fontSize: 12, color: Colors.mutedText, marginBottom: 6 },
  logText: { fontSize: 14, color: Colors.text },
  summaryRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  periodLabel: { fontSize: 15, fontWeight: "800", color: Colors.text },
  clearPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "white",
  },
  clearPillText: { fontSize: 12, fontWeight: "900", color: Colors.mutedText },
  mentorInput: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    backgroundColor: "#FAFCFF",
  },
  mentorReplyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F7FBFF",
  },
  mentorReplyText: { fontSize: 14, lineHeight: 20, color: Colors.text },
  mentorErrorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  mentorErrorText: { fontSize: 13, lineHeight: 18, color: "#991B1B", fontWeight: "700" },
});

