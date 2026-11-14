import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/store";
import { clientIp, rateLimit } from "@/lib/server/security";

/**
 * Marks the cached catalog (stock levels) stale so the next visitor sees fresh numbers.
 * Harmless to call (it only schedules a refresh), but rate-limited anyway.
 */
export async function POST(request: Request) {
  if (!(await rateLimit("catalog-refresh", await clientIp(request), 20, 60))) return new Response(null, { status: 429 });
  revalidateTag(CATALOG_TAG, "max");
  return new Response(null, { status: 204 });
}
