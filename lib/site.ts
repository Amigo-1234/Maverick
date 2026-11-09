/**
 * Store settings. Values marked PLACEHOLDER are sensible defaults for a Nigerian streetwear store
 * and must be confirmed with the client before launch.
 */
export const site = {
  name: "MAVERICK",
  slogan: "DIFFERENT BY CHOICE.",
  currency: "NGN",
  locale: "en-NG",
  freeShippingOver: 100000, // PLACEHOLDER (₦)
  shipping: [
    { id: "lagos", label: "Lagos delivery", eta: "1–2 working days", price: 3500 }, // PLACEHOLDER
    { id: "nationwide", label: "Nationwide delivery", eta: "3–5 working days", price: 6000 }, // PLACEHOLDER
  ],
  returnsDays: 7, // PLACEHOLDER
  email: "hello@maverick.example", // PLACEHOLDER — replace with the real inbox
  announcement: "DROP 01 IS LIVE",
  socials: {
    tiktok: { handle: "@maverickwear1", url: "https://www.tiktok.com/@maverickwear1" },
    snapchat: { handle: "maverick267153", url: "https://www.snapchat.com/add/maverick267153" },
    whatsapp: { display: "+234 702 524 4302", number: "2347025244302" },
  },
};

/** wa.me link that opens a chat with MAVERICK, optionally with a message typed in. */
export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.socials.whatsapp.number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

const money = new Intl.NumberFormat(site.locale, { style: "currency", currency: site.currency, maximumFractionDigits: 0 });
export const formatPrice = (n: number) => money.format(n);

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT – Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

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

export const nav = [
  { href: "/collections/new", label: "New In" },
  { href: "/collections/tees", label: "Tees" },
  { href: "/collections/ringers", label: "Ringers" },
  { href: "/collections/long-sleeves", label: "Long Sleeves" },
  { href: "/lookbook", label: "Lookbook" },
];
