import type { ChatMessage, DailyLog } from "../types";
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

function factQuestions(locale: Locale) {
  if (locale === "en") {
    return [
      "What happened (observable events only) in 1–2 sentences?",
      "When/where did it happen, and who was involved?",
      "What outcome are you trying to achieve next (specific and measurable)?",
    ];
  }
  if (locale === "ja") {
    return [
      "何が起きましたか（観察できる事実のみ）を1〜2文で。",
      "いつ/どこで/誰が関わりましたか？",
      "次に達成したい結果は何ですか（具体的・測定可能）？",
    ];
  }
  return [
    "무슨 일이 있었나요(관찰 가능한 사실만) 1~2문장으로 적어주세요.",
    "언제/어디서/누가 관련됐나요?",
    "다음에 얻고 싶은 결과는 무엇인가요(구체적·측정 가능)?",
  ];
}

export function makeAssistantReply(params: {
  userText: string;
  logs: DailyLog[];
  locale: Locale;
}): ChatMessage {
  const { userText, logs, locale } = params;
  // 감정/의견 배제 모드: 감정 추정은 내부적으로만 사용(표시에 사용하지 않음)
  analyzeEmotion(userText);
  const hint = lastLogHint(logs);

  const header =
    locale === "en" ? "FACT MODE (offline)" : locale === "ja" ? "FACTモード（オフライン）" : "FACT 모드(오프라인)";

  const facts =
    locale === "en"
      ? "- Facts: Insufficient info to extract reliable facts from the message alone."
      : locale === "ja"
        ? "- 事実: この文面だけでは、確実な事実を十分に抽出できません。"
        : "- 사실: 이 문장만으로는 확실한 사실을 충분히 추출하기 어렵습니다.";

  const ref = hint
    ? locale === "en"
      ? `- Reference (last log, first line): "${hint.firstLine}…"`
      : locale === "ja"
        ? `- 参考（直近ログの冒頭）: 「${hint.firstLine}…」`
        : `- 참고(최근 기록 첫 줄): “${hint.firstLine}…”`
    : null;

  const qs = factQuestions(locale);
  const qBlock =
    locale === "en"
      ? ["- Clarifying questions:", `  - ${qs[0]}`, `  - ${qs[1]}`, `  - ${qs[2]}`].join("\n")
      : locale === "ja"
        ? ["- 確認質問:", `  - ${qs[0]}`, `  - ${qs[1]}`, `  - ${qs[2]}`].join("\n")
        : ["- 확인 질문:", `  - ${qs[0]}`, `  - ${qs[1]}`, `  - ${qs[2]}`].join("\n");

  const text = [header, facts, ref, qBlock].filter(Boolean).join("\n");

  return {
    id: `assistant_${Date.now()}`,
    role: "assistant",
    text,
    createdAtISO: new Date().toISOString(),
  };
}

