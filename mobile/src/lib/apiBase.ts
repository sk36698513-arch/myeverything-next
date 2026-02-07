export function getApiBase(): string {
  // web: default to current origin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  const origin = w?.location?.origin;
  if (typeof origin === "string" && origin.startsWith("http")) {
    // Expo web dev server(8081/19006)에서 실행 중이면, API는 Next.js dev(3000)로 보냄
    // - Expo(8081)는 /sync 라우트를 제공하지 않음
    // - Next(3000)가 /sync/* 를 담당
    const isExpoWebDev =
      origin.includes("localhost:8081") ||
      origin.includes("127.0.0.1:8081") ||
      origin.includes("localhost:19006") ||
      origin.includes("127.0.0.1:19006");
    if (isExpoWebDev) return "http://localhost:3000";

    return origin;
  }

  // native: use production domain
  return "https://myeverything.kr";
}

