import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listDiscounts } from "@/lib/server/admin-data";
import { formatPrice } from "@/lib/site";
import { AdminLoading, Empty, Flash, PageHead, day } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { createDiscount, deleteDiscount, toggleDiscount } from "../../actions";

export const metadata: Metadata = { title: "Discounts" };

export default function DiscountsPage(props: PageProps<"/admin/discounts">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

async function Body({ sp: spP }: { sp: PageProps<"/admin/discounts">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const rows = await listDiscounts();
  const now = Date.now();
  const state = (d: (typeof rows)[number]) =>
    !d.active ? "Off" : d.expires_at && new Date(d.expires_at).getTime() < now ? "Expired" : d.usage_limit !== null && d.used_count >= d.usage_limit ? "Used up" : d.starts_at && new Date(d.starts_at).getTime() > now ? "Scheduled" : "Live";
  return (
    <>
      <PageHead code="08 / Discounts" title="Discount codes" intro="Codes are checked on the server at checkout. A code only counts as used once the order is paid." />
      <Flash sp={sp} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {rows.length === 0 ? <Empty title="No codes yet">Create your first code on the right.</Empty> : (
          <div className="overflow-x-auto bg-paper self-start"><table className="atable"><thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th className="num">Used</th><th>Status</th><th></th></tr></thead><tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="font-mono font-semibold">{d.code}</td>
                <td>{d.kind === "percent" ? `${d.value}% off` : `${formatPrice(d.value)} off`}</td>
                <td className="text-[12px] text-muted-foreground">{d.min_order > 0 ? `Min ${formatPrice(d.min_order)}` : "No minimum"}{d.expires_at ? ` · ends ${day(d.expires_at)}` : ""}{d.starts_at ? ` · starts ${day(d.starts_at)}` : ""}</td>
                <td className="num">{d.used_count}{d.usage_limit ? ` / ${d.usage_limit}` : ""}</td>
                <td><span className={`px-2 py-1 font-mono text-[10px] font-bold uppercase ${state(d) === "Live" ? "bg-[#1f7a3a] text-paper" : "bg-[#d9d7d2] text-muted-foreground"}`}>{state(d)}</span></td>
                <td className="whitespace-nowrap">
                  <form action={toggleDiscount} className="inline"><input type="hidden" name="id" value={d.id} /><Submit className="btn-ghost btn-sm" pendingText="…">{d.active ? "Turn off" : "Turn on"}</Submit></form>{" "}
                  <form action={deleteDiscount} className="inline"><input type="hidden" name="id" value={d.id} /><Submit className="btn-ghost btn-sm" pendingText="…" confirm={`Delete ${d.code}?`}>Delete</Submit></form>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        <form action={createDiscount} className="panel grid gap-3 self-start sm:grid-cols-2">
          <h2 className="panel-title sm:col-span-2">New code</h2>
          <div className="field sm:col-span-2"><label htmlFor="code">Code</label><input id="code" name="code" required placeholder="e.g. DROP01" className="font-mono uppercase" /></div>
          <div className="field"><label htmlFor="kind">Type</label><select id="kind" name="kind"><option value="percent">Percent off</option><option value="fixed">Naira off</option></select></div>
          <div className="field"><label htmlFor="value">Amount</label><input id="value" name="value" type="number" min={1} required placeholder="10" /></div>
          <div className="field"><label htmlFor="minOrder">Minimum order (₦)</label><input id="minOrder" name="minOrder" type="number" min={0} defaultValue={0} /></div>
          <div className="field"><label htmlFor="usageLimit">Usage limit</label><input id="usageLimit" name="usageLimit" type="number" min={1} placeholder="Unlimited" /></div>
          <div className="field"><label htmlFor="startsAt">Starts</label><input id="startsAt" name="startsAt" type="date" /></div>
          <div className="field"><label htmlFor="expiresAt">Ends (end of day)</label><input id="expiresAt" name="expiresAt" type="date" /></div>
          <div className="sm:col-span-2"><Submit>Create code</Submit></div>
        </form>
      </div>
    </>
  );
}
