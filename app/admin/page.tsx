import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/site";
import { ADMIN_COOKIE, tokenOk } from "@/lib/server/admin";
import { config, emailReady, paymentsReady } from "@/lib/server/config";
import { amountMatches, listTransactions, orderFrom, type PaystackTransaction } from "@/lib/server/paystack";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <Suspense fallback={<p className="py-20 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" role="status">Loading…</p>}>
        <Gate searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Gate({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const sp = await searchParams;
  if (!config.adminPassword) {
    return <Notice title="Admin not set up" body="Add ADMIN_PASSWORD to the site's environment settings to turn on this page." />;
  }
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!tokenOk(token)) return <Login failed={sp.error === "1"} />;
  return <Orders />;
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3 py-16">
      <h1 className="font-display text-6xl uppercase">{title}</h1>
      <p className="max-w-[56ch] text-muted-foreground">{body}</p>
    </div>
  );
}

function Login({ failed }: { failed: boolean }) {
  return (
    <form method="post" action="/api/admin/login" className="flex max-w-sm flex-col gap-4 py-16">
      <h1 className="font-display text-6xl uppercase">Orders</h1>
      <p className="text-muted-foreground">Staff only. Enter the admin password.</p>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" autoFocus /></div>
      {failed && <p role="alert" className="text-sm font-semibold text-accent-red">That password isn&apos;t right.</p>}
      <button type="submit" className="btn self-start">Sign in</button>
    </form>
  );
}

async function Orders() {
  if (!paymentsReady()) return <Notice title="Payments not connected" body="Add PAYSTACK_SECRET_KEY to the environment settings. Paid orders will appear here." />;
  let txs: PaystackTransaction[] = [];
  let failed = false;
  try { txs = await listTransactions({ status: "success", perPage: 50 }); } catch (e) { console.error("[admin]", e); failed = true; }
  const rows = txs.map((tx) => ({ tx, order: orderFrom(tx) }));
  const revenue = txs.reduce((n, t) => n + t.amount / 100, 0);
  const live = config.paystack.secretKey?.startsWith("sk_live_");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{live ? "Live payments" : "Test payments"} · last {txs.length} paid</p>
          <h1 className="font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.85]">Orders</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="https://dashboard.paystack.com/#/transactions" target="_blank" rel="noopener noreferrer" className="btn-ghost">Paystack dashboard</a>
          <form method="post" action="/api/admin/logout"><button type="submit" className="btn">Sign out</button></form>
        </div>
      </header>
      {!emailReady() && <p className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm">Order alert emails are off. Add the Resend settings so you&apos;re emailed when someone pays.</p>}
      {failed && <p role="alert" className="border-l-4 border-accent-red bg-paper px-4 py-3 text-sm">Couldn&apos;t load orders from Paystack. Refresh in a minute.</p>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="bg-paper p-4"><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Paid orders</dt><dd className="price mt-1 text-3xl">{txs.length}</dd></div>
        <div className="bg-paper p-4"><dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Revenue (shown)</dt><dd className="price mt-1 text-3xl">{formatPrice(revenue)}</dd></div>
      </dl>
      {rows.length === 0 && !failed ? (
        <p className="py-10 text-muted-foreground">No paid orders yet. They&apos;ll appear here as soon as someone pays.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map(({ tx, order }) => {
            const phone = order?.customer.phone.replace(/\D/g, "").replace(/^0/, "234");
            return (
              <li key={tx.id} className="grid gap-4 border-[1.5px] border-foreground/15 bg-paper p-5 md:grid-cols-[1.1fr_1.4fr_1fr]">
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{tx.paid_at ? new Date(tx.paid_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : ""}</p>
                  <p className="font-semibold">{tx.reference}</p>
                  <p className="price text-xl">{formatPrice(tx.amount / 100)}</p>
                  {order && !amountMatches(tx, order) && <p className="text-[12px] font-semibold text-accent-red">Amount doesn&apos;t match the order. Check by hand.</p>}
                  <p className="text-[12px] text-muted-foreground">via {tx.channel ?? "Paystack"}</p>
                </div>
                {order ? (
                  <>
                    <ul className="flex flex-col gap-1 text-sm">
                      {order.items.map((i) => <li key={`${i.slug}-${i.size}`}><span className="font-semibold">{i.qty}× {i.name}</span> <span className="text-muted-foreground">{i.colour}, size {i.size}</span></li>)}
                      <li className="mt-1 text-[13px] text-muted-foreground">{order.shipping.label} · {order.delivery === 0 ? "free delivery" : formatPrice(order.delivery)}</li>
                    </ul>
                    <div className="flex flex-col gap-1 text-sm">
                      <p className="font-semibold">{order.customer.firstName} {order.customer.lastName}</p>
                      <p className="text-muted-foreground">{[order.customer.address1, order.customer.address2, order.customer.city, order.customer.state].filter(Boolean).join(", ")}</p>
                      <p><a className="underline underline-offset-2" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> · <a className="underline underline-offset-2" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
                      <p><a className="underline underline-offset-2" href={`mailto:${order.customer.email}`}>{order.customer.email}</a></p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground md:col-span-2">Paid on Paystack without website order details (e.g. a payment link). Customer: {tx.customer?.email}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
