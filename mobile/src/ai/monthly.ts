import type { DailyLog, EmotionLabel } from "../types";
import type { Locale } from "../i18n/translations";
import { emotionLabel } from "../i18n/emotionLabels";

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthTitle(key: string, locale: Locale) {
  const [y, m] = key.split("-");
  if (locale === "en") {
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  }
  if (locale === "ja") return `${y}年${Number(m)}月`;
  return `${y}년 ${Number(m)}월`;
}

function topEmotion(logs: DailyLog[]): EmotionLabel | null {
  const counts: Partial<Record<EmotionLabel, number>> = {};
  for (const l of logs) counts[l.emotion] = (counts[l.emotion] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return (sorted[0]?.[0] as EmotionLabel | undefined) ?? null;
}

function highlightLine(logs: DailyLog[]) {
  const longest = [...logs].sort((a, b) => b.content.length - a.content.length)[0];
  if (!longest) return null;
  const line = longest.content.split("\n").map((s) => s.trim()).find(Boolean) ?? "";
  return line.slice(0, 80);
}

export function makeMonthlyReport(params: { logs: DailyLog[]; month: Date; locale: Locale }) {
  const key = monthKey(params.month);
  const logs = params.logs.filter((l) => monthKey(new Date(l.createdAtISO)) === key);

  const title =
    params.locale === "en"
      ? "This month, my story"
      : params.locale === "ja"
        ? "今月、私の物語"
        : "이번 달, 나의 이야기";
  const subtitle = formatMonthTitle(key, params.locale);

  if (logs.length === 0) {
    return {
      title,
      subtitle,
      body:
        params.locale === "en"
          ? "You don’t have any logs this month yet.\n\nIt’s okay to start with one small sentence. Want to write one line about today?"
          : params.locale === "ja"
            ? "今月の記録はまだありません。\n\n一文からでも大丈夫。今日の自分を一行で残してみませんか？"
            : "이번 달의 기록이 아직 없어요.\n\n작은 한 문장부터 시작해도 괜찮아요. 오늘의 나를 한 줄로 남겨볼까요?",
    };
  }

  const top = topEmotion(logs);
  const sample = highlightLine(logs);
  const total = logs.length;

  const topLabel = top ? emotionLabel(params.locale, top) : null;

  const para1 =
    params.locale === "en"
      ? `This month, I left ${total} logs for myself. Logging isn’t about judging “good/bad”; it’s a window to see my life as it is.`
      : params.locale === "ja"
        ? `今月、私は${total}回の記録を残しました。記録は「良い/悪い」を決めるものではなく、人生をそのまま見つめる窓になります。`
        : `이번 달 나는 ${total}번의 기록으로 나를 남겼어요. 기록은 “잘했다/못했다”를 가르는 것이 아니라, 내 삶을 있는 그대로 바라보는 창이 되어줍니다.`;

  const para2 = topLabel
    ? params.locale === "en"
      ? `Across your logs, the mood “${topLabel}” appeared often this month. When it shows up, what were you trying to protect, and what did you need?`
      : params.locale === "ja"
        ? `記録をまとめると、今月は「${topLabel}」の流れがよく見られました。その感情が出るとき、何を守りたくて、何が必要だったのでしょう？`
        : `기록을 종합해보면, 이번 달에는 ‘${topLabel}’의 흐름이 자주 보였어요. 그 감정이 생길 때마다 나는 무엇을 지키고 싶었는지, 무엇이 필요했는지 떠올려보면 좋아요.`
    : params.locale === "en"
      ? "This month’s feelings may not fit into a single label—more like multiple textures together."
      : params.locale === "ja"
        ? "今月の感情は一つにまとめるより、いくつかの質感が一緒にあったようです。"
        : "이번 달의 감정은 한 가지로 정리하기보다, 여러 결이 함께 있었던 것으로 보여요.";

  const para3 = sample
    ? params.locale === "en"
      ? `One line that stood out was “${sample}…”. If you could say one kind sentence to the “you” who wrote that, what would it be?`
      : params.locale === "ja"
        ? `特に印象的だった一文は「${sample}…」でした。そのときの自分に、今の自分が一言かけるなら何がいちばん優しいでしょう？`
        : `특히 기억에 남는 한 줄은 “${sample}…”였어요. 이 문장을 쓴 ‘그때의 나’에게 지금의 내가 한마디 건넨다면, 어떤 말이 가장 다정할까요?`
    : params.locale === "en"
      ? "What moment do you remember most clearly this month? Want to write it in one sentence?"
      : params.locale === "ja"
        ? "今月いちばんはっきり覚えている瞬間はいつですか？一文で書いてみませんか？"
        : "이번 달의 나는 어떤 순간을 가장 또렷하게 기억하나요? 그 장면을 한 문장으로 적어볼까요?";

  const para4 =
    params.locale === "en"
      ? "For next month, you can start with ‘less’ rather than ‘more’. Find one thing that brings you ease—and try it just once a week."
      : params.locale === "ja"
        ? "来月の小さな方向を一つ選ぶなら、「増やす」より「減らす」から始めてもいいです。心が楽になる一つを見つけ、週に一度だけでも試してみませんか？"
        : "다음 달을 위한 작은 방향을 하나만 고른다면, ‘늘리기’보다 ‘덜어내기’에서 시작해도 좋아요. 내게 편안함을 주는 한 가지를 찾아, 일주일에 한 번만이라도 해보는 건 어떨까요?";

  return { title, subtitle, body: [para1, para2, para3, para4].join("\n\n") };
}

