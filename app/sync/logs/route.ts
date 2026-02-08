import { NextResponse } from "next/server";
import { mkdir, appendFile, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function requireSyncKey(req: Request, headers: Record<string, string>) {
  const expected = (process.env.SYNC_API_KEY ?? "").trim();
  // If not configured, keep endpoint open (dev/transition). Set SYNC_API_KEY in prod to enforce.
  if (!expected) return null;

  // Allow direct local calls (healthcheck / localhost debug).
  // Requests coming through nginx should have x-real-ip/x-forwarded-for set by proxy_set_header.
  const xff = (req.headers.get("x-forwarded-for") ?? "").trim();
  const xr = (req.headers.get("x-real-ip") ?? "").trim();
  const firstXff = xff ? xff.split(",")[0]!.trim() : "";
  const isLocal = firstXff === "127.0.0.1" || firstXff === "::1" || xr === "127.0.0.1" || xr === "::1";
  if (isLocal || (!xff && !xr)) return null;

  const got = (req.headers.get("x-sync-key") ?? "").trim();
  if (!got || got !== expected) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401, headers });
  }
  return null;
}

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

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = new Set([
    "http://localhost:8081",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
    "https://myeverything.kr",
  ]);
  const h: Record<string, string> = {
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,accept,x-device-id,x-sync-key",
    "access-control-allow-credentials": "true",
  };
  if (allow.has(origin)) h["access-control-allow-origin"] = origin;
  return h;
}

function ok(json: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(json, { status, headers });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);
  const auth = requireSyncKey(req, headers);
  if (auth) return auth;
  try {
    const body = (await req.json().catch(() => null)) as null | { deviceId?: unknown; log?: unknown };
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
    const log = body?.log as DailyLog | undefined;

    if (!deviceId) return ok({ ok: false, message: "deviceId required" }, 400, headers);
    if (!log || typeof log !== "object") return ok({ ok: false, message: "log required" }, 400, headers);
    if (typeof log.id !== "string" || !log.id) return ok({ ok: false, message: "log.id required" }, 400, headers);
    if (typeof log.createdAtISO !== "string" || !log.createdAtISO) return ok({ ok: false, message: "log.createdAtISO required" }, 400, headers);
    if (typeof log.content !== "string" || !log.content.trim()) return ok({ ok: false, message: "log.content required" }, 400, headers);

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
    return ok({ ok: true }, 200, headers);
  } catch (e) {
    return ok({ ok: false, message: "server_error" }, 500, headers);
  }
}

export async function GET(req: Request) {
  const headers = corsHeaders(req);
  const auth = requireSyncKey(req, headers);
  if (auth) return auth;
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
      return ok({ ok: true, logs: out.slice(0, limit) }, 200, headers);
    }

    // Debug mode: 최근 N줄 보기 (admin/auth only)
    const tail = lines.slice(-n).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    });
    return ok({ ok: true, count: lines.length, tail }, 200, headers);
  } catch {
    if (deviceId) return ok({ ok: true, logs: [] }, 200, headers);
    return ok({ ok: true, count: 0, tail: [] }, 200, headers);
  }
}

export async function DELETE(req: Request) {
  const headers = corsHeaders(req);
  const auth = requireSyncKey(req, headers);
  if (auth) return auth;

  try {
    const body = (await req.json().catch(() => null)) as null | { deviceId?: unknown };
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
    if (!deviceId) return ok({ ok: false, message: "deviceId required" }, 400, headers);

    const file = dataPath("logs", "logs.jsonl");
    let raw = "";
    try {
      raw = await readFile(file, "utf8");
    } catch {
      return ok({ ok: true, deleted: 0, remaining: 0 }, 200, headers);
    }

    const lines = raw.split("\n");
    let deleted = 0;
    const kept: string[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as LogRow;
        if (row?.deviceId === deviceId) {
          deleted += 1;
          continue;
        }
      } catch {
        // keep malformed lines
      }
      kept.push(line);
    }

    const dir = dataPath("logs");
    await mkdir(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, kept.length ? `${kept.join("\n")}\n` : "", "utf8");
    await rename(tmp, file);

    return ok({ ok: true, deleted, remaining: kept.length }, 200, headers);
  } catch {
    return ok({ ok: false, message: "server_error" }, 500, headers);
  }
}

