/**
 * Order types, statuses and validation shared by the storefront, admin and server.
 * Payment status and fulfilment status are deliberately separate:
 *   payment    — set only from verified Paystack transactions (and refunds)
 *   fulfilment — set by staff as the order is packed and delivered
 */
import { NIGERIAN_STATES } from "./site";

export type CartLine = { slug: string; size: string; colour?: string; qty: number };

export type PaymentStatus = "pending" | "paid" | "failed" | "abandoned" | "refunded" | "partially_refunded";
export type FulfilmentStatus = "unfulfilled" | "processing" | "preparing" | "shipped" | "delivered" | "cancelled" | "on_hold" | "refund_requested";

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Awaiting payment", paid: "Paid", failed: "Payment failed", abandoned: "Payment not completed",
  refunded: "Refunded", partially_refunded: "Partly refunded",
};
export const FULFILMENT_LABELS: Record<FulfilmentStatus, string> = {
  unfulfilled: "Not started", processing: "Processing", preparing: "Preparing for dispatch", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", on_hold: "On hold", refund_requested: "Refund requested",
};
/** Statuses staff can move an order to. Shipping-type statuses need a paid order (checked on the server). */
export const FULFILMENT_FLOW: FulfilmentStatus[] = ["processing", "preparing", "shipped", "delivered"];
export const FULFILMENT_SIDE: FulfilmentStatus[] = ["on_hold", "refund_requested", "cancelled"];
export const NEEDS_PAYMENT: FulfilmentStatus[] = ["processing", "preparing", "shipped", "delivered"];

export type OrderItemView = { slug: string; code: string; name: string; colour: string; size: string; qty: number; unitPrice: number; total: number; image: string | null };
export type OrderEventView = { kind: string; fromStatus: string | null; toStatus: string | null; note: string; createdAt: string; actor: string; visibleToCustomer: boolean };
export type Address = { address1: string; address2?: string; city: string; state: string; postcode?: string; country: string };

export type OrderView = {
  id: string; number: string; createdAt: string; paidAt: string | null;
  email: string; phone: string; firstName: string; lastName: string; address: Address;
  deliveryLabel: string; deliveryEta: string;
  subtotal: number; discountCode: string | null; discountAmount: number; deliveryFee: number; total: number;
  paymentStatus: PaymentStatus; fulfilmentStatus: FulfilmentStatus; refundedAmount: number;
  carrier: string; trackingRef: string; cancelReason: string; needsAttention: string; stockState: string;
  paystackChannel: string | null; customerId: number | null;
  items: OrderItemView[]; events: OrderEventView[];
};

export type TimelineStep = { key: string; label: string; state: "done" | "current" | "upcoming"; at: string | null };

/**
 * Customer timeline: Order placed → Payment confirmed → Processing → Preparing for dispatch → Shipped → Delivered.
 * Side states (cancelled, on hold, refund requested, refunded) are shown as a banner alongside it.
 */
export function timeline(o: Pick<OrderView, "createdAt" | "paidAt" | "paymentStatus" | "fulfilmentStatus" | "events">): TimelineStep[] {
  const paid = ["paid", "refunded", "partially_refunded"].includes(o.paymentStatus);
  const reached = (s: FulfilmentStatus) => o.events.filter((e) => e.kind === "fulfilment" && e.toStatus === s).at(-1)?.createdAt ?? null;
  const flowIndex = FULFILMENT_FLOW.indexOf(o.fulfilmentStatus);
  // Furthest step reached on the main path, even if the order is now on hold.
  const furthest = Math.max(flowIndex, ...FULFILMENT_FLOW.map((s, i) => (reached(s) ? i : -1)));
  const steps: Omit<TimelineStep, "state">[] = [
    { key: "placed", label: "Order placed", at: o.createdAt },
    { key: "paid", label: "Payment confirmed", at: paid ? o.paidAt : null },
    ...FULFILMENT_FLOW.map((s) => ({ key: s, label: FULFILMENT_LABELS[s], at: reached(s) })),
  ];
  const doneCount = paid ? 2 + Math.max(furthest + 1, 0) : 1;
  return steps.map((s, i) => ({ ...s, state: i < doneCount - 1 ? "done" : i === doneCount - 1 ? "current" : "upcoming" }));
}

export type Customer = {
  email: string; firstName: string; lastName: string; phone: string;
  address1: string; address2?: string; city: string; state: string; postcode?: string; country: string;
  marketing?: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const validEmail = (e: string) => EMAIL.test(e);

/** Validates and normalises the checkout form. */
export function readCustomer(input: Record<string, unknown>): { customer?: Customer; errors: string[] } {
  const str = (k: string, max = 120) => String(input[k] ?? "").trim().slice(0, max);
  const c: Customer = {
    email: str("email", 160).toLowerCase(),
    firstName: str("firstName", 60),
    lastName: str("lastName", 60),
    phone: str("phone", 30),
    address1: str("address1", 160),
    address2: str("address2", 160) || undefined,
    city: str("city", 80),
    state: str("state", 40),
    postcode: str("postcode", 20) || undefined,
    country: str("country", 60) || "Nigeria",
    marketing: input.marketing === true || input.marketing === "on",
  };
  const errors: string[] = [];
  if (!validEmail(c.email)) errors.push("Enter a valid email address.");
  if (!c.firstName || !c.lastName) errors.push("Enter your first and last name.");
  if (c.phone.replace(/\D/g, "").length < 10) errors.push("Enter a phone number the rider can call.");
  if (!c.address1 || !c.city) errors.push("Enter your delivery address and city.");
  if (!NIGERIAN_STATES.includes(c.state)) errors.push("Choose your state.");
  return errors.length ? { errors } : { customer: c, errors };
}

export const toKobo = (naira: number) => Math.round(naira * 100);
