/**
 * Order pricing shared by the checkout page (for display) and the server (for charging).
 * The server always re-prices from the catalog, so a customer can't change what they pay.
 */
import { getProduct, inStock } from "./catalog";
import { NIGERIAN_STATES, site } from "./site";

export type CartLine = { slug: string; size: string; qty: number };

export type PricedItem = {
  slug: string; code: string; name: string; colour: string; size: string;
  qty: number; unit: number; total: number;
};

export type Customer = {
  email: string; firstName: string; lastName: string; phone: string;
  address1: string; address2?: string; city: string; state: string; postcode?: string; country: string;
  marketing?: boolean;
};

/** What we store on the Paystack transaction as metadata, and read back on the admin page. */
export type OrderRecord = {
  orderId: string;
  customer: Customer;
  shipping: { id: string; label: string; eta: string; price: number };
  items: PricedItem[];
  subtotal: number;
  delivery: number;
  total: number;
  currency: "NGN";
};

export function deliveryFor(subtotal: number, shippingId: string) {
  const option = site.shipping.find((s) => s.id === shippingId);
  if (!option) return null;
  return { ...option, price: subtotal >= site.freeShippingOver ? 0 : option.price };
}

/** Prices a cart from the catalog. Returns errors for anything that can't be bought. */
export function priceCart(lines: CartLine[], shippingId: string) {
  const errors: string[] = [];
  const items: PricedItem[] = [];
  if (!Array.isArray(lines) || lines.length === 0) errors.push("Your bag is empty.");
  if (Array.isArray(lines) && lines.length > 30) errors.push("Too many items in one order.");
  for (const line of Array.isArray(lines) ? lines.slice(0, 30) : []) {
    const p = getProduct(String(line?.slug));
    const qty = Number(line?.qty);
    const size = String(line?.size);
    if (!p) { errors.push("A piece in your bag is no longer available."); continue; }
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) { errors.push(`Check the quantity for ${p.name}.`); continue; }
    if (!inStock(p, size)) { errors.push(`${p.name} (${p.colour}) in size ${size} is sold out.`); continue; }
    items.push({ slug: p.slug, code: p.code, name: p.name, colour: p.colour, size, qty, unit: p.price, total: p.price * qty });
  }
  const subtotal = items.reduce((n, i) => n + i.total, 0);
  const shipping = deliveryFor(subtotal, shippingId);
  if (!shipping) errors.push("Choose a delivery method.");
  const delivery = shipping?.price ?? 0;
  return { items, subtotal, delivery, total: subtotal + delivery, shipping, errors };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  if (!EMAIL.test(c.email)) errors.push("Enter a valid email address.");
  if (!c.firstName || !c.lastName) errors.push("Enter your first and last name.");
  if (c.phone.replace(/\D/g, "").length < 10) errors.push("Enter a phone number the rider can call.");
  if (!c.address1 || !c.city) errors.push("Enter your delivery address and city.");
  if (c.country === "Nigeria" && !NIGERIAN_STATES.includes(c.state)) errors.push("Choose your state.");
  return errors.length ? { errors } : { customer: c, errors };
}

export const toKobo = (naira: number) => Math.round(naira * 100);
