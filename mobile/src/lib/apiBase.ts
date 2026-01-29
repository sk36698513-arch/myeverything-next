export function getApiBase(): string {
  // web: same-origin (domain or localhost dev)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  const origin = w?.location?.origin;
  if (typeof origin === "string" && origin.startsWith("http")) return origin;

  // native: use production domain
  return "https://myeverything.kr";
}

