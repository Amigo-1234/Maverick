// Part C end-to-end suite: orders, payments, stock, tracking, inquiries and the admin dashboard.
// SIMULATED: Paystack and Resend are local stand-ins (scripts/mock-services.mjs); nothing touches the real services.
// Uses a fresh throwaway database each run.     Usage: npm run build && node scripts/e2e-payments.mjs
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const SITE = "http://localhost:3123", MOCK = "http://localhost:4010", KEY = "sk_test_mock";
const OWNER = { email: "owner@maverick.test", password: "correct-horse-battery" };
const shots = process.env.SHOTS ?? (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "mv-shots-"));
const results = [];
const seen = (p, text) => p.getByText(text).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
const ok = (c, m) => { results.push([Boolean(c), m]); console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const up = async (url) => { for (let i = 0; i < 120; i++) { try { await fetch(url); return; } catch { await wait(500); } } throw new Error(`${url} did not start`); };
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "mv-e2e-"));

const env = { ...process.env, PGLITE_DIR: dbDir, PAYSTACK_SECRET_KEY: KEY, PAYSTACK_API_BASE: MOCK, RESEND_API_KEY: "re_mock", RESEND_API_BASE: MOCK,
  EMAIL_FROM: "MAVERICK <orders@maverick.test>", ORDER_NOTIFY_EMAIL: "shop@maverick.test", RESEND_AUDIENCE_ID: "aud_mock",
  ADMIN_EMAIL: OWNER.email, ADMIN_PASSWORD: OWNER.password, APP_SECRET: "e2e-secret-0123456789abcdef" };
const mock = spawn("node", ["scripts/mock-services.mjs"], { env: { ...env, MOCK_SITE: SITE, MOCK_KEY: KEY }, stdio: "ignore" });
// Pages refreshed at runtime are kept on disk; a fresh test database needs a fresh copy.
fs.rmSync(".next/server/route-cache", { recursive: true, force: true });
const next = spawn("npx", ["next", "start", "-p", "3123"], { env, stdio: ["ignore", "pipe", "pipe"] });
let serverErr = ""; next.stderr.on("data", (d) => { serverErr += d; }); next.stdout.on("data", (d) => { serverErr += d; });
const state = async () => (await fetch(`${MOCK}/_state`)).json();
const api = (p, body) => fetch(`${SITE}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const signed = (body) => fetch(`${SITE}/api/paystack/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": createHmac("sha512", KEY).update(body).digest("hex") }, body });
const customer = (o = {}) => ({ email: "kemi@example.com", firstName: "Kemi", lastName: "Ade", phone: "08031112222", address1: "4 Bourdillon Rd", city: "Ikoyi", state: "Lagos", country: "Nigeria", ...o });

// Wait for a page to go quiet; if something stays open, report it (diagnostic) instead of hanging.
const pending = new Map();
const watch = (p) => { p.on("request", (r) => pending.set(r, `${r.method()} ${r.url().replace(SITE, "")}`)); const done = (r) => pending.delete(r); p.on("requestfinished", done); p.on("requestfailed", done); return p; };
const settle = async (p) => {
  try { await p.waitForLoadState("networkidle", { timeout: 10000 }); }
  catch { console.log("   (still loading after 10s:", [...pending.values()].slice(0, 5).join(", ") || "nothing listed", ")"); }
};
let b;
try {
  await up(`${MOCK}/_state`); await up(SITE);
  b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const page = watch(await ctx.newPage());
  page.on("dialog", (d) => d.accept());
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  // Messages shown by the page itself (Next.js's hidden route announcer also uses role="alert", so look inside <main>).
  // Submit an admin form and wait for the server's answer (URLs can repeat, so don't wait on the URL).
  const act = async (fn) => {
    await Promise.all([page.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(SITE), { timeout: 30000 }), fn()]);
    // Wait for the redirect to finish re-drawing the page (no button left in its "Saving…" state).
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].some((b) => b.disabled && /…$/.test(b.textContent ?? "")), null, { timeout: 20000 });
    await settle(page);
    await page.waitForTimeout(250);
  };
  const flash = async () => (await page.locator('main [role="status"], main [role="alert"]').filter({ hasNotText: "Loading…" }).first().textContent({ timeout: 8000 }).catch(() => "")) ?? "";

  // ── 8, 9. Admin authentication ──
  console.log("\n# Admin authentication");
  const anon = await fetch(`${SITE}/admin`, { redirect: "manual" });
  const anonBody = anon.status === 200 ? await anon.text() : "";
  ok(anon.status >= 300 && anon.status < 400 ? (anon.headers.get("location") ?? "").includes("/admin/login") : !anonBody.includes("Store overview"), "signed-out visitor can't open the dashboard");
  ok((await fetch(`${SITE}/api/admin/media`, { method: "POST", body: new FormData() })).status === 401, "admin upload API refuses requests without a session");
  const forged = await fetch(`${SITE}/admin/orders`, { headers: { cookie: "mv_admin=forged-session-token-1234567890" }, redirect: "manual" });
  ok(!(await forged.text()).includes("Payment status comes only from Paystack"), "a forged session cookie is refused");
  await page.goto(`${SITE}/admin/login`);
  await page.fill("#email", OWNER.email); await page.fill("#password", "wrong-password-123"); await page.getByRole("button", { name: "Sign in" }).click();
  ok(await page.getByText("don't match an admin account").waitFor({ timeout: 8000 }).then(() => true, () => false), "wrong password is refused");
  await page.fill("#password", OWNER.password); await page.getByRole("button", { name: "Sign in" }).click();
  ok(await page.getByRole("heading", { name: "Store overview" }).waitFor({ timeout: 15000 }).then(() => true, () => false), "owner signs in (account created from ADMIN_EMAIL/ADMIN_PASSWORD) and sees the dashboard");
  await page.screenshot({ path: `${shots}/c-overview.png`, fullPage: true });

  // ── 10. Product creation & editing ──
  console.log("\n# Products");
  await page.goto(`${SITE}/admin/products/new`);
  await page.fill("#name", "Test Hoodie"); await page.fill("#colourLabel", "Black"); await page.fill("#code", "MV-T1");
  await page.selectOption("#categoryId", { label: "Tees" }); await page.fill("#price", "40000"); await page.selectOption("#status", "published");
  await page.fill("#summary", "Heavyweight test hoodie."); await page.fill("#materials", "100% cotton, 400 GSM"); await page.fill("#care", "Wash cold, inside out");
  await act(() => page.getByRole("button", { name: "Create product" }).click());
  await page.waitForURL(/\/admin\/products\/\d+/);
  const productUrl = page.url().split("?")[0];
  ok((await flash()).includes("Product created"), "admin creates a product");
  await page.fill("#new-size", "M"); await page.fill("#new-stock", "2"); await act(() => page.getByRole("button", { name: "Add size" }).click());
  await page.fill("#new-size", "L"); await page.fill("#new-stock", "0"); await act(() => page.getByRole("button", { name: "Add size" }).click());
  await page.fill("#price", "38000"); await page.fill("#compareAt", "45000"); await act(() => page.getByRole("button", { name: "Save changes" }).click());
  ok((await flash()).includes("Saved"), "admin edits the price and sets a sale price");

  // ── 11. Image management ──
  await page.locator("#up-front").setInputFiles("public/garments/strike-black-front-tight.png");
  await page.locator("#up-front").locator("xpath=ancestor::form").getByRole("button", { name: "Upload" }).click();
  await page.getByText("Uploaded.").first().waitFor({ timeout: 20000 });
  await page.locator("#up-gallery").setInputFiles("public/originals/reference_04.jpeg");
  await page.locator("#up-gallery").locator("xpath=ancestor::form").getByRole("button", { name: "Upload" }).click();
  await page.waitForFunction(() => document.querySelectorAll('img[src*="/media/"]').length >= 2, null, { timeout: 20000 }).catch(() => {});
  ok(await page.locator('img[src*="media"]').count() >= 2, "front cut-out and gallery photo upload and show in the editor");
  const shop = await (await fetch(`${SITE}/products/test-hoodie`)).text();
  ok(shop.includes("Test Hoodie") && shop.includes("₦38,000") && shop.includes("₦45,000") && shop.includes("/media/"), "the new product, its sale price and uploaded images are live in the shop");
  ok(shop.includes("400 GSM") && shop.includes("Wash cold"), "materials and care instructions show on the product page");
  await act(() => page.locator('form:has(input[name="imageId"]) >> role=button[name="✕"]').first().click());
  ok((await flash()).includes("Photo removed"), "admin removes a gallery photo");

  // ── 12, 13. Variant inventory & sold-out sizes ──
  console.log("\n# Inventory");
  await page.goto(`${SITE}/products/test-hoodie`); await settle(page);
  ok(await page.getByRole("button", { name: "Size L, sold out" }).isDisabled(), "a size with 0 stock is shown as sold out and can't be picked");
  ok(await page.getByRole("button", { name: "Size M", exact: true }).isEnabled(), "a size in stock can be picked");
  const soldOutTry = await api("/api/checkout", { customer: customer(), lines: [{ slug: "test-hoodie", size: "L", colour: "Black", qty: 1 }], zoneId: 1 });
  ok(soldOutTry.status === 409, "the server refuses to sell a sold-out size even if the browser asks");
  const tooMany = await api("/api/checkout", { customer: customer(), lines: [{ slug: "test-hoodie", size: "M", colour: "Black", qty: 3 }], zoneId: 1 });
  ok(tooMany.status === 409 && (await tooMany.json()).error.includes("Only 2 left"), "the server refuses to sell more than is in stock");

  // ── 19. Delivery fee validation ──
  console.log("\n# Delivery and discounts");
  const lagosQuote = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Lagos", zoneId: 1 })).json();
  ok(lagosQuote.delivery?.fee === 3500 && lagosQuote.total === 28500, "Lagos delivery is priced by the server (₦25,000 + ₦3,500)");
  const wrongZone = await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Lagos", zoneId: 2 });
  ok(wrongZone.status === 422, "a delivery option that doesn't cover the state is refused");
  const kano = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Kano", zoneId: 2 })).json();
  ok(kano.delivery?.fee === 6000, "other states get the nationwide fee");
  const free = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 4 }], state: "Kano", zoneId: 2 })).json();
  ok(free.delivery?.fee === 0 && free.total === 100000, "delivery is free over the threshold");

  // ── 18. Discounts ──
  await page.goto(`${SITE}/admin/discounts`);
  await page.fill("#code", "TEN10"); await page.fill("#value", "10"); await page.fill("#minOrder", "20000"); await act(() => page.getByRole("button", { name: "Create code" }).click());
  await page.fill("#code", "BIGSPEND"); await page.fill("#value", "5"); await page.fill("#minOrder", "100000"); await act(() => page.getByRole("button", { name: "Create code" }).click());
  await page.fill("#minOrder", "0");
  await page.fill("#code", "OLDCODE"); await page.fill("#value", "50"); await page.fill("#expiresAt", "2020-01-01"); await act(() => page.getByRole("button", { name: "Create code" }).click());
  const disc = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Lagos", zoneId: 1, discountCode: "ten10" })).json();
  ok(disc.discount?.amount === 2500 && disc.total === 26000, "a valid code takes 10% off on the server (₦25,000 → ₦22,500 + delivery)");
  const expired = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Lagos", zoneId: 1, discountCode: "OLDCODE" })).json();
  ok(String(expired.error).includes("expired"), "an expired code is refused");
  const bogus = await (await api("/api/checkout/quote", { lines: [{ slug: "strike-tee-black-blue", size: "M", qty: 1 }], state: "Lagos", zoneId: 1, discountCode: "FREEMONEY" })).json();
  ok(String(bogus.error).includes("isn't valid"), "an unknown code is refused");
  const minFail = await (await api("/api/checkout/quote", { lines: [{ slug: "horned-m-ringer", size: "M", qty: 1 }], state: "Lagos", zoneId: 1, discountCode: "BIGSPEND" })).json();
  ok(String(minFail.error).includes("at least"), "a code's minimum order value is enforced on the server");

  // ── 14, 5, 15. Purchase → automatic stock deduction, emails, duplicate webhook ──
  console.log("\n# Purchase, stock deduction and webhooks");
  const shopper = watch(await ctx.newPage()); shopper.on("dialog", (d) => d.accept());
  await shopper.goto(`${SITE}/products/test-hoodie`); await settle(shopper);
  await shopper.getByRole("button", { name: "Size M", exact: true }).click();
  await shopper.getByRole("button", { name: /Add to bag/ }).click();
  await shopper.getByRole("button", { name: /Increase quantity/ }).click();
  await shopper.goto(`${SITE}/checkout`); await settle(shopper);
  await shopper.fill("#email", "ada@example.com"); await shopper.fill("#firstName", "Ada"); await shopper.fill("#lastName", "Obi");
  await shopper.fill("#address1", "12 Zoo Road"); await shopper.fill("#city", "Kano"); await shopper.selectOption("#state", "Kano");
  await shopper.fill("#phone", "0803 000 1234"); await shopper.check("#marketing");
  await shopper.getByText("₦82,000").first().waitFor({ timeout: 10000 }); // 2 × 38,000 + 6,000 nationwide
  await shopper.getByRole("button", { name: /^Pay ₦82,000$/ }).click();
  await shopper.waitForURL(`${MOCK}/pay/**`);
  ok((await shopper.textContent("#amount")).includes("82,000"), "Paystack is asked for exactly the server's total (₦82,000)");
  await shopper.click("#pay");
  await shopper.waitForURL(`${SITE}/checkout/verify**`);
  ok(await shopper.getByRole("heading", { name: "Order placed." }).waitFor({ timeout: 20000 }).then(() => true, () => false), "after paying, the order is confirmed");
  const ref = new URL(shopper.url()).searchParams.get("reference");
  const trackLink = await shopper.locator('main a[href*="track-order?order="]').first().getAttribute("href");
  await wait(1000);
  let st = await state();
  ok(st.txs.find((t) => t.reference === ref)?.webhookStatus === 200, "Paystack's signed webhook is accepted");
  const alerts = () => st.sent.filter((m) => m.to === "shop@maverick.test" && m.subject.startsWith("New order")).length;
  const receipts = () => st.sent.filter((m) => m.to === "ada@example.com" && m.subject.includes("is confirmed")).length;
  ok(alerts() === 1 && receipts() === 1, "exactly one order alert and one receipt are sent (page + webhook don't double up)");
  ok(st.sent.find((m) => m.subject.includes("is confirmed"))?.html.includes("track-order?order="), "the receipt includes a tracking link");
  const after = await api("/api/checkout", { customer: customer(), lines: [{ slug: "test-hoodie", size: "M", colour: "Black", qty: 1 }], zoneId: 1 });
  ok(after.status === 409, "stock was deducted automatically: size M (2 in stock, 2 sold) is now sold out");
  const body = JSON.stringify({ event: "charge.success", data: { reference: ref } });
  const d1 = await signed(body), d2 = await signed(body);
  await wait(500); st = await state();
  ok(d1.status === 200 && d2.status === 200 && alerts() === 1 && receipts() === 1, "a repeated webhook is acknowledged but changes nothing (no duplicate emails)");
  ok((await fetch(`${SITE}/api/paystack/webhook`, { method: "POST", headers: { "x-paystack-signature": "forged" }, body })).status === 401, "a webhook with a forged signature is rejected");
  ok(st.contacts.some((c) => c.email === "ada@example.com"), "a customer who opted in is added to the newsletter");

  // Overselling: two shoppers race for the last unit.
  await page.goto(`${SITE}/admin/inventory?q=MV-01`);
  const firstRow = page.locator("tbody tr").first();
  await firstRow.locator('input[name="amount"]').first().fill("1"); await firstRow.getByRole("button", { name: "Save" }).first().click(); await page.waitForURL(/ok=/);
  const race = await Promise.all([1, 2].map((n) => api("/api/checkout", { customer: customer({ email: `race${n}@example.com` }), lines: [{ slug: "strike-tee-black-blue", size: "S", qty: 1 }], zoneId: 1 })));
  ok(race.filter((r) => r.status === 200).length === 1 && race.filter((r) => r.status === 409).length === 1, "two simultaneous checkouts for the last unit: one gets it, the other is told it sold out");

  // ── 16. Failed and cancelled payments ──
  console.log("\n# Failed and cancelled payments");
  const pend = await (await api("/api/checkout", { customer: customer({ email: "cancel@example.com" }), lines: [{ slug: "horned-m-ringer", size: "XL", qty: 1 }], zoneId: 1 })).json();
  await shopper.goto(pend.url); await shopper.click("#cancel"); await shopper.waitForURL(`${SITE}/checkout/verify**`);
  ok(await shopper.getByRole("heading", { name: "Payment not completed" }).first().waitFor({ timeout: 15000 }).then(() => true, async () => (console.log("   heading:", await shopper.locator("h1").allInnerTexts()), false)), "a cancelled payment shows 'Payment not completed'");
  const relQ = await api("/api/checkout/quote", { lines: [{ slug: "horned-m-ringer", size: "XL", qty: 10 }], state: "Lagos", zoneId: 1 });
  ok(relQ.ok, "stock held for the cancelled checkout is returned (all 10 XL available again)");
  const fail = await (await api("/api/checkout", { customer: customer({ email: "decline@example.com" }), lines: [{ slug: "lone-star-ringer", size: "L", qty: 2 }], zoneId: 1 })).json();
  await shopper.goto(fail.url); await shopper.click("#fail"); await shopper.waitForURL(`${SITE}/checkout/verify**`);
  ok(await shopper.getByText("Your bank didn't approve").first().waitFor({ timeout: 15000 }).then(() => true, async () => (console.log("   heading:", await shopper.locator("h1").allInnerTexts()), false)), "a declined payment explains what happened");
  ok((await api("/api/checkout/quote", { lines: [{ slug: "lone-star-ringer", size: "L", qty: 10 }], state: "Lagos", zoneId: 1 })).ok, "stock held for the declined payment is returned");

  // ── 3, 4, 5. Order status updates, history and notifications ──
  console.log("\n# Fulfilment");
  await page.goto(`${SITE}/admin/orders?q=${ref}`);
  await page.getByRole("link", { name: ref }).click(); await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/);
  const orderPage = page.url().split("?")[0];
  await page.selectOption("#status", "processing"); await page.fill("#note", "Packing today"); await act(() => page.getByRole("button", { name: "Update status" }).click());
  ok((await flash()).includes("customer was emailed"), "moving to Processing emails the customer");
  await page.fill("#note-text", "Internal: VIP customer, add stickers"); await act(() => page.getByRole("button", { name: "Add note" }).click());
  await page.fill("#carrier", "GIG Logistics"); await page.fill("#trackingRef", "GIG-778812"); await act(() => page.getByRole("button", { name: "Save shipping details" }).click());
  await page.selectOption("#status", "shipped"); await act(() => page.getByRole("button", { name: "Update status" }).click());
  await page.selectOption("#status", "shipped"); await act(() => page.getByRole("button", { name: "Update status" }).click());
  ok((await flash()).includes("unchanged"), "saving the same status again is a no-op");
  await wait(300); st = await state();
  const statusMails = st.sent.filter((m) => m.to === "ada@example.com" && /working on|on its way/.test(m.subject));
  ok(statusMails.length === 2, `customer got exactly 2 status emails (processing, shipped), not a duplicate (got ${statusMails.length})`);
  ok(st.sent.some((m) => m.subject.includes("on its way") && m.html.includes("GIG-778812")), "the shipped email includes the tracking reference");
  ok(await page.getByText("Packing today").first().isVisible() && await page.getByText("GIG Logistics · GIG-778812").first().isVisible(), "order history records the note and tracking");
  await page.screenshot({ path: `${shots}/c-order.png`, fullPage: true });
  // Payment can't be faked from the dashboard.
  const unpaid = await (await api("/api/checkout", { customer: customer({ email: "unpaid@example.com" }), lines: [{ slug: "peel-tee-white", size: "M", qty: 1 }], zoneId: 1 })).json();
  await page.goto(`${SITE}/admin/orders?q=${unpaid.reference}`); await page.getByRole("link", { name: unpaid.reference }).click(); await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/);
  await settle(page); await page.locator("#status").waitFor();
  await page.evaluate(() => document.querySelectorAll("#status option").forEach((o) => { o.disabled = false; }));
  await page.selectOption("#status", "shipped"); await act(() => page.getByRole("button", { name: "Update status" }).click());
  ok((await flash()).includes("isn't paid"), "an unpaid order can't be marked shipped, even by forcing the form");
  ok(await page.getByText("Awaiting payment").first().isVisible(), "payment status stays 'Awaiting payment'; only Paystack can change it");

  // ── 17. Refunds ──
  console.log("\n# Refunds");
  await page.goto(orderPage);
  await page.fill("#amount", "10000"); await page.fill("#reason", "Size exchange difference"); await act(() => page.getByRole("button", { name: "Refund", exact: true }).click());
  ok((await flash()).includes("sent through Paystack"), "a partial refund is sent through Paystack");
  ok(await page.getByText("Partly refunded").first().isVisible(), "payment status becomes 'Partly refunded'");
  st = await state();
  ok(st.refunds.some((r) => r.transaction === ref && r.amount === 1000000), "Paystack received the refund for ₦10,000 (1,000,000 kobo)");
  ok(st.sent.some((m) => m.to === "ada@example.com" && m.subject.startsWith("Refund for order")), "the customer is emailed about the refund");
  await page.goto(`${SITE}/admin?range=7`);
  const revenue = await page.locator("section[aria-label='Sales'] .price").first().textContent();
  ok(revenue === "₦72,000", `revenue counts paid orders minus refunds (₦82,000 − ₦10,000 = ${revenue})`);

  // ── 1, 2. Customer order lookup ──
  console.log("\n# Customer tracking");
  const cust = watch(await ctx.newPage());
  await cust.goto(`${SITE}/track-order`); await settle(cust);
  await cust.fill("#track-order", ref); await cust.fill("#track-contact", "ada@example.com"); await cust.getByRole("button", { name: "Track order" }).click();
  ok(await cust.getByTestId("track-number").waitFor().then(() => true, () => false), "order number + email opens the order");
  ok(await cust.locator('li[data-state="current"]', { hasText: "Shipped" }).isVisible(), "the timeline shows Shipped as the current step");
  ok((await cust.getByTestId("track-ref").textContent()).includes("GIG-778812"), "the tracking reference is shown");
  const custHtml = await cust.content();
  ok(!custHtml.includes("VIP customer"), "internal staff notes are hidden from the customer");
  ok(custHtml.includes("Packing today"), "the status note meant for the customer is shown");
  await cust.screenshot({ path: `${shots}/c-track.png`, fullPage: true });
  const byPhone = await api("/api/track", { order: ref, contact: "+234 803 000 1234" });
  ok(byPhone.ok, "the phone number works too, in any format");
  const wrong = await api("/api/track", { order: ref, contact: "someone@else.com" });
  const fake = await api("/api/track", { order: "MV-ABCDEF-12345678", contact: "ada@example.com" });
  const [wj, fj] = [await wrong.json(), await fake.json()];
  ok(wrong.status === 404 && fake.status === 404 && wj.error === fj.error && !JSON.stringify(wj).includes("Ada"), "a wrong email or made-up number gives the same message and no details");
  const viaToken = await api("/api/track", { order: ref, token: new URL(trackLink, SITE).searchParams.get("t") });
  const badToken = await api("/api/track", { order: ref, token: "0".repeat(32) });
  ok(viaToken.ok && badToken.status === 404, "the signed email link works; a guessed token doesn't");

  // ── 6, 7. Product inquiries ──
  console.log("\n# Inquiries");
  await cust.goto(`${SITE}/products/strike-tee-white-yellow`); await settle(cust);
  await cust.getByRole("button", { name: "Size XL", exact: true }).click();
  await cust.getByRole("button", { name: "Ask about this product" }).click();
  await cust.fill("#ask-wa-q", "Is XL very long?");
  const wa = decodeURIComponent(await cust.getByTestId("ask-whatsapp").getAttribute("href"));
  if (!wa.includes("Is XL very long?") || !wa.startsWith("https://wa.me/2347025244302")) console.log("   wa:", wa);
  ok(wa.startsWith("https://wa.me/2347025244302") && wa.includes("Strike Tee") && wa.includes("/products/strike-tee-white-yellow") && wa.includes("Size: XL") && wa.includes("Colour: White / Yellow") && wa.includes("Is XL very long?"), "WhatsApp link has the store number, product, link, size, colour and question");
  await cust.getByRole("tab", { name: "Send an inquiry" }).click();
  await cust.fill("#ask-name", "Tunde Bello"); await cust.fill("#ask-email", "tunde@example.com"); await cust.fill("#ask-msg", "Will you restock this in XXL?");
  await cust.getByRole("button", { name: "Send question" }).click();
  ok(await cust.getByText("Question sent.").waitFor({ timeout: 10000 }).then(() => true, () => false), "the inquiry is sent and confirmed");
  const dup = await api("/api/inquiries", { name: "Tunde Bello", email: "tunde@example.com", product: "strike-tee-white-yellow", message: "Will you restock this in XXL?" });
  ok(dup.status === 409, "sending the same question again is blocked");
  const bot = await api("/api/inquiries", { name: "Bot", email: "bot@example.com", message: "spam", company: "Acme" });
  ok(bot.ok && (await bot.json()).id === undefined, "a bot that fills the hidden field is silently ignored");
  st = await state();
  ok(st.sent.some((m) => m.to === "shop@maverick.test" && m.subject.startsWith("Product question") && m.html.includes("restock")), "the shop is emailed about the inquiry");
  await page.goto(`${SITE}/admin/inquiries`);
  ok(await seen(page, "Will you restock this in XXL?"), "the inquiry appears in the admin inbox");
  await page.selectOption("#inq-status", "answered"); await page.fill("#inq-notes", "Replied by email, restock in Dec"); await act(() => page.getByRole("button", { name: "Save" }).last().click());
  ok(await page.getByText("Answered").first().isVisible(), "admin marks it answered with an internal note");
  await page.goto(`${SITE}/admin/inquiries?q=Tunde`);
  ok(await seen(page, "Tunde Bello"), "the inbox can be searched");

  // ── Settings flow through to the shop ──
  console.log("\n# Settings");
  await page.goto(`${SITE}/admin/settings`);
  await page.fill("#whatsapp", "2348099990000"); await page.fill("#whatsappDisplay", "+234 809 999 0000"); await act(() => page.getByRole("button", { name: "Save settings" }).click());
  await cust.goto(`${SITE}/`); await settle(cust);
  ok((await cust.locator('a[aria-label^="Chat with"]').getAttribute("href")).startsWith("https://wa.me/2348099990000"), "changing the WhatsApp number in Settings updates the shop");
  const customersPage = await (await page.goto(`${SITE}/admin/customers`), page.content());
  ok(customersPage.includes("ada@example.com") && customersPage.includes("₦72,000"), "customers list shows spend net of refunds");
  await page.goto(`${SITE}/admin/activity`);
  ok(await seen(page, "order refund") && await seen(page, OWNER.email), "activity log records who did what");

  // ── Rate limiting ──
  const burst = []; for (let i = 0; i < 14; i++) burst.push((await api("/api/track", { order: "MV-ZZZZZZ-00000000", contact: "x@example.com" })).status);
  ok(burst.includes(429), "order lookups are rate limited");

  // ── 20. Mobile ──
  console.log("\n# Mobile");
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  const m = await phone.newPage();
  for (const p of ["/track-order", "/products/test-hoodie", "/checkout", "/admin", "/admin/orders", orderPage.replace(SITE, ""), "/admin/products", productUrl.replace(SITE, ""), "/admin/inventory", "/admin/inquiries"]) {
    await m.goto(SITE + p); await settle(m);
    const w = await m.evaluate(() => document.documentElement.scrollWidth);
    ok(w <= 390, `no sideways scroll at 390px on ${p} (width ${w})`);
  }
  await m.goto(`${SITE}/admin`); await m.screenshot({ path: `${shots}/c-admin-phone.png` });
  await m.goto(`${SITE}${new URL(trackLink, SITE).pathname}${new URL(trackLink, SITE).search}`); await settle(m); await m.screenshot({ path: `${shots}/c-track-phone.png`, fullPage: true });
  ok(errors.length === 0, `no page errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
} catch (e) {
  console.error(e); results.push([false, `suite crashed: ${e.message}`]);
} finally {
  await b?.close().catch(() => {});
  mock.kill(); next.kill();
  fs.rmSync(dbDir, { recursive: true, force: true });
  const failed = results.filter(([p]) => !p).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  try { fs.writeFileSync(path.join(shots, "e2e-server.log"), serverErr); } catch {}
  if (failed && serverErr) console.log("server stderr (tail):\n" + serverErr.split("\n").slice(-15).join("\n"));
  process.exit(failed ? 1 : 0);
}
