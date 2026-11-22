import { adminFromRequest } from "@/lib/server/admin";
import { getCustomerConversation } from "@/lib/server/inquiries";
import { savePushSubscription } from "@/lib/server/push";
import { config, pushReady } from "@/lib/server/config";

export async function GET() {
  return Response.json({ ready: pushReady(), publicKey: config.push.publicKey ?? "" });
}

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { audience?: string; inquiryId?: number; token?: string; subscription?: PushSubscriptionJSON } | null;
  if (!pushReady()) return Response.json({ error: "Push notifications have not been configured yet." }, { status: 503 });
  if (!b?.subscription || !["admin", "customer"].includes(String(b.audience))) return Response.json({ error: "Invalid subscription." }, { status: 422 });
  if (b.audience === "admin") {
    if (!(await adminFromRequest(request))) return Response.json({ error: "Sign in as an admin first." }, { status: 401 });
    await savePushSubscription(b.subscription, "admin", null);
  } else {
    const id = Number(b.inquiryId), token = String(b.token ?? "");
    if (!id || !token || !(await getCustomerConversation(id, token))) return Response.json({ error: "Conversation not found." }, { status: 404 });
    await savePushSubscription(b.subscription, "customer", id);
  }
  return Response.json({ ok: true });
}
