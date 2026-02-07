import type { ChatMessage, DailyLog } from "../types";
import type { Locale } from "../i18n/translations";
import { analyzeEmotion } from "./emotion";

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickKeywordsKo(text: string, max = 3) {
  const stop = new Set([
    "지금",
    "현재",
    "정말",
    "그냥",
    "내가",
    "나는",
    "내",
    "것",
    "수",
    "좀",
    "더",
    "제발",
    "해줘",
    "해주세요",
    "부탁",
    "가능",
    "무엇",
    "어떻게",
    "왜",
    "어떤",
    "그리고",
    "또",
    "때문",
    "관련",
    "정리",
    "분석",
  ]);
  const words = text
    .replaceAll("\n", " ")
    .split(/[\s,.;:!?()"'“”‘’/\\]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 12 && !stop.has(w));

  const uniq: string[] = [];
  for (const w of words) {
    if (!uniq.includes(w)) uniq.push(w);
    if (uniq.length >= max) break;
  }
  return uniq;
}

function extractConcreteClues(text: string) {
  const t = text.replaceAll("\n", " ");
  const nums = [...t.matchAll(/\b\d+(?:\.\d+)?\b/g)].slice(0, 5).map((m) => m[0]);
  const money = [...t.matchAll(/(\d+(?:\.\d+)?\s*(?:원|만원|억|USD|KRW|JPY|달러))/g)]
    .slice(0, 3)
    .map((m) => m[1]);
  const time = [...t.matchAll(/(\d+\s*(?:일|주|개월|달|년)|오늘|내일|이번\s*주|이번\s*달)/g)]
    .slice(0, 3)
    .map((m) => m[1]);
  return { nums, money, time };
}

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

export function makeAssistantReply(params: {
  userText: string;
  logs: DailyLog[];
  locale: Locale;
  offlineReason?: "daily_limit" | "cooldown" | "message_too_long" | "network_error";
}): ChatMessage {
  const { userText, logs, locale, offlineReason } = params;
  // 오프라인 폴백: 일반 ChatGPT 스타일(대화형 멘토)
  analyzeEmotion(userText);
  const hint = lastLogHint(logs);
  const trimmed = userText.trim();
  const seed = hashString(`${new Date().toISOString().slice(0, 10)}|${trimmed}`);

  const header = locale === "en" ? "Offline mode" : locale === "ja" ? "オフラインモード" : "오프라인 모드";

  const reasonLine = (() => {
    if (!offlineReason) return null;
    if (locale === "en") {
      return offlineReason === "daily_limit"
        ? "(Server AI skipped: daily limit)"
        : offlineReason === "cooldown"
          ? "(Server AI skipped: cooldown)"
          : offlineReason === "message_too_long"
            ? "(Server AI skipped: message too long)"
            : "(Server AI skipped: network error)";
    }
    if (locale === "ja") {
      return offlineReason === "daily_limit"
        ? "（サーバーAI: 本日の上限でスキップ）"
        : offlineReason === "cooldown"
          ? "（サーバーAI: クールダウンでスキップ）"
          : offlineReason === "message_too_long"
            ? "（サーバーAI: 文章が長すぎてスキップ）"
            : "（サーバーAI: ネットワークでスキップ）";
    }
    return offlineReason === "daily_limit"
      ? "(서버 AI: 일일 제한으로 생략)"
      : offlineReason === "cooldown"
        ? "(서버 AI: 쿨다운으로 생략)"
        : offlineReason === "message_too_long"
          ? "(서버 AI: 메시지가 길어 생략)"
          : "(서버 AI: 네트워크로 생략)";
  })();

  const keywords = locale === "ko" ? pickKeywordsKo(trimmed, 3) : [];
  const topic =
    locale === "en"
      ? trimmed
        ? `Topic: ${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`
        : "Topic: (empty)"
      : locale === "ja"
        ? trimmed
          ? `テーマ: ${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`
          : "テーマ:（空）"
        : trimmed
          ? `주제: ${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`
          : "주제: (비어 있음)";

  const promptLine =
    locale === "en"
      ? "Here are a few ways we can approach this:"
      : locale === "ja"
        ? "いくつか進め方を提案します："
        : "몇 가지 진행 방향을 제안할게요:";

  const variantsKo = [
    ["- 먼저 상황을 한 문장으로 요약해볼까요?", "- 지금 당장 할 수 있는 ‘가장 작은 다음 행동’ 1개를 정해요.", "- 원하면 선택지(2~3개) 중 우선순위를 같이 정리해요."],
    ["- 핵심 목표가 뭐였는지(오늘/이번주)만 딱 정해요.", "- 방해 요인이 뭐였는지 1~2개만 적어봐요.", "- 그 방해를 줄이는 행동을 10분짜리로 쪼개요."],
    ["- 지금 마음/에너지(0~10)가 어느 정도인지부터 잡아요.", "- 에너지가 낮으면 ‘유지/회복’ 플랜으로, 높으면 ‘전진’ 플랜으로 가요.", "- 다음 질문 하나만 답해줘도 돼요: “지금 제일 걱정되는 건 뭐야?”"],
  ];
  const variantsEn = [
    ["- Let’s summarize the situation in one sentence.", "- Pick the smallest next action you can do today.", "- If you have options, we can prioritize them together."],
    ["- Clarify your goal for today/this week.", "- Name 1–2 blockers.", "- Turn the next step into a 10‑minute task."],
    ["- Rate your energy (0–10).", "- Low energy: stabilize/restore; high energy: advance.", "- What’s the single biggest concern right now?"],
  ];
  const variantsJa = [
    ["- 状況を一文で要約してみましょう。", "- 今日できる最小の次の行動を1つ決めます。", "- 選択肢があるなら優先順位を一緒に整理します。"],
    ["- 今日/今週の目標を1つに絞ります。", "- 障害を1〜2個挙げます。", "- 次の一歩を10分タスクに分解します。"],
    ["- エネルギー(0〜10)を教えてください。", "- 低い:維持/回復、高い:前進。", "- いま一番の不安は何ですか？"],
  ];
  const pick = seed % 3;
  const suggestions = (locale === "en" ? variantsEn[pick] : locale === "ja" ? variantsJa[pick] : variantsKo[pick]).join("\n");

  const ref = hint
    ? locale === "en"
      ? `Recent log: "${hint.firstLine}…"`
      : locale === "ja"
        ? `最近の記録: 「${hint.firstLine}…」`
        : `최근 기록: “${hint.firstLine}…”`
    : null;

  const qBlock =
    locale === "en"
      ? "Quick question: what outcome do you want from this conversation?"
      : locale === "ja"
        ? "確認: この会話で得たい結果は何ですか？"
        : "확인: 이 대화에서 얻고 싶은 결과가 뭐예요?";

  const keywordLine = keywords.length && locale === "ko" ? `키워드: ${keywords.join(", ")}` : null;
  const text = [header, reasonLine, topic, keywordLine, ref, promptLine, suggestions, qBlock].filter(Boolean).join("\n\n");

  return {
    id: `assistant_${Date.now()}`,
    role: "assistant",
    text,
    createdAtISO: new Date().toISOString(),
  };
}

