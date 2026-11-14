/** Rate limiting, client IPs and signed tracking links (server only). */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { config } from "./config";
import { one } from "./db";

export async function clientIp(req?: Request) {
  const h = req?.headers ?? (await headers());
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Short, non-reversible id for an IP or other personal value (so logs and limits don't store it raw). */
export const fingerprint = (...parts: string[]) => createHash("sha256").update(`${config.appSecret}:${parts.join("|")}`).digest("hex").slice(0, 32);

/**
 * Fixed-window rate limit stored in the database, so it holds across server instances.
 * Returns true when the action is allowed.
 */
export async function rateLimit(bucket: string, id: string, max: number, windowSeconds: number) {
  const key = `${bucket}:${fingerprint(id)}`;
  const row = await one<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count`, [key, windowSeconds]);
  return (row?.count ?? 1) <= max;
}

/** Token that lets an email link open one order's tracking page without typing details. */
export const trackingToken = (orderNumber: string) => createHmac("sha256", config.appSecret).update(`track:${orderNumber}`).digest("hex").slice(0, 32);

export function trackingTokenOk(orderNumber: string, token: string) {
  const a = Buffer.from(trackingToken(orderNumber)), b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const trackingUrl = (orderNumber: string) => `${config.siteUrl}/track-order?order=${encodeURIComponent(orderNumber)}&t=${trackingToken(orderNumber)}`;
