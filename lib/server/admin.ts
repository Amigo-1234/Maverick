/**
 * Admin accounts, sessions and the activity log (server only).
 * Every admin page and every admin action must call requireAdmin(); hiding links is not security.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";
import { one, sql, type Q } from "./db";
import { rateLimit } from "./security";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const ADMIN_COOKIE = "mv_admin";
const SESSION_DAYS = 7;

export type Admin = { id: number; email: string; name: string; role: "owner" | "staff" };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const passwordProblem = (pw: string) => (pw.length < 10 ? "Use at least 10 characters." : null);

export type LoginResult = { ok: true; token: string } | { ok: false; error: string };

export async function login(emailRaw: string, password: string, ip: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!(await rateLimit("login-ip", ip, 20, 900)) || !(await rateLimit("login-email", email, 8, 900))) {
    return { ok: false, error: "Too many sign-in attempts. Wait 15 minutes and try again." };
  }
  let user = await one<{ id: number; password_hash: string; active: boolean }>("select id, password_hash, active from admin_users where email = $1", [email]);

  // First run: create the owner from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
  if (!user) {
    const { email: bootEmail, password: bootPw } = config.bootstrapAdmin;
    const count = (await one<{ n: number }>("select count(*)::int as n from admin_users"))?.n ?? 0;
    if (count === 0 && bootEmail && bootPw && email === bootEmail && password === bootPw && !passwordProblem(bootPw)) {
      user = await one("insert into admin_users (email, name, password_hash, role) values ($1, $2, $3, 'owner') returning id, password_hash, active",
        [email, "Owner", await hashPassword(password)]);
    }
  }
  if (!user || !user.active || !(await passwordMatches(password, user.password_hash))) {
    return { ok: false, error: "That email and password don't match an admin account." };
  }
  const token = randomBytes(32).toString("base64url");
  await sql("insert into admin_sessions (token_hash, admin_id, expires_at, ip) values ($1, $2, now() + make_interval(days => $3), $4)", [sha(token), user.id, SESSION_DAYS, ip]);
  await sql("update admin_users set last_login_at = now() where id = $1", [user.id]);
  await sql("delete from admin_sessions where expires_at < now()");
  const admin = await one<Admin>("select id, email, name, role from admin_users where id = $1", [user.id]);
  if (admin) await logActivity(admin, "signed_in", "admin", String(admin.id), { ip });
  return { ok: true, token };
}

export const sessionCookie = (token: string, secure: boolean) =>
  `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;

/** The signed-in admin, or null. */
export async function currentAdmin(): Promise<Admin | null> {
  await connection(); // admin pages are always rendered per request (live data, current time)
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  return one<Admin>(
    `select a.id, a.email, a.name, a.role from admin_sessions s join admin_users a on a.id = s.admin_id
     where s.token_hash = $1 and s.expires_at > now() and a.active`, [sha(token)]);
}

/** For pages and server actions: the signed-in admin, or a redirect to the sign-in page. */
export async function requireAdmin(role?: "owner"): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin?error=Only%20the%20owner%20can%20do%20that");
  return admin;
}

/** For route handlers: the admin or null (caller returns 401). */
export async function adminFromRequest(req: Request): Promise<Admin | null> {
  const token = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=([^;]+)`))?.[1];
  if (!token) return null;
  return one<Admin>(
    `select a.id, a.email, a.name, a.role from admin_sessions s join admin_users a on a.id = s.admin_id
     where s.token_hash = $1 and s.expires_at > now() and a.active`, [sha(token)]);
}

export async function logout(token: string | undefined) {
  if (token) await sql("delete from admin_sessions where token_hash = $1", [sha(token)]);
}

/** Writes to the activity log. Inside a transaction, pass its `q` so the entry commits with the change. */
export async function logActivity(admin: Admin | null, action: string, entity: string, entityId: string, details: Record<string, unknown> = {}, q?: Q) {
  await (q ? q.query.bind(q) : sql)("insert into admin_activity (admin_id, admin_email, action, entity, entity_id, details) values ($1, $2, $3, $4, $5, $6)",
    [admin?.id ?? null, admin?.email ?? "system", action, entity, entityId, JSON.stringify(details)]);
}

/** Owner-only team management. */
export async function createAdmin(by: Admin, email: string, name: string, password: string, role: "owner" | "staff") {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const row = await one<{ id: number }>("insert into admin_users (email, name, password_hash, role) values ($1, $2, $3, $4) on conflict (email) do nothing returning id",
    [email.trim().toLowerCase(), name.trim(), await hashPassword(password), role]);
  if (!row) throw new Error("An admin with that email already exists.");
  await logActivity(by, "created_admin", "admin", String(row.id), { email, role });
}

export async function changePassword(admin: Admin, current: string, next: string) {
  const row = await one<{ password_hash: string }>("select password_hash from admin_users where id = $1", [admin.id]);
  if (!row || !(await passwordMatches(current, row.password_hash))) throw new Error("Your current password isn't right.");
  const problem = passwordProblem(next);
  if (problem) throw new Error(problem);
  await sql("update admin_users set password_hash = $1 where id = $2", [await hashPassword(next), admin.id]);
  await sql("delete from admin_sessions where admin_id = $1", [admin.id]); // sign out other devices
  await logActivity(admin, "changed_password", "admin", String(admin.id));
}
