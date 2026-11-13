/** Paystack API client (server only). Docs: https://paystack.com/docs/api/ */
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import type { OrderRecord } from "../order";

export type PaystackTransaction = {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "reversed" | string;
  reference: string;
  amount: number;          // kobo
  currency: string;
  paid_at: string | null;
  created_at?: string;
  channel?: string;
  customer?: { email?: string };
  metadata?: unknown;
};

class PaystackError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = config.paystack.secretKey;
  if (!key) throw new PaystackError("Payments are not set up yet (PAYSTACK_SECRET_KEY is missing).");
  const res = await fetch(`${config.paystack.apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status) throw new PaystackError(body?.message || `Paystack request failed (${res.status}).`);
  return body.data as T;
}

export function initializeTransaction(args: { email: string; amountKobo: number; reference: string; callbackUrl: string; order: OrderRecord }) {
  const { order } = args;
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo,
      currency: "NGN",
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: {
        order,
        cancel_action: `${config.siteUrl}/checkout?cancelled=1`,
        // Shown on the transaction in the Paystack dashboard.
        custom_fields: [
          { display_name: "Customer", variable_name: "customer", value: `${order.customer.firstName} ${order.customer.lastName}` },
          { display_name: "Phone", variable_name: "phone", value: order.customer.phone },
          { display_name: "Items", variable_name: "items", value: order.items.map((i) => `${i.qty}× ${i.name} (${i.colour}, ${i.size})`).join("; ") },
          { display_name: "Delivery", variable_name: "delivery", value: `${order.shipping.label}: ${[order.customer.address1, order.customer.address2, order.customer.city, order.customer.state].filter(Boolean).join(", ")}` },
        ],
      },
    }),
  });
}

export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);

export const listTransactions = (opts: { perPage?: number; page?: number; status?: string } = {}) => {
  const q = new URLSearchParams({ perPage: String(opts.perPage ?? 50), page: String(opts.page ?? 1) });
  if (opts.status) q.set("status", opts.status);
  return call<PaystackTransaction[]>(`/transaction?${q}`);
};

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function isValidSignature(rawBody: string, signature: string | null) {
  const key = config.paystack.secretKey;
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reads our order back off a transaction and checks the amount matches what we priced. */
export function orderFrom(tx: PaystackTransaction): OrderRecord | null {
  let meta = tx.metadata as { order?: OrderRecord } | string | null | undefined;
  if (typeof meta === "string") { try { meta = JSON.parse(meta); } catch { meta = null; } }
  const order = (meta as { order?: OrderRecord } | null)?.order;
  if (!order || typeof order.total !== "number") return null;
  return order;
}

export const amountMatches = (tx: PaystackTransaction, order: OrderRecord) =>
  tx.currency === "NGN" && tx.amount === Math.round(order.total * 100);

export { PaystackError };
