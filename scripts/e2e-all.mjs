// Runs every browser test against the production build (`npm run build` first).
//   1. e2e-payments.mjs: admin, payments, stock, tracking, inquiries (starts its own server + mock Paystack/Resend).
//   2. e2e-shop.mjs and e2e-menu.mjs: storefront, against a server with NO payment or email keys,
//      so checkout must fail safely. Keys from .env.local are blanked and the API hosts point nowhere,
//      so nothing here can ever reach real Paystack or Resend.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const run = (file, args = [], env = process.env) => new Promise((resolve) => {
  console.log(`\n━━ ${file} ━━`);
  spawn("node", [file, ...args], { stdio: "inherit", env }).on("exit", (code) => resolve(code ?? 1));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const codes = [await run("scripts/e2e-payments.mjs")];

const PORT = 3124;
const SITE = `http://localhost:${PORT}`;
const nowhere = "http://127.0.0.1:9";
const env = { ...process.env, PGLITE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "mv-e2e-shop-")), NEXT_PUBLIC_SITE_URL: SITE,
  PAYSTACK_SECRET_KEY: " ", PAYSTACK_API_BASE: nowhere, RESEND_API_KEY: " ", RESEND_API_BASE: nowhere, APP_SECRET: "e2e-secret-0123456789abcdef" };
fs.rmSync(".next/server/route-cache", { recursive: true, force: true });
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: "ignore" });
try {
  for (let i = 0; ; i++) { try { await fetch(SITE); break; } catch { if (i > 120) throw new Error("server did not start"); await wait(500); } }
  codes.push(await run("scripts/e2e-shop.mjs", [SITE]), await run("scripts/e2e-menu.mjs", [SITE]));
} finally { server.kill(); }

const failed = codes.filter((c) => c !== 0).length;
console.log(`\n${failed ? `✗ ${failed} of ${codes.length} suites failed` : `✓ all ${codes.length} suites passed`}`);
process.exit(failed ? 1 : 0);
