import type { Locale } from "../i18n/translations";

const MENTOR_API_URL = "https://myeverything.kr/api/mentor/advise";

function withLanguageHint(locale: Locale, message: string) {
  const hint =
    locale === "en"
      ? "Please reply in English.\n\n"
      : locale === "ja"
        ? "日本語で答えてください。\n\n"
        : "한국어로 답해줘.\n\n";
  return `${hint}${message}`;
}

export async function fetchMentorAdvice(params: { message: string; locale: Locale; timeoutMs?: number }) {
  const { message, locale, timeoutMs = 20000 } = params;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(MENTOR_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      // NOTE: backend expects `question` (not `message`)
      body: JSON.stringify({ question: withLanguageHint(locale, message) }),
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
    const reply = replyCandidate.trim();
    if (!reply) throw new Error("mentor_api_bad_response");

    return reply;
  } finally {
    clearTimeout(timer);
  }
}

