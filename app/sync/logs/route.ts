import { NextResponse } from "next/server";
import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type DailyLog = {
  id: string;
  createdAtISO: string;
  content: string;
  emotion?: string;
  emotionSummary?: string;
};

type LogRow = {
  storedAtISO: string;
  deviceId: string;
  log: DailyLog;
  ua?: string;
};

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "data", ...parts);
}

function ok(json: unknown, status = 200) {
  return NextResponse.json(json, { status });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | { deviceId?: unknown; log?: unknown };
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
    const log = body?.log as DailyLog | undefined;

    if (!deviceId) return ok({ ok: false, message: "deviceId required" }, 400);
    if (!log || typeof log !== "object") return ok({ ok: false, message: "log required" }, 400);
    if (typeof log.id !== "string" || !log.id) return ok({ ok: false, message: "log.id required" }, 400);
    if (typeof log.createdAtISO !== "string" || !log.createdAtISO) return ok({ ok: false, message: "log.createdAtISO required" }, 400);
    if (typeof log.content !== "string" || !log.content.trim()) return ok({ ok: false, message: "log.content required" }, 400);

    const dir = dataPath("logs");
    await mkdir(dir, { recursive: true });

    const row = {
      storedAtISO: new Date().toISOString(),
      deviceId,
      log,
      ua: req.headers.get("user-agent") ?? "",
    };

    // JSONL append (file DB)
    await appendFile(dataPath("logs", "logs.jsonl"), `${JSON.stringify(row)}\n`, "utf8");
    return ok({ ok: true });
  } catch (e) {
    return ok({ ok: false, message: "server_error" }, 500);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = (url.searchParams.get("deviceId") ?? "").trim();
  const startISO = url.searchParams.get("startISO");
  const endISO = url.searchParams.get("endISO");
  const limit = clamp(Number(url.searchParams.get("limit") ?? "500"), 1, 5000);
  const n = clamp(Number(url.searchParams.get("n") ?? "20"), 1, 200);

  try {
    const raw = await readFile(dataPath("logs", "logs.jsonl"), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);

    // Query mode: deviceId 기준 + (선택) 기간 필터
    if (deviceId) {
      const a = startISO ? new Date(startISO).getTime() : null;
      const b = endISO ? new Date(endISO).getTime() : null;
      const hasRange = Number.isFinite(a ?? NaN) && Number.isFinite(b ?? NaN);
      const start = hasRange ? Math.min(a!, b!) : null;
      const end = hasRange ? Math.max(a!, b!) : null;

      const out: DailyLog[] = [];
      for (const line of lines) {
        try {
          const row = JSON.parse(line) as LogRow;
          if (!row || typeof row !== "object") continue;
          if (row.deviceId !== deviceId) continue;
          const log = row.log;
          if (!log?.createdAtISO) continue;
          if (hasRange) {
            const t = new Date(log.createdAtISO).getTime();
            if (!Number.isFinite(t)) continue;
            if (t < start! || t > end!) continue;
          }
          out.push(log);
        } catch {
          // ignore
        }
      }

      out.sort((x, y) => (x.createdAtISO < y.createdAtISO ? 1 : -1));
      return ok({ ok: true, logs: out.slice(0, limit) });
    }

    // Debug mode: 최근 N줄 보기
    const tail = lines.slice(-n).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    });
    return ok({ ok: true, count: lines.length, tail });
  } catch {
    if (deviceId) return ok({ ok: true, logs: [] });
    return ok({ ok: true, count: 0, tail: [] });
  }
}

