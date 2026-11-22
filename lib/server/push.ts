import * as webpush from "web-push";
import { config, pushReady } from "./config";
import { sql } from "./db";

type SavedSubscription = { endpoint: string; p256dh: string; auth: string };
type PushPayload = { title: string; body: string; url: string; tag: string };

export async function savePushSubscription(subscription: PushSubscriptionJSON, audience: "admin" | "customer", inquiryId: number | null) {
  const endpoint = String(subscription.endpoint ?? "").slice(0, 2000);
  const p256dh = String(subscription.keys?.p256dh ?? "").slice(0, 500);
  const auth = String(subscription.keys?.auth ?? "").slice(0, 500);
  if (!endpoint.startsWith("https://") || !p256dh || !auth) throw new Error("Invalid push subscription.");
  await sql(`insert into push_subscriptions (endpoint, p256dh, auth, audience, inquiry_id)
    values ($1,$2,$3,$4,$5)
    on conflict (endpoint) do update set p256dh=$2, auth=$3, audience=$4, inquiry_id=$5, updated_at=now()`, [endpoint, p256dh, auth, audience, inquiryId]);
}

export async function removePushSubscription(endpoint: string) {
  await sql("delete from push_subscriptions where endpoint = $1", [endpoint]);
}

export async function sendPush(audience: "admin" | "customer", inquiryId: number | null, payload: PushPayload) {
  if (!pushReady()) return false;
  webpush.setVapidDetails(config.push.subject, config.push.publicKey!, config.push.privateKey!);
  const rows = await sql<SavedSubscription>("select endpoint, p256dh, auth from push_subscriptions where audience = $1 and inquiry_id is not distinct from $2", [audience, inquiryId]);
  await Promise.all(rows.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await removePushSubscription(s.endpoint);
      else console.error("[push]", e);
    }
  }));
  return rows.length > 0;
}
