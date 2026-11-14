import { ADMIN_COOKIE, logout } from "@/lib/server/admin";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=([^;]+)`))?.[1];
  await logout(token);
  const headers = new Headers({ Location: new URL("/admin/login", request.url).toString() });
  headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 303, headers });
}
