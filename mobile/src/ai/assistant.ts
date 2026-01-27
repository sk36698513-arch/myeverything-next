import type { ChatMessage, DailyLog, EmotionLabel } from "../types";
import type { Locale } from "../i18n/translations";
import { analyzeEmotion } from "./emotion";

function pickFirstNonEmpty(lines: string[]) {
  for (const l of lines) {
    const t = l.trim();
    if (t) return t;
  }
  return "";
}

function lastLogHint(logs: DailyLog[]) {
  const last = logs[0];
  if (!last) return null;
  const firstLine = pickFirstNonEmpty(last.content.split("\n")).slice(0, 60);
  return { emotion: last.emotion, firstLine };
}

function gentleQuestionByEmotion(locale: Locale, emotion: EmotionLabel) {
  const bankKo: Record<EmotionLabel, string[]> = {
    안정: [
      "오늘 마음이 편안했던 이유는 무엇이었나요?",
      "이 편안함을 내일의 나에게도 전해준다면, 어떤 한 가지를 남기고 싶나요?",
    ],
    피곤: ["오늘 가장 버거웠던 순간은 언제였나요?", "지금 내게 ‘덜어내도 되는 것’이 있다면 무엇일까요?"],
    불안: ["오늘 마음이 경계한 이유는 무엇이었나요?", "지금 내가 지키고 싶은 것은 무엇인가요?"],
    혼란: [
      "지금 가장 복잡한 생각 한 가지를 한 문장으로 적어본다면 무엇인가요?",
      "정리를 위해 오늘 ‘확실한 사실’ 하나만 고른다면 무엇일까요?",
    ],
  };

  const bankEn: Record<EmotionLabel, string[]> = {
    안정: [
      "What made you feel calm today?",
      "If you could carry this calm into tomorrow, what one thing would you keep?",
    ],
    피곤: ["When did today feel the heaviest?", "What is one thing you could gently let go of right now?"],
    불안: ["What was your mind trying to protect you from today?", "What do you want to keep safe right now?"],
    혼란: ["If you name one confusing thought in one sentence, what is it?", "What is one clear fact you can hold onto today?"],
  };

  const bankJa: Record<EmotionLabel, string[]> = {
    안정: ["今日、心が落ち着いた理由は何でしたか？", "この落ち着きを明日の自分へ渡すなら、残したい一つは何ですか？"],
    피곤: ["今日いちばん重かった瞬間はいつでしたか？", "いま手放してもよいものがあるとしたら何でしょう？"],
    불안: ["今日、心が警戒した理由は何でしたか？", "いま守りたいものは何ですか？"],
    혼란: ["いちばん混乱している考えを一文で書くなら何ですか？", "整理のために、今日の“確かな事実”を一つ選ぶなら？"],
  };

  const bank = locale === "en" ? bankEn : locale === "ja" ? bankJa : bankKo;
  const list = bank[emotion];
  return list[Math.floor(Math.random() * list.length)];
}

export function makeAssistantReply(params: {
  userText: string;
  logs: DailyLog[];
  locale: Locale;
}): ChatMessage {
  const { userText, logs, locale } = params;
  const inferred = analyzeEmotion(userText).label;
  const hint = lastLogHint(logs);

  const opener =
    locale === "en"
      ? "Thank you. Writing your feelings as they are is already enough."
      : locale === "ja"
        ? "ありがとう。気持ちをそのまま書けたことだけでも十分です。"
        : "고마워요. 지금의 마음을 있는 그대로 기록해준 것만으로도 충분해요.";

  const contextLine = hint
    ? locale === "en"
      ? `In your recent logs, there was a thread like “${hint.firstLine}…”.`
      : locale === "ja"
        ? `最近の記録には「${hint.firstLine}…」のような流れがありました。`
        : `최근 기록에서는 “${hint.firstLine}…” 같은 흐름이 있었어요.`
    : locale === "en"
      ? "It’s okay even if you don’t have many logs yet."
      : locale === "ja"
        ? "記録がまだ少なくても大丈夫です。"
        : "최근 기록이 아직 많지 않아도 괜찮아요.";

  const q = gentleQuestionByEmotion(locale, inferred);
  const close =
    locale === "en"
      ? "Take your time—answer only within what feels comfortable."
      : locale === "ja"
        ? "ゆっくりで大丈夫。無理のない範囲で答えてください。"
        : "천천히, 부담 없는 범위에서 답해도 괜찮아요.";

  const text = [opener, contextLine, q, close].join("\n\n");

  return {
    id: `assistant_${Date.now()}`,
    role: "assistant",
    text,
    createdAtISO: new Date().toISOString(),
  };
}

