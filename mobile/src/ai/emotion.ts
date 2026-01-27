import type { EmotionLabel } from "../types";
import type { Locale } from "../i18n/translations";

type EmotionResult = {
  label: EmotionLabel;
  summary: string;
};

const KEYWORDS: Record<EmotionLabel, string[]> = {
  안정: ["괜찮", "편안", "차분", "감사", "기분좋", "좋았", "만족", "여유"],
  피곤: ["피곤", "지침", "지쳤", "졸려", "잠", "무기력", "힘들", "버거"],
  불안: ["불안", "걱정", "긴장", "초조", "두려", "무섭", "불편", "떨려"],
  혼란: ["혼란", "헷갈", "모르겠", "정리가", "복잡", "갈피", "애매", "뒤죽박죽"],
};

function scoreFor(label: EmotionLabel, text: string) {
  const needles = KEYWORDS[label];
  let score = 0;
  for (const n of needles) {
    if (text.includes(n)) score += 2;
  }
  // 느낌표/물음표는 불안·혼란 가중치 (아주 가볍게)
  if ((label === "불안" || label === "혼란") && /[!?]/.test(text)) score += 1;
  return score;
}

export function analyzeEmotion(content: string): EmotionResult {
  const text = (content ?? "").trim().toLowerCase();
  const scores: Array<[EmotionLabel, number]> = (Object.keys(KEYWORDS) as EmotionLabel[]).map(
    (k) => [k, scoreFor(k, text)]
  );
  scores.sort((a, b) => b[1] - a[1]);

  const [topLabel, topScore] = scores[0];
  const label: EmotionLabel = topScore <= 0 ? "혼란" : topLabel;

  const summaryMap: Record<EmotionLabel, string> = {
    안정: "오늘은 비교적 차분하게 나를 바라본 하루였어요.",
    피곤: "오늘은 에너지가 많이 소모된 하루로 보여요. 쉬어갈 여지를 만들어보면 좋아요.",
    불안: "마음이 조심스레 경계하고 있는 신호가 보여요. 무엇을 지키고 싶은지 떠올려보면 좋아요.",
    혼란: "생각과 감정이 한꺼번에 몰려온 하루로 보여요. 한 가지부터 천천히 정리해봐도 괜찮아요.",
  };

  return { label, summary: summaryMap[label] };
}

export function analyzeEmotionLocalized(content: string, locale: Locale): EmotionResult {
  const base = analyzeEmotion(content);

  const mapEn: Record<EmotionLabel, string> = {
    안정: "Today looks like a relatively calm day of gently seeing yourself.",
    피곤: "It seems your energy was heavily used today. Giving yourself room to rest could help.",
    불안: "I sense a careful signal of vigilance. What are you trying to protect right now?",
    혼란: "Thoughts and feelings may have arrived all at once. It’s okay to sort just one thing at a time.",
  };

  const mapJa: Record<EmotionLabel, string> = {
    안정: "今日は比較的落ち着いて自分を見つめられた一日だったようです。",
    피곤: "今日はエネルギーをたくさん使ったようです。休む余白を作ってみてもいいですね。",
    불안: "心が慎重に警戒しているサインが見えます。いま守りたいものは何でしょう？",
    혼란: "考えと感情が一度に押し寄せたようです。一つずつ整理しても大丈夫です。",
  };

  const summary =
    locale === "en" ? mapEn[base.label] : locale === "ja" ? mapJa[base.label] : base.summary;

  return { label: base.label, summary };
}

