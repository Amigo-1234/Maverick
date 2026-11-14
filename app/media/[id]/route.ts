import { one } from "@/lib/server/db";

/** Serves uploaded product images from the database. They never change, so browsers and CDNs can cache them forever. */
export async function GET(_req: Request, ctx: RouteContext<"/media/[id]">) {
  const { id } = await ctx.params;
  const key = id.replace(/\.(webp|png|jpe?g)$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(key)) return new Response("Not found", { status: 404 });
  const m = await one<{ mime: string; bytes: Uint8Array }>("select mime, bytes from media where id = $1", [key]);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m.bytes), { headers: { "Content-Type": m.mime, "Cache-Control": "public, max-age=31536000, immutable" } });
}
