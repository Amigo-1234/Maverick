import { isValidSignature } from "@/lib/server/paystack";
import { confirmPayment } from "@/lib/server/payments";
import { sql } from "@/lib/server/db";

/**
 * Paystack webhook. Set in Paystack → Settings → API Keys & Webhooks:  https://YOUR-DOMAIN/api/paystack/webhook
 * Each event is processed once: its id is recorded first, so a repeated delivery is acknowledged and skipped.
 * The payment itself is always re-verified with Paystack's API before anything changes.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) return new Response("Invalid signature", { status: 401 });
  let event: { event?: string; data?: { reference?: string; id?: number } };
  try { event = JSON.parse(raw); } catch { return new Response("Bad payload", { status: 400 }); }

  const reference = event.data?.reference;
  if (!reference || !["charge.success", "charge.failed"].includes(event.event ?? "")) return new Response("Ignored", { status: 200 });

  const key = `${event.event}:${reference}`;
  const fresh = await sql("insert into processed_webhooks (id) values ($1) on conflict do nothing returning id", [key]);
  if (!fresh.length) return new Response("Already processed", { status: 200 });
  try {
    await confirmPayment(reference);
  } catch (e) {
    console.error("[webhook] could not process", reference, e);
    await sql("delete from processed_webhooks where id = $1", [key]); // let Paystack's retry try again
    return new Response("Retry later", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
