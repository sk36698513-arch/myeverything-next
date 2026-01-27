import type { DailyLog } from "../types";
import type { Locale } from "../i18n/translations";
import { emotionLabel } from "../i18n/emotionLabels";

function inLastMonths(iso: string, months: number) {
  const d = new Date(iso);
  const now = new Date();
  if (!Number.isFinite(months) || months < 1) return false;
  // "달"은 사용자가 기대하는대로 "지금부터 N개월" 기준으로 계산
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  return d >= start && d <= now;
}

function inRange(iso: string, startISO: string, endISO: string) {
  const d = new Date(iso).getTime();
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return d >= start && d <= end;
}

function fmtYmd(iso: string, locale: Locale) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (locale === "en") return `${y}-${m}-${day}`;
  if (locale === "ja") return `${y}年${Number(m)}月${Number(day)}日`;
  return `${y}.${m}.${day}`;
}

export function makeAutobiography(params: {
  logs: DailyLog[];
  locale: Locale;
  months?: number;
  startISO?: string;
  endISO?: string;
}) {
  const logs =
    params.startISO && params.endISO
      ? params.logs.filter((l) => inRange(l.createdAtISO, params.startISO!, params.endISO!))
      : params.logs.filter((l) => inLastMonths(l.createdAtISO, params.months ?? 12));
  const total = logs.length;

  if (total === 0) {
    const body =
      params.locale === "en"
        ? "There are no logs in this period yet.\n\nStart with one small sentence—your story begins there."
        : params.locale === "ja"
          ? "この期間の記録はまだありません。\n\n一文からでも大丈夫。そこから物語が始まります。"
          : "이 기간의 기록이 아직 없어요.\n\n작은 한 문장부터 시작해도 괜찮아요. 그곳에서 이야기가 시작됩니다.";
    return { title: params.locale === "en" ? "Autobiography" : params.locale === "ja" ? "自叙伝" : "자서전", body };
  }

  const counts = new Map<string, number>();
  for (const l of logs) counts.set(l.emotion, (counts.get(l.emotion) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0] as any;
  const topLabel = top ? emotionLabel(params.locale, top) : null;

  const line = logs
    .slice()
    .sort((a, b) => b.content.length - a.content.length)[0]
    ?.content.split("\n")
    .map((s) => s.trim())
    .find(Boolean)
    ?.slice(0, 90);

  const title = params.locale === "en" ? "Autobiography" : params.locale === "ja" ? "自叙伝" : "자서전";

  const p1 = (() => {
    if (params.startISO && params.endISO) {
      const a = fmtYmd(params.startISO, params.locale);
      const b = fmtYmd(params.endISO, params.locale);
      return params.locale === "en"
        ? `From ${a} to ${b}, I left ${total} logs for myself. Each entry is a quiet proof that I kept going.`
        : params.locale === "ja"
          ? `${a}〜${b}の間に、私は${total}回の記録を残しました。ひとつひとつが、歩き続けた証です。`
          : `${a}부터 ${b}까지, 나는 ${total}번의 기록으로 나를 남겼어요. 하나하나가 ‘계속 살아낸’ 증거예요.`;
    }
    const months = params.months ?? 12;
    return params.locale === "en"
      ? `Over the last ${months} months, I left ${total} logs for myself. Each entry is a quiet proof that I kept going.`
      : params.locale === "ja"
        ? `この${months}か月で、私は${total}回の記録を残しました。ひとつひとつが、歩き続けた証です。`
        : `지난 ${months}개월 동안, 나는 ${total}번의 기록으로 나를 남겼어요. 하나하나가 ‘계속 살아낸’ 증거예요.`;
  })();

  const p2 =
    topLabel
      ? params.locale === "en"
        ? `The emotion that appeared most often was “${topLabel}”. It’s not a verdict—it’s a signal about what mattered to me.`
        : params.locale === "ja"
          ? `もっとも多く見られた感情は「${topLabel}」でした。これは評価ではなく、私にとって大切だったもののサインです。`
          : `가장 자주 등장한 정서는 ‘${topLabel}’였어요. 이것은 평가가 아니라, 내게 중요했던 것의 신호예요.`
      : params.locale === "en"
        ? "My emotions didn’t fit into one box—more like several threads woven together."
        : params.locale === "ja"
          ? "感情は一つにまとまらず、いくつかの糸が織り重なっていたようです。"
          : "감정은 한 가지로만 정리되지 않았고, 여러 결이 함께 얽혀 있었던 것 같아요.";

  const p3 =
    line
      ? params.locale === "en"
        ? `One line that stayed with me was: “${line}…”. If I could reply to that moment with kindness, what would I say?`
        : params.locale === "ja"
          ? `心に残った一文は「${line}…」でした。その瞬間の自分へ、優しく返事をするなら何と言うでしょう？`
          : `특히 마음에 남은 한 줄은 “${line}…”였어요. 그 순간의 나에게 다정하게 답해준다면, 어떤 말을 해주고 싶나요?`
      : params.locale === "en"
        ? "What moment do I want to remember from this period? I can name it in one sentence."
        : params.locale === "ja"
          ? "この期間で覚えておきたい瞬間は何でしょう？一文で名付けてみます。"
          : "이 기간 동안 기억해두고 싶은 순간은 무엇인가요? 한 문장으로 이름 붙여볼 수 있어요.";

  const p4 =
    params.locale === "en"
      ? "My story doesn’t need to be perfect. It only needs to be mine—quietly, privately, and honestly."
      : params.locale === "ja"
        ? "私の物語は完璧である必要はありません。ただ私のものであればいい。静かに、非公開で、正直に。"
        : "내 이야기는 완벽할 필요가 없어요. 그저 ‘내 것’이면 충분해요. 조용히, 비공개로, 솔직하게.";

  return { title, body: [p1, p2, p3, p4].join("\n\n") };
}

