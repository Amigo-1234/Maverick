/** Confirmed launch prices. Keep display and server-side checkout in sync even if an older production seed is present. */
const CONFIRMED_PRICES: Record<string, number> = {
  "strike-tee-black-blue": 27_000,
  "horned-m-ringer": 25_000,
  "strike-tee-white-yellow": 27_000,
};

export function confirmedPrice(slug: string, databasePrice: number) {
  return CONFIRMED_PRICES[slug] ?? databasePrice;
}
