// Local stand-ins for Paystack and Resend, used by scripts/e2e-payments.mjs.
// They mimic the real APIs closely enough to test the whole payment flow without real keys or money.
//   node scripts/mock-services.mjs   (env: MOCK_PORT=4010, MOCK_SITE=http://localhost:3123, MOCK_KEY=sk_test_mock)
import http from "node:http";
import { createHmac } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const SITE = process.env.MOCK_SITE ?? "http://localhost:3123";
const KEY = process.env.MOCK_KEY ?? "sk_test_mock";
const txs = new Map();
const sent = [];
const contacts = [];
const refunds = [];
let nextId = 1000;

const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
const authed = (req) => req.headers.authorization === `Bearer ${KEY}`;

async function sendWebhook(tx) {
  const body = JSON.stringify({ event: "charge.success", data: { reference: tx.reference, amount: tx.amount, status: "success" } });
  const signature = createHmac("sha512", KEY).update(body).digest("hex");
  try {
    const r = await fetch(`${SITE}/api/paystack/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": signature }, body });
    tx.webhookStatus = r.status;
  } catch (e) { tx.webhookStatus = String(e); }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  // ── Paystack API ──
  if (p === "/transaction/initialize" && req.method === "POST") {
    if (!authed(req)) return json(res, 401, { status: false, message: "Invalid key" });
    const b = JSON.parse(await readBody(req));
    if (!b.email || !Number.isInteger(b.amount) || b.amount < 100) return json(res, 400, { status: false, message: "Invalid amount or email" });
    const tx = { id: nextId++, reference: b.reference, amount: b.amount, currency: b.currency, status: "ongoing", metadata: b.metadata, customer: { email: b.email }, callback_url: b.callback_url, created_at: new Date().toISOString(), paid_at: null, channel: null };
    txs.set(tx.reference, tx);
    return json(res, 200, { status: true, message: "Authorization URL created", data: { authorization_url: `http://localhost:${PORT}/pay/${encodeURIComponent(tx.reference)}`, access_code: "mock", reference: tx.reference } });
  }
  if (p.startsWith("/transaction/verify/")) {
    if (!authed(req)) return json(res, 401, { status: false, message: "Invalid key" });
    const tx = txs.get(decodeURIComponent(p.split("/").pop()));
    return tx ? json(res, 200, { status: true, message: "Verification successful", data: tx }) : json(res, 404, { status: false, message: "Transaction reference not found" });
  }
  if (p === "/transaction" && req.method === "GET") {
    if (!authed(req)) return json(res, 401, { status: false, message: "Invalid key" });
    const status = url.searchParams.get("status");
    const list = [...txs.values()].filter((t) => !status || t.status === status).reverse();
    return json(res, 200, { status: true, data: list });
  }
  // ── Fake hosted payment page ──
  if (p.startsWith("/pay/")) {
    const ref = decodeURIComponent(p.slice(5));
    const tx = txs.get(ref);
    if (!tx) { res.writeHead(404); return res.end("unknown"); }
    const action = url.searchParams.get("do");
    if (action === "pay" || action === "cancel" || action === "fail") {
      tx.status = action === "pay" ? "success" : action === "fail" ? "failed" : "abandoned";
      if (action === "pay") { tx.paid_at = new Date().toISOString(); tx.channel = "card"; await sendWebhook(tx); }
      res.writeHead(302, { Location: `${tx.callback_url}?trxref=${encodeURIComponent(ref)}&reference=${encodeURIComponent(ref)}` });
      return res.end();
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`<!doctype html><title>Mock Paystack</title><h1>Mock Paystack</h1><p id="amount">Pay NGN ${(tx.amount / 100).toLocaleString()}</p><a id="pay" href="?do=pay">Pay</a> <a id="cancel" href="?do=cancel">Cancel</a> <a id="fail" href="?do=fail">Decline</a>`);
  }
  if (p === "/refund" && req.method === "POST") {
    if (!authed(req)) return json(res, 401, { status: false, message: "Invalid key" });
    const b = JSON.parse(await readBody(req));
    const tx = txs.get(b.transaction);
    if (!tx || tx.status !== "success") return json(res, 400, { status: false, message: "Transaction not refundable" });
    refunds.push(b);
    return json(res, 200, { status: true, message: "Refund has been queued for processing", data: { status: "pending", amount: b.amount ?? tx.amount } });
  }
  // ── Resend API ──
  if (p === "/emails" && req.method === "POST") { sent.push(JSON.parse(await readBody(req))); return json(res, 200, { id: `email_${sent.length}` }); }
  if (/^\/audiences\/[^/]+\/contacts$/.test(p) && req.method === "POST") { contacts.push(JSON.parse(await readBody(req))); return json(res, 200, { id: `contact_${contacts.length}` }); }
  // ── Inspection for tests ──
  if (p === "/_state") return json(res, 200, { sent, contacts, refunds, txs: [...txs.values()] });
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log(`mock services on ${PORT}`));
