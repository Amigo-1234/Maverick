/** Paystack API client (server only). Docs: https://paystack.com/docs/api/ */
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

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

export function initializeTransaction(args: { email: string; amountKobo: number; reference: string; callbackUrl: string; cancelUrl: string; summary: { customer: string; phone: string; items: string; delivery: string } }) {
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
        order_number: args.reference,
        cancel_action: args.cancelUrl,
        // Shown on the transaction in the Paystack dashboard. The order itself lives in our database.
        custom_fields: [
          { display_name: "Customer", variable_name: "customer", value: args.summary.customer },
          { display_name: "Phone", variable_name: "phone", value: args.summary.phone },
          { display_name: "Items", variable_name: "items", value: args.summary.items },
          { display_name: "Delivery", variable_name: "delivery", value: args.summary.delivery },
        ],
      },
    }),
  });
}

/** Refunds a transaction (full when amountKobo is omitted). */
export const refundTransaction = (reference: string, amountKobo?: number, note?: string) =>
  call<{ status: string }>("/refund", { method: "POST", body: JSON.stringify({ transaction: reference, ...(amountKobo ? { amount: amountKobo } : {}), ...(note ? { merchant_note: note } : {}) }) });

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

export { PaystackError };
