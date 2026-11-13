import { amountMatches, isValidSignature, orderFrom, verifyTransaction } from "@/lib/server/paystack";
import { emailReady } from "@/lib/server/config";
import { addSubscriber, orderAlertEmail, receiptEmail, sendEmail } from "@/lib/server/email";
import { config } from "@/lib/server/config";

/**
 * Paystack webhook. Set this URL in Paystack → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/paystack/webhook
 * Confirms paid orders server-to-server (even if the customer closes the tab) and sends the emails.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return new Response("Bad payload", { status: 400 }); }

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      // Never trust the webhook body alone: re-check the payment with Paystack.
      const tx = await verifyTransaction(event.data.reference);
      const order = orderFrom(tx);
      if (tx.status !== "success" || !order || !amountMatches(tx, order)) {
        console.error("[webhook] payment did not check out", tx.reference, tx.status, tx.amount);
      } else if (emailReady()) {
        const alert = orderAlertEmail(order, tx.reference);
        const receipt = receiptEmail(order);
        await Promise.allSettled([
          sendEmail({ to: config.email.ordersTo!, subject: alert.subject, html: alert.html, replyTo: order.customer.email }),
          sendEmail({ to: order.customer.email, subject: receipt.subject, html: receipt.html, replyTo: config.email.ordersTo }),
          order.customer.marketing ? addSubscriber(order.customer.email, "checkout") : Promise.resolve(),
        ]).then((results) => results.forEach((r) => r.status === "rejected" && console.error("[webhook] email failed:", r.reason)));
      } else {
        console.warn("[webhook] paid order", order.orderId, "received but email isn't set up, so no alert was sent.");
      }
    } catch (e) {
      console.error("[webhook] could not process", event.data.reference, e);
      return new Response("Retry later", { status: 500 }); // Paystack retries non-2xx responses
    }
  }
  return new Response("OK", { status: 200 });
}
