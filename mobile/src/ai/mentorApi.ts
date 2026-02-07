import type { Locale } from "../i18n/translations";
import { consumeMentorQuota, MentorQuotaError } from "../storage/mentorQuota";
import { getApiBase } from "../lib/apiBase";

// Primary: Next.js(sync)에서 직접 ChatGPT 생성
// - prod: https://myeverything.kr/sync/* (Nginx -> Next.js)
// - web dev(expo 8081/19006): getApiBase()가 Next dev(3000)로 매핑
function mentorPrimaryUrl() {
  const base = getApiBase();
  // trailing slash로 인한 308(Location) 리다이렉트 방지
  return `${base}/sync/mentor/advise-gpt`;
}
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

  if (tail.length === 0) {
    // 일반 ChatGPT 스타일(대화형 멘토)로 답변 받기
    return `${hintLine(locale)}\n\n${msg}`;
  }

  // 맥락은 최소한으로만 전달(최근 5개)
  const ctx = tail
    .map((h) => {
      const t = normalizeText(h.text).replaceAll("\n", " ");
      const clipped = t.length > 240 ? `${t.slice(0, 240)}…` : t;
      return `${h.role === "user" ? "U" : "A"}: ${clipped}`;
    })
    .join("\n");

  return `${hintLine(locale)}\n\nRecent conversation (last 5):\n${ctx}\n\nUser message:\n${msg}`;
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
          // 일반 대화형 답변이 가능하도록 출력 여유를 둠
          max_output_tokens: 450,
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
      return await post(mentorPrimaryUrl());
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
