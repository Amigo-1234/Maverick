/** Sends shop events to the TikTok and Meta pixels, when they're switched on. Safe to call anywhere. */
type W = Window & { ttq?: { track: (e: string, d?: object) => void }; fbq?: (...a: unknown[]) => void };

const TIKTOK: Record<string, string> = { AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment", ViewContent: "ViewContent" };

export function track(event: "AddToCart" | "InitiateCheckout" | "Purchase" | "ViewContent", data: { value?: number; currency?: string; contents?: { id: string; qty: number; price: number }[]; order_id?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    w.ttq?.track(TIKTOK[event]!, {
      value: data.value, currency: data.currency ?? "NGN",
      contents: data.contents?.map((c) => ({ content_id: c.id, quantity: c.qty, price: c.price })), content_type: "product",
    });
  } catch {}
  try {
    w.fbq?.("track", event, {
      value: data.value, currency: data.currency ?? "NGN", content_type: "product",
      contents: data.contents?.map((c) => ({ id: c.id, quantity: c.qty, item_price: c.price })),
    }, data.order_id ? { eventID: data.order_id } : undefined);
  } catch {}
}
