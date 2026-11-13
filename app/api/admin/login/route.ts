import { ADMIN_COOKIE, adminToken, passwordOk } from "@/lib/server/admin";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const attempt = String(form?.get("password") ?? "");
  const to = new URL("/admin", request.url);
  if (!passwordOk(attempt)) {
    to.searchParams.set("error", "1");
    return Response.redirect(to, 303);
  }
  const res = Response.redirect(to, 303);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", `${ADMIN_COOKIE}=${adminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
  return new Response(null, { status: 303, headers });
}
