import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  InteractionManager,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { Colors } from "../theme/colors";
import { Spacing } from "../theme/spacing";
import type { ChatMessage, DailyLog } from "../types";
import { loadLogs } from "../storage/logs";
import { loadChat, appendChat } from "../storage/chat";
import { makeAssistantReply } from "../ai/assistant";
import { fetchMentorAdvice, isMentorQuotaError } from "../ai/mentorApi";
import { makeId } from "../lib/id";
import { useI18n } from "../i18n/i18n";
import { getMentorQuotaStatus } from "../storage/mentorQuota";

type Props = NativeStackScreenProps<RootStackParamList, "Assistant">;

function nowISO() {
  return new Date().toISOString();
}

export function AssistantScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const forceScrollRef = useRef(false);
  const pendingScrollRef = useRef(false);
  const { t, locale } = useI18n();
  const [quotaHint, setQuotaHint] = useState<string | null>(null);

  // 마지막 메시지가 입력창에 가리지 않도록, 입력창 실제 높이만큼만 여백을 둠
  const [composerHeight, setComposerHeight] = useState(120);

  function scrollToBottom(animated = true) {
    const list = listRef.current;
    if (!list) return;

    // FlatList on web can be flaky; retry a few times.
    const run = (delayMs: number) => {
      setTimeout(() => {
        const doScroll = () => {
          try {
            list.scrollToEnd({ animated });
          } catch {
            // ignore
          }
        };

        // RN/web에서 레이아웃 타이밍 이슈가 있어 afterInteractions + RAF로 보강
        try {
          InteractionManager.runAfterInteractions(() => {
            try {
              requestAnimationFrame(doScroll);
            } catch {
              doScroll();
            }
          });
        } catch {
          doScroll();
        }
      }, delayMs);
    };

    run(0);
    run(50);
    run(200);
  }

  function onListScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const paddingToBottom = composerHeight + 40; // composer + small buffer
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    setIsNearBottom(nearBottom);
  }

  useEffect(() => {
    loadLogs().then(setLogs);
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
        setQuotaHint(base + cool);
      })
      .catch(() => setQuotaHint(null));
    loadChat().then((m) => {
      if (m.length > 0) setMessages(m);
      else {
        const firstText =
          locale === "en"
            ? "This is a space without comparison or judgment.\n\nWrite one sentence about how you feel today. I won’t give you “the answer”—I’ll ask questions to help you organize your thoughts."
            : locale === "ja"
              ? "ここは比較や評価のない場所です。\n\n今日の気持ちを一文で書いてみませんか？私は「答え」を与えるのではなく、考えを整えるための質問を届けます。"
              : "여기는 비교나 평가가 없는 공간이에요.\n\n오늘의 마음을 한 문장으로 적어볼까요? 저는 ‘답’을 주기보다, 스스로 정리할 수 있도록 질문을 건넬게요.";

        const first: ChatMessage = {
          id: makeId("assistant"),
          role: "assistant",
          text: firstText,
          createdAtISO: nowISO(),
        };
        setMessages([first]);
      }
    });
  }, []);

  useEffect(() => {
    appendChat(messages);
  }, [messages]);

  const data = useMemo(() => messages, [messages]);

  useEffect(() => {
    // 새 메시지가 추가될 때: (1) 사용자가 하단 근처면 자동 스크롤, (2) 방금 전송한 경우는 강제 스크롤
    if (forceScrollRef.current || isNearBottom) {
      scrollToBottom(true);
      forceScrollRef.current = false;
    }
  }, [messages.length]);

  useEffect(() => {
    // 메시지 "교체"(길이 유지) 케이스까지 커버: 렌더 후 1회 더 보장
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    if (forceScrollRef.current || isNearBottom) {
      scrollToBottom(true);
      forceScrollRef.current = false;
    }
  }, [messages]);

  async function send() {
    if (sendingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    sendingRef.current = true;
    forceScrollRef.current = true;
    pendingScrollRef.current = true;
    setText("");

    const userMsg: ChatMessage = {
      id: makeId("user"),
      role: "user",
      text: trimmed,
      createdAtISO: nowISO(),
    };

    const thinkingText =
      locale === "en" ? "Thinking..." : locale === "ja" ? "考えています…" : "생각중...";
    const thinkingId = makeId("assistant_thinking");
    const thinkingMsg: ChatMessage = {
      id: thinkingId,
      role: "assistant",
      text: thinkingText,
      createdAtISO: nowISO(),
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setSending(true);
    scrollToBottom(true);
    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-5)
        .map((m) => ({ role: m.role, text: m.text }));
      const replyText = await fetchMentorAdvice({ message: trimmed, locale, history });
      const reply: ChatMessage = {
        id: makeId("assistant"),
        role: "assistant",
        text: replyText,
        createdAtISO: nowISO(),
      };
      pendingScrollRef.current = true;
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? reply : m)));
      scrollToBottom(true);
    } catch (e) {
      // 토큰/요청 제한: 서버 호출 없이 로컬 질문 모드로 전환
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

        const local = makeAssistantReply({
          userText: trimmed,
          logs,
          locale,
          offlineReason:
            e.code === "mentor_message_too_long"
              ? "message_too_long"
              : e.code === "mentor_rate_limited"
                ? "cooldown"
                : "daily_limit",
        });
        const merged: ChatMessage = {
          ...local,
          id: makeId("assistant"),
          createdAtISO: nowISO(),
          // note는 중복/반복을 만들기 쉬워서, local 텍스트에 reason으로 포함시킴
          text: local.text,
        };
        pendingScrollRef.current = true;
        setMessages((prev) => prev.map((m) => (m.id === thinkingId ? merged : m)));
        scrollToBottom(true);
        return;
      }

      // 네트워크/서버 실패 시 로컬(휴리스틱) 답변으로 폴백
      const reply = makeAssistantReply({ userText: trimmed, logs, locale });
      pendingScrollRef.current = true;
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? reply : m)));
      scrollToBottom(true);
    } finally {
      setSending(false);
      sendingRef.current = false;
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
          setQuotaHint(base + cool);
        })
        .catch(() => setQuotaHint(null));
    }
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("assistantTitle")}</Text>
          <Text style={styles.subtitle}>{t("assistantSubtitle")}</Text>
          {quotaHint ? <Text style={styles.quotaHint}>{quotaHint}</Text> : null}
        </View>

        <FlatList
          ref={(r) => {
            // FlatList ref 타입 호환
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            listRef.current = r as any;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.lg + composerHeight }}
          keyboardShouldPersistTaps="handled"
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, item.role === "user" ? styles.userText : styles.assistantText]}>
                {item.text}
              </Text>
            </View>
          )}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (forceScrollRef.current || isNearBottom) scrollToBottom(true);
          }}
        />

        <View
          style={styles.composer}
          onLayout={(e: LayoutChangeEvent) => {
            const h = Math.max(90, Math.round(e.nativeEvent.layout.height));
            // 높이가 실제로 바뀌었을 때만 갱신
            setComposerHeight((prev) => (Math.abs(prev - h) > 4 ? h : prev));
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("assistantPlaceholder")}
            placeholderTextColor="#8AA4B8"
            style={styles.input}
            multiline
            onFocus={() => scrollToBottom(true)}
          />
          <View style={{ width: 10 }} />
          <View style={{ width: 96 }}>
            <PrimaryButton
              size="sm"
              title={sending ? (locale === "en" ? "Sending..." : locale === "ja" ? "送信中…" : "전송중...") : t("send")}
              onPress={send}
            />
            <View style={{ height: 8 }} />
            <PrimaryButton
              size="sm"
              title={t("btnBack")}
              variant="secondary"
              onPress={() => navigation.navigate("Dashboard")}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.lg, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 24, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  quotaHint: { marginTop: 8, fontSize: 12, lineHeight: 16, color: Colors.mutedText },
  bubble: {
    maxWidth: "90%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // 사용자(질문)=흰색, AI(답변)=파란색
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.card, borderColor: Colors.border },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: Colors.primary, borderColor: Colors.primary },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: Colors.text },
  assistantText: { color: "white" },
  composer: {
    padding: Spacing.lg,
    flexDirection: "row",
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    maxHeight: 110,
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
});

