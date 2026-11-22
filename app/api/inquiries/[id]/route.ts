import { addCustomerMessage, getCustomerConversation } from "@/lib/server/inquiries";
import { inquiryFollowUpEmail, notifyShop } from "@/lib/server/email";
import { clientIp, rateLimit } from "@/lib/server/security";
import { sendPush } from "@/lib/server/push";

const credentials = async (request: Request, idText: string) => {
  const id = Number(idText);
  const token = request.headers.get("x-chat-token")?.slice(0, 100) ?? "";
  return { id: Number.isInteger(id) && id > 0 ? id : 0, token };
};

export async function GET(request: Request, ctx: RouteContext<"/api/inquiries/[id]">) {
  const { id: idText } = await ctx.params;
  const { id, token } = await credentials(request, idText);
  if (!id || !token) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const conversation = await getCustomerConversation(id, token);
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  return Response.json(conversation, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, ctx: RouteContext<"/api/inquiries/[id]">) {
  const { id: idText } = await ctx.params;
  const { id, token } = await credentials(request, idText);
  const body = (await request.json().catch(() => null)) as { message?: string; company?: string } | null;
  if (body?.company) return Response.json({ ok: true });
  const message = String(body?.message ?? "").trim().slice(0, 3000);
  if (!id || !token) return Response.json({ error: "Conversation not found." }, { status: 404 });
  if (message.length < 1) return Response.json({ error: "Type a message first." }, { status: 422 });
  const ip = await clientIp(request);
  if (!(await rateLimit("inquiry-chat-ip", ip, 20, 3600)) || !(await rateLimit("inquiry-chat-thread", String(id), 20, 3600))) {
    return Response.json({ error: "You've sent several messages already. Please wait for our reply." }, { status: 429 });
  }
  const inquiry = await addCustomerMessage(id, token, message);
  if (!inquiry) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const mail = inquiryFollowUpEmail({ id, name: inquiry.name, product: inquiry.product_name, message });
  await notifyShop(mail.subject, mail.html, inquiry.email).catch((e) => console.error("[chat email]", e));
  await sendPush("admin", null, { title: `Message from ${inquiry.name}`, body: message.slice(0, 140), url: `/admin/inquiries?id=${id}`, tag: `inquiry-${id}` }).catch((e) => console.error("[chat push]", e));
  return Response.json({ ok: true });
}
