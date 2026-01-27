export function makeId(prefix: string) {
  // 충분히 유니크한 단순 ID (오프라인 MVP)
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

