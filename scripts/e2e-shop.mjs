// End-to-end shopping test in the installed Google Chrome. Usage: node scripts/e2e-shop.mjs [baseUrl]
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3123";
const shots = process.env.SHOTS ?? ".";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("503")) errors.push(m.text()); }); // 503 = payments intentionally off in this run
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) process.exitCode = 1; };

await page.goto(`${base}/products/strike-tee-black-blue`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /Add to bag/ }).click();
ok(await page.getByText("Choose a size first.").isVisible(), "asks for a size before adding");
await page.getByRole("button", { name: "Size L", exact: true }).click();
await page.getByRole("button", { name: /Add to bag/ }).click();
const drawer = page.getByRole("dialog", { name: "Your bag" });
await drawer.waitFor({ state: "visible" });
ok(await drawer.getByText("Size L").isVisible(), "drawer opens with Strike Tee, size L");
ok(await drawer.getByText(/₦75,000 away from free delivery/).isVisible(), "free-delivery bar shows the naira amount left");
await page.screenshot({ path: `${shots}/e2e-drawer.png` });
await drawer.getByRole("button", { name: /Increase quantity/ }).click();
ok((await drawer.locator("[aria-live=polite]").first().textContent()) === "2", "quantity goes up to 2");
await drawer.getByRole("button", { name: /Close/ }).click();

// quick add from a collection
await page.goto(`${base}/collections/ringers`);
await page.waitForLoadState("networkidle");
const card = page.locator("article").first();
await card.hover();
await card.getByRole("button", { name: "Quick add" }).click();
await card.getByRole("button", { name: "Size M", exact: true }).click();
await drawer.waitFor({ state: "visible" });
ok(await drawer.getByText("Size M").isVisible(), "quick add puts the ringer in the bag in size M");

// bag persists across reloads
await page.reload();
ok((await page.locator("header [data-bag-count]").textContent()) === "3", "bag count persists after reload (3 items)");

// sort + filter
await page.goto(`${base}/collections/all?sort=price-asc`);
const firstPrice = await page.locator("article").first().locator("p.price").last().textContent();
ok(firstPrice === "₦25,000", `sort price low-high puts ₦25,000 first (got ${firstPrice})`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "White", exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll("article").length === 2, null, { timeout: 3000 }).catch(() => {});
ok((await page.locator("article").count()) === 2, "colour filter White shows 2 pieces");

// search
await page.goto(`${base}/search?q=ringer`);
await page.waitForLoadState("networkidle");
await page.waitForFunction(() => document.querySelectorAll("article").length === 2, null, { timeout: 4000 }).catch(() => {});
ok((await page.locator("article").count()) === 2, "search 'ringer' finds 2 pieces");

// checkout
await page.goto(`${base}/checkout`);
await page.fill("#email", "test@example.com");
await page.fill("#firstName", "Test");
await page.fill("#lastName", "Customer");
await page.fill("#address1", "1 Test Street");
await page.fill("#city", "London");
await page.fill("#phone", "08030000000");
await page.selectOption("#state", "Lagos");
await page.getByLabel(/Nationwide delivery/).check();
await page.screenshot({ path: `${shots}/e2e-checkout.png`, fullPage: true });
// Run without Paystack keys: paying must fail safely with a WhatsApp fallback (full payment flow: e2e-payments.mjs).
await page.getByRole("button", { name: /^Pay ₦/ }).click();
const alert = page.getByRole("alert").filter({ hasText: "WhatsApp" });
await alert.waitFor({ timeout: 10000 });
ok((await alert.textContent()).includes("WhatsApp"), "without payment keys, Pay explains and offers WhatsApp instead");
ok((await page.locator("header [data-bag-count]").textContent()) !== "0", "bag is kept when payment can't start");
await page.screenshot({ path: `${shots}/e2e-checkout-nokeys.png` });
await page.evaluate(() => localStorage.removeItem("maverick-bag"));

// WhatsApp
await page.goto(`${base}/products/peel-tee-white`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Size XL", exact: true }).click();
const wa = await page.getByRole("link", { name: /Order on WhatsApp/ }).getAttribute("href");
ok(wa.startsWith("https://wa.me/2347025244302") && decodeURIComponent(wa).includes("size XL"), "Order on WhatsApp links to +234 702 524 4302 with the product and size");
ok(await page.getByRole("link", { name: "Chat with MAVERICK on WhatsApp" }).isVisible(), "floating WhatsApp button is visible");
const tt = await page.locator("footer a[href*=tiktok]").getAttribute("href");
ok(tt === "https://www.tiktok.com/@maverickwear1", "footer links to TikTok @maverickwear1");
const sc = await page.locator("footer a[href*=snapchat]").getAttribute("href");
ok(sc === "https://www.snapchat.com/add/maverick267153", "footer links to Snapchat maverick267153");

// phone layout: no sideways scroll on key pages
await page.setViewportSize({ width: 390, height: 844 });
for (const path of ["/", "/collections/all", "/products/lone-star-ringer", "/checkout", "/lookbook"]) {
  await page.goto(base + path);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(w <= 390, `no sideways scroll at 390px on ${path} (width ${w})`);
}
await page.goto(base + "/");
await page.screenshot({ path: `${shots}/e2e-phone-home.png`, fullPage: false });
ok(errors.length === 0, `no console errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
await browser.close();
