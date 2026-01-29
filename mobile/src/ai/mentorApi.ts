import type { Locale } from "../i18n/translations";
import { consumeMentorQuota, MentorQuotaError } from "../storage/mentorQuota";

// Primary: Next.js(sync)에서 직접 ChatGPT 생성
// - Nginx가 /sync/ 를 Next.js(3000)로 프록시하면 동작
const MENTOR_API_URL_PRIMARY = "https://myeverything.kr/sync/mentor/advise-gpt/";
// Fallback: 기존 Express MVP 엔드포인트(유지)
const MENTOR_API_URL_FALLBACK = "https://myeverything.kr/api/mentor/advise";

function hintLine(locale: Locale) {
  return locale === "en"
    ? "Please reply in English."
    : locale === "ja"
      ? "日本語で答えてください。"
      : "한국어로 답해줘.";
}

function withLanguageHint(locale: Locale, message: string) {
  return `${hintLine(locale)}\n\n${message}`;
}

type MentorHistoryItem = { role: "user" | "assistant"; text: string };

function normalizeText(s: string) {
  return s.replaceAll("\r\n", "\n").trim();
}

function buildQuestion(params: { locale: Locale; message: string; history?: MentorHistoryItem[] }) {
  const { locale, message, history } = params;
  const msg = message.trim();
  const tail = (history ?? [])
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
    .map((h) => ({ role: h.role, text: h.text.trim() }))
    .filter((h) => h.text.length > 0)
    .slice(-5); // 최근 5개만 전송

  const factStyleHint =
    locale === "en"
      ? [
          "FACT MODE ONLY.",
          "- No emotions, empathy, encouragement, value judgments, or personal opinions.",
          "- Do not output advice; only organize information logically.",
          "- Separate Facts vs Assumptions clearly. If unknown, say 'Insufficient info'.",
          "- Do NOT repeat the prompt or the conversation context.",
          "- Output MUST be bullet points in this exact order:",
          "  - Facts",
          "  - Assumptions",
          "  - Options (IF/THEN outcomes; conditional, not opinions)",
          "  - Clarifying questions (max 3)",
        ].join("\n")
      : locale === "ja"
        ? [
            "FACTモードのみ。",
            "・感情/共感/励まし/価値判断/個人の意見は禁止。",
            "・助言はせず、情報を論理的に整理する。",
            "・事実と推定を明確に分け、不明は「情報不足」と明記。",
            "・プロンプト/会話履歴をそのまま出力しない。",
            "・出力（箇条書きのみ、順番固定）:",
            "  ・事実",
            "  ・推定",
            "  ・選択肢（IF/THENの条件付き結果。意見は書かない）",
            "  ・確認質問（最大3）",
          ].join("\n")
        : [
            "FACT 모드만.",
            "- 감정/공감/격려/가치판단/개인 의견 금지.",
            "- 조언하지 말고, 정보를 논리적으로 정리.",
            "- 사실과 추정을 분리하고, 모르면 '정보 부족'으로 명시.",
            "- 프롬프트/대화 히스토리를 그대로 출력하지 마.",
            "- 출력(불릿만, 순서 고정):",
            "  - 사실",
            "  - 추정",
            "  - 선택지(IF/THEN 결과. 의견 금지)",
            "  - 확인 질문(최대 3)",
          ].join("\n");

  if (tail.length === 0) {
    return `${hintLine(locale)}\n${factStyleHint}\n\n${msg}`;
  }

  // 이전 대화가 감정적인 톤/규칙을 포함할 수 있어, 맥락은 최소한으로만 전달
  const ctx = tail
    .map((h) => {
      const t = normalizeText(h.text).replaceAll("\n", " ");
      const clipped = t.length > 240 ? `${t.slice(0, 240)}…` : t;
      return `${h.role === "user" ? "U" : "A"}: ${clipped}`;
    })
    .join("\n");

  return `${hintLine(locale)}\n${factStyleHint}\n\nContext (last 5, reference only):\n${ctx}\n\nUser message:\n${msg}`;
}

function cleanMentorReply(params: { raw: string; originalMessage: string; locale: Locale }) {
  const { raw, originalMessage, locale } = params;
  const msg = originalMessage.trim();
  if (!raw) return raw;

  let t = raw.replaceAll("\r\n", "\n").trim();

  // 서버 MVP prefix 제거(있을 때만)
  t = t.replace(/^멘토 응답\(MVP\):\s*/u, "").trim();

  // 우리가 덧붙인 언어 힌트 라인 제거
  const hl = hintLine(locale);
  if (t.startsWith(hl)) {
    t = t.slice(hl.length).trim();
  }

  // 서버/모델이 프롬프트를 그대로 에코하는 경우가 있어 제거
  // (예: Context/Recent conversation/Now/User message 섹션이 그대로 출력되는 케이스)
  const markers = ["[Recent conversation (last 5)]", "[Now]", "Context (last 5, reference only):", "User message:"];
  for (const m of markers) {
    if (t.includes(m)) {
      // 가장 마지막 "User message:" 또는 "[Now]" 이후만 남기기
      const idxUser = t.lastIndexOf("User message:");
      const idxNow = t.lastIndexOf("[Now]");
      const cutAt = Math.max(idxUser, idxNow);
      if (cutAt >= 0) {
        t = t.slice(cutAt).trim();
      }
      break;
    }
  }

  // 남아있는 marker 라인들 제거
  t = t
    .split("\n")
    .filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (s === "[Now]" || s.startsWith("[Recent conversation") || s.startsWith("Context (last 5") || s === "User message:") return false;
      return true;
    })
    .join("\n")
    .trim();

  // MVP에서 질문을 그대로 에코하는 경우 화면에서 중복 제거
  if (msg) {
    if (t === msg) t = "";
    if (t.endsWith(`\n\n${msg}`)) t = t.slice(0, -(`\n\n${msg}`.length)).trim();
    if (t.startsWith(`${msg}\n\n`)) t = t.slice((`${msg}\n\n`).length).trim();
    // 사용자가 보낸 메시지가 섞여 있으면 제거(여러 형태)
    t = t.replaceAll(msg, "").replaceAll(msg.replaceAll("\n", " "), "").trim();
  }

  // 조언이 비어버리면(서버가 에코만 하는 경우) 안내 문구로 대체
  if (!t) {
    return locale === "en"
      ? "The server is currently returning your message as-is (MVP). To get real advice, the backend needs ChatGPT generation."
      : locale === "ja"
        ? "現在サーバーが入力をそのまま返しています（MVP）。本当のアドバイスにはバックエンド側でChatGPT生成が必要です。"
        : "현재 서버가 입력을 그대로 반환하고 있어요(MVP). 실제 조언을 받으려면 백엔드에서 ChatGPT 생성으로 바꿔야 합니다.";
  }

  return t;
}

export async function fetchMentorAdvice(params: {
  message: string;
  locale: Locale;
  timeoutMs?: number;
  history?: MentorHistoryItem[];
}) {
  const { message, locale, timeoutMs = 20000, history } = params;

  // 토큰/요청 제한(앱에서 1차 방어)
  // - 입력 길이 제한
  // - 일일 요청 횟수/토큰 예산
  // - 짧은 연속 클릭(도배) 방지
  await consumeMentorQuota({ message });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    async function post(url: string) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        // NOTE: backend expects `question` (not `message`)
        // - 대화 히스토리는 최근 5개만 포함
        // - 서버가 지원하면 max_output_tokens 로 "짧게" 고정
        body: JSON.stringify({
          question: buildQuestion({ locale, message, history }),
          max_output_tokens: 220,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`mentor_api_http_${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
      }

      const data = (await res.json().catch(() => null)) as
        | null
        | { ok?: unknown; reply?: unknown; advice?: unknown; message?: unknown };

      if (data && typeof data.ok === "boolean" && data.ok === false) {
        const msg = typeof data.message === "string" ? data.message : "mentor_api_not_ok";
        throw new Error(msg);
      }

      const replyCandidate =
        typeof data?.reply === "string" ? data.reply : typeof data?.advice === "string" ? data.advice : "";
      const reply = cleanMentorReply({ raw: replyCandidate, originalMessage: message, locale });
      if (!reply) throw new Error("mentor_api_bad_response");

      return reply;
    }

    // 1) 새 엔드포인트 우선 시도
    try {
      return await post(MENTOR_API_URL_PRIMARY);
    } catch (e) {
      const msg = String(e);
      // 404(아직 미생성) / 기타 에러면 기존 엔드포인트로 폴백
      if (msg.includes("mentor_api_http_404") || msg.includes("mentor_api_http_5") || msg.includes("Error")) {
        return await post(MENTOR_API_URL_FALLBACK);
      }
      return await post(MENTOR_API_URL_FALLBACK);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function isMentorQuotaError(e: unknown): e is MentorQuotaError {
  return typeof e === "object" && !!e && "code" in (e as any);
}
