import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "./db";

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function secret() {
  if (!process.env.ALO_SESSION_SECRET) throw new Error("Missing session secret");
  return process.env.ALO_SESSION_SECRET;
}
export async function body(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) throw new ApiError(403, "origin");
  if (Number(req.headers.get("content-length") || 0) > 12_000) throw new ApiError(413, "size");
  const text = await req.text();
  if (text.length > 12_000) throw new ApiError(413, "size");
  try { return JSON.parse(text); } catch { throw new ApiError(400, "invalid"); }
}
export function clientIp(req:Request){
  return req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
export async function rateLimit(req: Request, action: string, limit: number) {
  const ip = clientIp(req);
  const bucket = new Date(Math.floor(Date.now() / 600_000) * 600_000);
  const key = createHmac("sha256", secret()).update(action + ip + bucket.toISOString()).digest("hex");
  const [row] = await sql()`INSERT INTO alo.rate_limits(key,bucket,count) VALUES (${key},${bucket},1)
    ON CONFLICT(key) DO UPDATE SET count=alo.rate_limits.count+1 RETURNING count`;
  if (row.count > limit) throw new ApiError(429, "rate_limit");
}
export type Session = { id: string; event_id: string; entry_id: string | null };
export async function session(): Promise<Session | null> {
  const token = (await cookies()).get("alo_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [row] = await sql()<Session[]>`SELECT id,event_id,entry_id FROM alo.sessions WHERE token_hash=${hash(token)} AND expires_at>now()`;
  return row || null;
}
export async function requireSession() {
  const current = await session();
  if (!current) throw new ApiError(401, "session");
  return current;
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 90 * 86400 };
export async function api(fn: () => Promise<unknown>) {
  try { return NextResponse.json(await fn(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (!(error instanceof ApiError)) console.error("Portal request failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: error instanceof ApiError ? error.code : "unavailable" },
      { status: error instanceof ApiError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function opsToken() {
  const expires = String(Date.now() + 8 * 3600_000);
  return expires + "." + createHmac("sha256", secret()).update("ops:" + expires).digest("hex");
}
export async function requireOps() {
  const token = (await cookies()).get("alo_ops")?.value || "";
  const [expires, signature] = token.split(".");
  const expected = createHmac("sha256", secret()).update("ops:" + expires).digest("hex");
  if (!signature || Number(expires) < Date.now() || !safeEqual(signature, expected)) throw new ApiError(401, "auth");
}
