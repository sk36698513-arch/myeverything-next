import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
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
import { fetchMentorAdvice } from "../ai/mentorApi";
import { makeId } from "../lib/id";
import { useI18n } from "../i18n/i18n";

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
  const { t, locale } = useI18n();

  useEffect(() => {
    loadLogs().then(setLogs);
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
    // 새 메시지가 추가될 때 항상 맨 아래로 스크롤
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  async function send() {
    if (sendingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    sendingRef.current = true;
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
    try {
      const replyText = await fetchMentorAdvice({ message: trimmed, locale });
      const reply: ChatMessage = {
        id: makeId("assistant"),
        role: "assistant",
        text: replyText,
        createdAtISO: nowISO(),
      };
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? reply : m)));
    } catch {
      // 네트워크/서버 실패 시 로컬(휴리스틱) 답변으로 폴백
      const reply = makeAssistantReply({ userText: trimmed, logs, locale });
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? reply : m)));
    } finally {
      setSending(false);
      sendingRef.current = false;
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
        </View>

        <FlatList
          ref={(r) => {
            // FlatList ref 타입 호환
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            listRef.current = r as any;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg }}
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
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("assistantPlaceholder")}
            placeholderTextColor="#8AA4B8"
            style={styles.input}
            multiline
          />
          <View style={{ width: 10 }} />
          <View style={{ width: 110 }}>
            <PrimaryButton title={sending ? (locale === "en" ? "Sending..." : locale === "ja" ? "送信中…" : "전송중...") : t("send")} onPress={send} />
            <View style={{ height: 8 }} />
            <PrimaryButton title={t("btnBack")} variant="secondary" onPress={() => navigation.navigate("Dashboard")} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: Colors.mutedText },
  bubble: {
    maxWidth: "90%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.primary },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: Colors.card },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: "white" },
  assistantText: { color: Colors.text },
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

