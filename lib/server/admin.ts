/** Admin sign-in: a single password (ADMIN_PASSWORD) exchanged for a signed, httpOnly cookie. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

export const ADMIN_COOKIE = "mv_admin";

export const adminToken = () =>
  config.adminPassword ? createHmac("sha256", config.adminPassword).update("maverick-admin-v1").digest("hex") : null;

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const passwordOk = (attempt: string) => Boolean(config.adminPassword) && same(attempt, config.adminPassword!);
export const tokenOk = (token: string | undefined) => { const t = adminToken(); return Boolean(t && token && same(token, t)); };
