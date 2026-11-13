import { ADMIN_COOKIE } from "@/lib/server/admin";

export async function POST(request: Request) {
  const headers = new Headers({ Location: new URL("/admin", request.url).toString() });
  headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status: 303, headers });
}
