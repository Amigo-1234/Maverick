import { login, sessionCookie } from "@/lib/server/admin";
import { clientIp } from "@/lib/server/security";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const password = String(form?.get("password") ?? "");
  const url = new URL(request.url);
  const result = await login(email, password, await clientIp(request));
  if (!result.ok) {
    const back = new URL("/admin/login", url);
    back.searchParams.set("error", result.error);
    if (email) back.searchParams.set("email", email);
    return new Response(null, { status: 303, headers: { Location: back.toString() } });
  }
  const headers = new Headers({ Location: new URL("/admin", url).toString() });
  headers.append("Set-Cookie", sessionCookie(result.token, url.protocol === "https:"));
  return new Response(null, { status: 303, headers });
}
