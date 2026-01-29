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

function factQuestions(locale: Locale) {
  if (locale === "en") {
    return [
      "What is the concrete situation (events only) in 1–2 sentences?",
      "What options are you considering right now (list 2–5)?",
      "What constraint matters most (time/budget/risk/quality)?",
      "What measurable result do you want next?",
      "What is the earliest deadline?",
      "What resource is limiting (money/people/time)?",
      "What is already decided vs undecided?",
      "What would be an acceptable minimum outcome?",
      "What is the worst-case outcome you want to avoid?",
    ];
  }
  if (locale === "ja") {
    return [
      "具体的な状況（出来事のみ）を1〜2文で。",
      "いま検討中の選択肢を2〜5個、箇条書きで。",
      "重要な制約は何ですか（時間/予算/リスク/品質）？",
      "次に欲しい測定可能な結果は？",
      "最も近い締切は？",
      "不足しているリソースは（お金/人/時間）？",
      "既に決まっていること／未決定は？",
      "最低ライン（許容できる最小成果）は？",
      "避けたい最悪ケースは？",
    ];
  }
  return [
    "구체적 상황(사실만)을 1~2문장으로 적어주세요.",
    "지금 고려 중인 선택지를 2~5개로 적어주세요.",
    "가장 중요한 제약은 무엇인가요(시간/예산/리스크/품질)?",
    "다음에 원하는 측정 가능한 결과는 무엇인가요?",
    "가장 가까운 마감은 언제인가요?",
    "제한된 자원은 무엇인가요(돈/사람/시간)?",
    "이미 결정된 것과 미결정은 무엇인가요?",
    "최소 허용 가능한 결과(하한선)는 무엇인가요?",
    "피하고 싶은 최악의 결과는 무엇인가요?",
  ];
}

export function makeAssistantReply(params: {
  userText: string;
  logs: DailyLog[];
  locale: Locale;
  offlineReason?: "daily_limit" | "cooldown" | "message_too_long" | "network_error";
}): ChatMessage {
  const { userText, logs, locale, offlineReason } = params;
  // 감정/의견 배제 모드: 감정 추정은 내부적으로만 사용(표시에 사용하지 않음)
  analyzeEmotion(userText);
  const hint = lastLogHint(logs);
  const trimmed = userText.trim();
  const clues = extractConcreteClues(trimmed);
  const seed = hashString(`${new Date().toISOString().slice(0, 10)}|${trimmed}`);

  const header =
    locale === "en" ? "FACT MODE (offline)" : locale === "ja" ? "FACTモード（オフライン）" : "FACT 모드(오프라인)";

  const reasonLine = (() => {
    if (!offlineReason) return null;
    if (locale === "en") {
      return offlineReason === "daily_limit"
        ? "- Mode: Server AI skipped (daily limit)."
        : offlineReason === "cooldown"
          ? "- Mode: Server AI skipped (cooldown)."
          : offlineReason === "message_too_long"
            ? "- Mode: Server AI skipped (message too long)."
            : "- Mode: Server AI skipped (network error).";
    }
    if (locale === "ja") {
      return offlineReason === "daily_limit"
        ? "- モード: サーバーAIをスキップ（本日の上限）。"
        : offlineReason === "cooldown"
          ? "- モード: サーバーAIをスキップ（クールダウン）。"
          : offlineReason === "message_too_long"
            ? "- モード: サーバーAIをスキップ（文章が長すぎます）。"
            : "- モード: サーバーAIをスキップ（ネットワーク）。";
    }
    return offlineReason === "daily_limit"
      ? "- 모드: 서버 AI 호출 생략(일일 제한)."
      : offlineReason === "cooldown"
        ? "- 모드: 서버 AI 호출 생략(쿨다운)."
        : offlineReason === "message_too_long"
          ? "- 모드: 서버 AI 호출 생략(메시지 과다)."
          : "- 모드: 서버 AI 호출 생략(네트워크).";
  })();

  const keywords = locale === "ko" ? pickKeywordsKo(trimmed, 3) : [];
  const topicLine =
    locale === "en"
      ? trimmed
        ? `- Topic: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`
        : "- Topic: (empty)"
      : locale === "ja"
        ? trimmed
          ? `- テーマ: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`
          : "- テーマ: （空）"
        : trimmed
          ? `- 주제: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`
          : "- 주제: (비어 있음)";

  const facts = (() => {
    const items: string[] = [];
    if (keywords.length) items.push(locale === "ko" ? `- 사실: 키워드(사용자 입력): ${keywords.join(", ")}` : "");
    if (clues.money.length) items.push(locale === "ko" ? `- 사실: 금액 표기: ${clues.money.join(", ")}` : `- Facts: Money mentioned: ${clues.money.join(", ")}`);
    if (clues.time.length) items.push(locale === "ko" ? `- 사실: 시간/기간 표기: ${clues.time.join(", ")}` : `- Facts: Time mentioned: ${clues.time.join(", ")}`);
    if (clues.nums.length && !clues.money.length) items.push(locale === "ko" ? `- 사실: 숫자 표기: ${clues.nums.join(", ")}` : `- Facts: Numbers mentioned: ${clues.nums.join(", ")}`);
    if (items.length === 0) {
      return locale === "en"
        ? "- Facts: No concrete facts detected (no numbers/time/money)."
        : locale === "ja"
          ? "- 事実: 具体的な事実（数値/期限/金額）が見当たりません。"
          : "- 사실: 구체 사실(수치/기한/금액) 단서가 없습니다.";
    }
    return items.filter(Boolean).join("\n");
  })();

  const assumptions =
    locale === "en"
      ? "- Assumptions: Your message is a goal/request, not a description of events."
      : locale === "ja"
        ? "- 推定: この文章は出来事の説明ではなく、依頼/目標です。"
        : "- 추정: 이 문장은 사건/상황 설명이 아니라 요청/목표입니다.";

  const options = (() => {
    // 조건부 선택지는 질문과 무관하게 반복되지 않도록 키워드 기반으로 약간씩 바꿈(해시)
    const variantsKo = [
      ["- 선택지:", "  - IF 기준=시간 THEN 가장 짧은 실행안을 우선", "  - IF 기준=성과 THEN 영향도 상위 1~2개를 우선", "  - IF 기준=리스크 THEN 최악 케이스를 줄이는 안을 우선"],
      ["- 선택지:", "  - IF 기준=현금흐름 THEN 즉시 수익/회수 가능한 일을 우선", "  - IF 기준=브랜드 THEN 일관성/신뢰를 높이는 일을 우선", "  - IF 기준=학습 THEN 실험 1개 + 측정 1개를 우선"],
      ["- 선택지:", "  - IF 선택지 목록이 있음 THEN (가치/비용/리스크) 3점수로 정렬", "  - IF 마감이 있음 THEN 마감 역산으로 최소 요건부터", "  - IF 자원이 부족 THEN 범위를 줄여 단일 목표로"],
    ];
    const variantsEn = [
      ["- Options:", "  - IF priority=time THEN pick the fastest executable option", "  - IF priority=impact THEN pick top 1–2 by impact", "  - IF priority=risk THEN pick the option that reduces worst-case risk"],
      ["- Options:", "  - IF priority=cashflow THEN pick immediate revenue/collection tasks", "  - IF priority=brand THEN pick consistency/trust tasks", "  - IF priority=learning THEN pick 1 experiment + 1 measurement"],
      ["- Options:", "  - IF you have a candidate list THEN score (value/cost/risk) and sort", "  - IF you have a deadline THEN work backwards from the deadline", "  - IF resources are tight THEN narrow scope to a single measurable target"],
    ];
    const variantsJa = [
      ["- 選択肢:", "  ・IF 基準=時間 THEN 最短で実行できる案を優先", "  ・IF 基準=成果 THEN 影響度上位1〜2を優先", "  ・IF 基準=リスク THEN 最悪リスクを下げる案を優先"],
      ["- 選択肢:", "  ・IF 基準=キャッシュ THEN 即時回収/収益に近い作業を優先", "  ・IF 基準=ブランド THEN 一貫性/信頼を上げる作業を優先", "  ・IF 基準=学習 THEN 実験1つ+測定1つを優先"],
      ["- 選択肢:", "  ・IF 候補がある THEN (価値/コスト/リスク)でスコア化して並べ替え", "  ・IF 締切がある THEN 締切から逆算して最小要件から", "  ・IF リソース不足 THEN 範囲を絞り単一目標に"],
    ];
    const pick = seed % 3;
    const lines = locale === "en" ? variantsEn[pick] : locale === "ja" ? variantsJa[pick] : variantsKo[pick];
    return lines.join("\n");
  })();

  const ref = hint
    ? locale === "en"
      ? `- Reference (last log, first line): "${hint.firstLine}…"`
      : locale === "ja"
        ? `- 参考（直近ログの冒頭）: 「${hint.firstLine}…」`
        : `- 참고(최근 기록 첫 줄): “${hint.firstLine}…”`
    : null;

  const qs = factQuestions(locale);
  const start = seed % Math.max(1, qs.length);
  const picked = [qs[start], qs[(start + 2) % qs.length], qs[(start + 5) % qs.length]].filter(Boolean).slice(0, 3);
  const qBlock =
    locale === "en"
      ? ["- Clarifying questions:", ...picked.map((q) => `  - ${q}`)].join("\n")
      : locale === "ja"
        ? ["- 確認質問:", ...picked.map((q) => `  - ${q}`)].join("\n")
        : ["- 확인 질문:", ...picked.map((q) => `  - ${q}`)].join("\n");

  const text = [header, reasonLine, topicLine, facts, assumptions, options, ref, qBlock].filter(Boolean).join("\n");

  return {
    id: `assistant_${Date.now()}`,
    role: "assistant",
    text,
    createdAtISO: new Date().toISOString(),
  };
}

