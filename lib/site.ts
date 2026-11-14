/**
 * Store settings types, defaults and formatting helpers (shared by client and server).
 * The live values are edited in /admin → Settings and stored in the database.
 */
export type StoreSettings = {
  name: string;
  slogan: string;
  email: string;
  currency: string;
  /** WhatsApp number in international format without "+", e.g. 2347025244302. */
  whatsapp: string;
  whatsappDisplay: string;
  supportContact: string;
  address: string;
  socials: { tiktok: string; snapchat: string; instagram: string };
  announcement: string;
  maintenance: boolean;
  freeDeliveryOver: number;
  returnsDays: number;
  deliveryInstructions: string;
  legal: { businessName: string; registration: string; address: string; updated: string };
  lowStockDefault: number;
};

/** Admin-only settings that never reach the browser. */
export type PrivateSettings = StoreSettings & { orderNotifyEmail: string };

export type DeliveryZone = { id: number; name: string; states: string[]; fee: number; eta: string; isPickup: boolean; instructions: string };

export const DEFAULT_SETTINGS: StoreSettings = {
  name: "MAVERICK",
  slogan: "DIFFERENT BY CHOICE.",
  email: "hello@maverick.example",
  currency: "NGN",
  whatsapp: "2347025244302",
  whatsappDisplay: "+234 702 524 4302",
  supportContact: "+234 702 524 4302",
  address: "Lagos, Nigeria",
  socials: { tiktok: "https://www.tiktok.com/@maverickwear1", snapchat: "https://www.snapchat.com/add/maverick267153", instagram: "" },
  announcement: "DROP 01 IS LIVE",
  maintenance: false,
  freeDeliveryOver: 100000,
  returnsDays: 7,
  deliveryInstructions: "",
  legal: { businessName: "MAVERICK", registration: "", address: "Lagos, Nigeria", updated: "13 November 2026" },
  lowStockDefault: 3,
};

/** wa.me link to the store's WhatsApp, optionally with a message typed in. */
export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** "@handle" from a social profile URL, for display. */
export const handleFrom = (url: string) => {
  const m = url.match(/(?:tiktok\.com\/(@[^/?#]+)|snapchat\.com\/add\/([^/?#]+)|instagram\.com\/([^/?#]+))/i);
  return m ? (m[1] ?? m[2] ?? (m[3] ? `@${m[3]}` : url)) : url;
};

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatPrice = (n: number) => money.format(n);

/** Normalises a Nigerian phone number to 234XXXXXXXXXX for matching and WhatsApp links. */
export const normalisePhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("234")) return d;
  if (d.startsWith("0")) return `234${d.slice(1)}`;
  return d.length === 10 ? `234${d}` : d;
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT – Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/** The delivery options for a state: zones naming the state first, then catch-all zones. Pickup is always listed if active. */
export function zonesForState(zones: DeliveryZone[], state: string) {
  const named = zones.filter((z) => !z.isPickup && z.states.includes(state));
  const fallback = zones.filter((z) => !z.isPickup && z.states.length === 0);
  const pickup = zones.filter((z) => z.isPickup);
  return [...(named.length ? named : fallback), ...pickup];
}

/** Delivery fee after the free-delivery threshold (pickup is always free). */
export const deliveryFee = (zone: DeliveryZone, merchandise: number, freeOver: number) =>
  zone.isPickup || (freeOver > 0 && merchandise >= freeOver) ? 0 : zone.fee;

/** PLACEHOLDER chart for an oversized, boxy tee. Replace with the manufacturer's measurements. */
export const sizeChart = {
  unit: "cm",
  columns: ["Size", "Chest (pit to pit)", "Length", "Sleeve"],
  rows: [
    ["S", "56", "69", "22"],
    ["M", "59", "71", "23"],
    ["L", "62", "73", "24"],
    ["XL", "65", "75", "25"],
    ["XXL", "68", "77", "26"],
  ],
};
