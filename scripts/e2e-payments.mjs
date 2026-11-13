// End-to-end payment test against local Paystack/Resend stand-ins (no real keys, no real money).
// Usage: npm run build && node scripts/e2e-payments.mjs
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const SITE = "http://localhost:3123", MOCK = "http://localhost:4010", KEY = "sk_test_mock", ADMIN = "correct-horse-battery";
const shots = process.env.SHOTS ?? ".";
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) process.exitCode = 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const up = async (url) => { for (let i = 0; i < 60; i++) { try { await fetch(url); return; } catch { await wait(500); } } throw new Error(`${url} did not start`); };

const env = { ...process.env, PAYSTACK_SECRET_KEY: KEY, PAYSTACK_API_BASE: MOCK, RESEND_API_KEY: "re_mock", RESEND_API_BASE: MOCK, EMAIL_FROM: "MAVERICK <orders@maverick.test>", ORDER_NOTIFY_EMAIL: "owner@maverick.test", RESEND_AUDIENCE_ID: "aud_mock", ADMIN_PASSWORD: ADMIN };
const mock = spawn("node", ["scripts/mock-services.mjs"], { env: { ...env, MOCK_SITE: SITE, MOCK_KEY: KEY }, stdio: "ignore" });
const next = spawn("npx", ["next", "start", "-p", "3123"], { env, stdio: "ignore" });
let b;
const state = async () => (await fetch(`${MOCK}/_state`)).json();

try {
  await up(`${MOCK}/_state`); await up(SITE);
  b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));

  // ── 1. Successful payment ──
  await page.goto(`${SITE}/products/strike-tee-black-blue`); await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Size L", exact: true }).click();
  await page.getByRole("button", { name: /Add to bag/ }).click();
  await page.getByRole("button", { name: /Increase quantity/ }).click(); // 2 × ₦25,000
  await page.goto(`${SITE}/checkout`); await page.waitForLoadState("networkidle");
  await page.fill("#email", "ada@example.com"); await page.fill("#firstName", "Ada"); await page.fill("#lastName", "Obi");
  await page.fill("#address1", "12 Admiralty Way"); await page.fill("#city", "Lekki"); await page.selectOption("#state", "Lagos");
  await page.fill("#phone", "08030000000"); await page.check("#marketing");
  await page.getByLabel(/Nationwide delivery/).check();
  await page.getByRole("button", { name: /^Pay ₦56,000$/ }).click();   // 50,000 + 6,000 nationwide
  await page.waitForURL(`${MOCK}/pay/**`);
  ok(true, "checkout sends the customer to the payment page");
  ok((await page.textContent("#amount")).includes("56,000"), "Paystack is asked to charge exactly ₦56,000 (priced on the server)");
  await page.click("#pay");
  await page.waitForURL(`${SITE}/checkout/verify**`);
  await page.getByRole("heading", { name: "Order placed." }).waitFor({ timeout: 15000 });
  ok(true, "after paying, the site verifies with Paystack and shows Order placed");
  await page.screenshot({ path: `${shots}/pay-success.png`, fullPage: true });
  ok((await page.locator("header [data-bag-count]").textContent()) === "0", "bag is emptied after a successful payment");
  await wait(800);
  let s = await state();
  const tx = s.txs[0];
  ok(tx.webhookStatus === 200, `signed webhook accepted (status ${tx.webhookStatus})`);
  ok(tx.metadata.order.items[0].qty === 2 && tx.metadata.order.customer.phone === "08030000000", "order details are stored on the Paystack transaction");
  ok(s.sent.some((m) => m.to === "owner@maverick.test" && m.subject.startsWith("New order")), "owner gets a New order email");
  ok(s.sent.some((m) => m.to === "ada@example.com" && m.subject.includes("is confirmed")), "customer gets a receipt email");
  ok(s.contacts.some((c) => c.email === "ada@example.com"), "customer who ticked the box is added to the newsletter");

  // ── 2. Security checks ──
  const bad = await fetch(`${SITE}/api/paystack/webhook`, { method: "POST", headers: { "x-paystack-signature": "forged" }, body: JSON.stringify({ event: "charge.success", data: { reference: tx.reference } }) });
  ok(bad.status === 401, "webhook with a forged signature is rejected");
  const sentBefore = (await state()).sent.length;
  const tamper = await fetch(`${SITE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    customer: { email: "x@example.com", firstName: "X", lastName: "Y", phone: "08030000000", address1: "1 Road", city: "Ikeja", state: "Lagos", country: "Nigeria" },
    lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1, price: 1 }], shipping: "lagos", total: 1 }) });
  const tj = await tamper.json();
  s = await state();
  ok(tamper.ok && s.txs.find((t) => tj.url?.includes(encodeURIComponent(t.reference)))?.amount === 2850000, "a tampered price in the request is ignored (charged ₦28,500, not ₦1)");
  const junk = await fetch(`${SITE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: { email: "nope" }, lines: [{ slug: "fake", size: "M", qty: 1 }], shipping: "lagos" }) });
  ok(junk.status === 422, "invalid email or unknown product is refused");
  ok((await state()).sent.length === sentBefore, "no emails are sent for unpaid checkouts");

  // ── 3. Cancelled payment ──
  await page.goto(`${SITE}/products/peel-tee-white`); await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Size M", exact: true }).click();
  await page.getByRole("button", { name: /Add to bag/ }).click();
  await page.goto(`${SITE}/checkout`); await page.waitForLoadState("networkidle");
  ok((await page.inputValue("#email")) === "ada@example.com", "checkout remembers the customer's details for next time in this tab");
  await page.getByRole("button", { name: /^Pay / }).click();
  await page.waitForURL(`${MOCK}/pay/**`); await page.click("#cancel");
  await page.waitForURL(`${SITE}/checkout/verify**`);
  await page.getByRole("heading", { name: "Payment not completed" }).waitFor();
  ok(true, "a cancelled payment shows Payment not completed");
  ok((await page.locator("header [data-bag-count]").textContent()) === "1", "bag is kept after a cancelled payment");
  await page.goto(`${SITE}/checkout/verify?reference=DOES-NOT-EXIST`);
  await page.getByRole("heading", { name: "We couldn't confirm yet" }).waitFor();
  ok(true, "an unknown reference doesn't show a fake confirmation");

  // ── 4. Admin orders page ──
  await page.goto(`${SITE}/admin`);
  ok(await page.getByRole("button", { name: "Sign in" }).isVisible(), "admin asks for a password");
  await page.fill("#password", "wrong"); await page.getByRole("button", { name: "Sign in" }).click();
  ok(await page.getByText("That password isn't right.").first().waitFor({ timeout: 10000 }).then(() => true, () => false), "wrong admin password is refused");
  await page.fill("#password", ADMIN); await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Orders" }).waitFor();
  ok(await page.locator("#main").getByText(tx.reference).first().waitFor({ timeout: 10000 }).then(() => true, () => false), "admin lists the paid order by its reference");
  ok(await page.locator("#main").getByText("12 Admiralty Way, Lekki, Lagos").first().isVisible(), "admin shows the delivery address");
  ok((await page.locator("#main").getByText(tj.reference ?? "zzz").count()) === 0, "unpaid checkouts don't appear as orders");
  await page.screenshot({ path: `${shots}/admin.png`, fullPage: true });
  await page.getByRole("button", { name: "Sign out" }).click();
  ok(await page.getByRole("button", { name: "Sign in" }).waitFor({ timeout: 10000 }).then(() => true, () => false), "sign out works");
  const direct = await fetch(`${SITE}/admin`, { headers: { cookie: "mv_admin=guess" } });
  ok(!(await direct.text()).includes(tx.reference), "a forged admin cookie can't see orders");

  // ── 5. Forms ──
  await page.goto(`${SITE}/contact`); await page.waitForLoadState("networkidle");
  await page.fill("#c-name", "Tunde"); await page.fill("#c-email", "tunde@example.com"); await page.fill("#c-msg", "Do you have XXL in the ringer?");
  await page.click("text=Send message");
  await page.getByText("Message received.").waitFor();
  ok((await state()).sent.some((m) => m.reply_to === "tunde@example.com" && m.html.includes("XXL in the ringer")), "contact form emails the shop with reply-to set");
  await page.fill("#newsletter-email", "kemi@example.com"); await page.click('button[aria-label="Join the list"]');
  await page.getByText("You're on the list.").waitFor();
  ok((await state()).contacts.some((c) => c.email === "kemi@example.com"), "newsletter sign-up is saved");

  // ── 6. SEO files ──
  const robots = await (await fetch(`${SITE}/robots.txt`)).text();
  ok(robots.includes("Disallow: /admin") && robots.includes("sitemap.xml"), "robots.txt hides admin/checkout and points to the sitemap");
  const sm = await (await fetch(`${SITE}/sitemap.xml`)).text();
  ok(sm.includes("/products/lone-star-ringer") && sm.includes("/terms"), "sitemap lists products and pages");
  const og = await fetch(`${SITE}/opengraph-image`);
  ok(og.ok && og.headers.get("content-type") === "image/png", "share preview image is generated");
  const pdp = await (await fetch(`${SITE}/products/peel-tee-white`)).text();
  ok(pdp.includes('"@type":"Product"') && pdp.includes('"priceCurrency":"NGN"'), "product pages include Google product data");
  ok(errors.length === 0, `no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
} catch (e) {
  console.error(e); process.exitCode = 1;
} finally {
  await b?.close().catch(() => {});
  mock.kill(); next.kill();
  process.exit(process.exitCode ?? 0);
}
