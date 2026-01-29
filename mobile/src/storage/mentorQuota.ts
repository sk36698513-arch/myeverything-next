import { StorageKeys } from "./keys";
import { getJson, setJson } from "./storage";

type MentorQuotaState = {
  day: string; // YYYY-MM-DD
  reqCount: number;
  tokenCount: number;
  lastAtMs: number;
};

export const MentorQuotaLimits = {
  // 요구사항(최소 구현)
  dailyMaxRequests: 5,
  cooldownMs: 60000,

  // 안전 장치
  maxMessageChars: 1200,

  // 비용 추정용(서버에서 max_output_tokens를 낮춘다는 가정)
  expectedOutputTokens: 220,
  dailyMaxTokens: 9000,
} as const;

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function estimateTokens(text: string) {
  // 대략적인 추정치(영문 기준 1token ~= 4 chars). 한글은 더 클 수 있어 여유를 둠.
  return Math.ceil(text.length / 3.5);
}

export class MentorQuotaError extends Error {
  code: "mentor_message_too_long" | "mentor_quota_exceeded" | "mentor_rate_limited";
  details?: { limit?: number; used?: number };
  constructor(code: MentorQuotaError["code"], message: string, details?: MentorQuotaError["details"]) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function getMentorQuotaStatus() {
  const now = Date.now();
  const today = dayKey();
  const existing = (await getJson<MentorQuotaState>(StorageKeys.mentorQuota)) ?? {
    day: today,
    reqCount: 0,
    tokenCount: 0,
    lastAtMs: 0,
  };

  const state: MentorQuotaState =
    existing.day === today
      ? existing
      : {
          day: today,
          reqCount: 0,
          tokenCount: 0,
          lastAtMs: 0,
        };

  const nextAllowedInMs =
    state.lastAtMs && now - state.lastAtMs < MentorQuotaLimits.cooldownMs
      ? MentorQuotaLimits.cooldownMs - (now - state.lastAtMs)
      : 0;

  return {
    day: state.day,
    usedRequests: state.reqCount,
    maxRequests: MentorQuotaLimits.dailyMaxRequests,
    remainingRequests: Math.max(0, MentorQuotaLimits.dailyMaxRequests - state.reqCount),
    nextAllowedInMs,
    usedTokens: state.tokenCount,
    maxTokens: MentorQuotaLimits.dailyMaxTokens,
  };
}

export async function consumeMentorQuota(params: {
  message: string;
  // 응답 토큰은 서버 설정/모델에 따라 달라질 수 있어 보수적으로 잡음
  expectedOutputTokens?: number;
  maxMessageChars?: number;
  dailyMaxRequests?: number;
  dailyMaxTokens?: number;
  minIntervalMs?: number;
}) {
  const {
    message,
    // "짧게" 고정(서버 max_output_tokens를 낮추는 것을 가정한 보수 추정치)
    expectedOutputTokens = MentorQuotaLimits.expectedOutputTokens,
    maxMessageChars = MentorQuotaLimits.maxMessageChars,
    // 요구사항: 일일 질문 5회 제한 + 쿨다운 60초
    dailyMaxRequests = MentorQuotaLimits.dailyMaxRequests,
    dailyMaxTokens = MentorQuotaLimits.dailyMaxTokens,
    minIntervalMs = MentorQuotaLimits.cooldownMs,
  } = params;

  const msg = message.trim();
  if (msg.length > maxMessageChars) {
    throw new MentorQuotaError(
      "mentor_message_too_long",
      `mentor_message_too_long:${maxMessageChars}`,
      { limit: maxMessageChars, used: msg.length }
    );
  }

  const now = Date.now();
  const today = dayKey();
  const existing = (await getJson<MentorQuotaState>(StorageKeys.mentorQuota)) ?? {
    day: today,
    reqCount: 0,
    tokenCount: 0,
    lastAtMs: 0,
  };

  const state: MentorQuotaState =
    existing.day === today
      ? existing
      : {
          day: today,
          reqCount: 0,
          tokenCount: 0,
          lastAtMs: 0,
        };

  if (state.lastAtMs && now - state.lastAtMs < minIntervalMs) {
    throw new MentorQuotaError("mentor_rate_limited", "mentor_rate_limited", {
      limit: minIntervalMs,
      used: now - state.lastAtMs,
    });
  }

  const inTok = estimateTokens(msg);
  const cost = inTok + expectedOutputTokens;

  if (state.reqCount + 1 > dailyMaxRequests || state.tokenCount + cost > dailyMaxTokens) {
    throw new MentorQuotaError("mentor_quota_exceeded", "mentor_quota_exceeded", {
      limit: dailyMaxTokens,
      used: state.tokenCount,
    });
  }

  const next: MentorQuotaState = {
    day: today,
    reqCount: state.reqCount + 1,
    tokenCount: state.tokenCount + cost,
    lastAtMs: now,
  };

  await setJson(StorageKeys.mentorQuota, next);
}

