import type { Locale } from "../i18n/translations";
import { consumeMentorQuota, MentorQuotaError } from "../storage/mentorQuota";

// Primary: 새 ChatGPT 엔드포인트(추가 예정)
const MENTOR_API_URL_PRIMARY = "https://myeverything.kr/api/mentor/advise-gpt";
// Fallback: 기존 MVP 엔드포인트(유지)
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

function buildQuestion(params: { locale: Locale; message: string; history?: MentorHistoryItem[] }) {
  const { locale, message, history } = params;
  const msg = message.trim();
  const tail = (history ?? [])
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
    .map((h) => ({ role: h.role, text: h.text.trim() }))
    .filter((h) => h.text.length > 0)
    .slice(-5); // 최근 5개만 전송

  const shortStyleHint =
    locale === "en"
      ? "Keep the answer short. Use bullet points. Do not repeat my message."
      : locale === "ja"
        ? "短めに、箇条書きで。入力文を繰り返さないでください。"
        : "답변은 짧게, 불릿으로. 내 문장을 그대로 반복하지 마.";

  if (tail.length === 0) {
    return `${hintLine(locale)}\n${shortStyleHint}\n\n${msg}`;
  }

  const ctx = tail
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text.replaceAll("\n", " ").slice(0, 600)}`)
    .join("\n");

  return `${hintLine(locale)}\n${shortStyleHint}\n\n[Recent conversation (last 5)]\n${ctx}\n\n[Now]\n${msg}`;
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

  // MVP에서 질문을 그대로 에코하는 경우 화면에서 중복 제거
  if (msg) {
    if (t === msg) t = "";
    if (t.endsWith(`\n\n${msg}`)) t = t.slice(0, -(`\n\n${msg}`.length)).trim();
    if (t.startsWith(`${msg}\n\n`)) t = t.slice((`${msg}\n\n`).length).trim();
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
