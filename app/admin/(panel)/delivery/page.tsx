import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { readSettings, readZones } from "@/lib/server/store";
import { AdminLoading, Flash, PageHead } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { deleteZone, saveDeliverySettings, saveZone } from "../../actions";

export const metadata: Metadata = { title: "Delivery" };

export default function DeliveryPage(props: PageProps<"/admin/delivery">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

type Zone = Awaited<ReturnType<typeof readZones>>[number];

function ZoneForm({ z }: { z?: Zone }) {
  const k = z?.id ?? "new";
  return (
    <form action={saveZone} className="grid gap-3 sm:grid-cols-6">
      {z && <input type="hidden" name="id" value={z.id} />}
      <div className="field sm:col-span-2"><label htmlFor={`n-${k}`}>Name</label><input id={`n-${k}`} name="name" required defaultValue={z?.name} placeholder="e.g. Abuja delivery" /></div>
      <div className="field"><label htmlFor={`f-${k}`}>Fee (₦)</label><input id={`f-${k}`} name="fee" type="number" min={0} required defaultValue={z?.fee ?? 0} /></div>
      <div className="field sm:col-span-2"><label htmlFor={`e-${k}`}>Delivery time</label><input id={`e-${k}`} name="eta" defaultValue={z?.eta} placeholder="e.g. 2–3 working days" /></div>
      <div className="field"><label htmlFor={`o-${k}`}>Position</label><input id={`o-${k}`} name="sort" type="number" defaultValue={z?.sort ?? 0} /></div>
      <div className="field sm:col-span-3"><label htmlFor={`s-${k}`}>States (comma separated; empty = all other states)</label><input id={`s-${k}`} name="states" defaultValue={z?.states.join(", ")} placeholder="e.g. Lagos, Ogun" /></div>
      <div className="field sm:col-span-3"><label htmlFor={`i-${k}`}>Instructions for customers</label><input id={`i-${k}`} name="instructions" defaultValue={z?.instructions} /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isPickup" defaultChecked={z?.isPickup} className="size-4" /> Customer picks up (always free)</label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={z ? z.active : true} className="size-4" /> Offered at checkout</label>
      <div className="flex gap-2 sm:col-span-2 sm:justify-end"><Submit className="btn btn-sm">{z ? "Save" : "Add option"}</Submit></div>
    </form>
  );
}

async function Body({ sp: spP }: { sp: PageProps<"/admin/delivery">["searchParams"] }) {
  await requireAdmin();
  const sp = await spP;
  const [zones, settings] = await Promise.all([readZones(false), readSettings()]);
  return (
    <>
      <PageHead code="09 / Delivery" title="Delivery" intro="Customers see the options for the state they choose at checkout. Options listing that state come first; options with no states cover everywhere else. Fees are worked out again on the server when they pay." />
      <Flash sp={sp} />
      <form action={saveDeliverySettings} className="panel mb-6 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <div className="field"><label htmlFor="free">Free delivery over (₦, 0 = never)</label><input id="free" name="freeDeliveryOver" type="number" min={0} defaultValue={settings.freeDeliveryOver} /></div>
        <div className="field"><label htmlFor="instr">Delivery note shown at checkout</label><input id="instr" name="deliveryInstructions" defaultValue={settings.deliveryInstructions} /></div>
        <Submit>Save</Submit>
      </form>
      <div className="flex flex-col gap-4">
        {zones.map((z) => (
          <section key={z.id} className={`panel ${z.active ? "" : "opacity-70"}`}>
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-2xl uppercase">{z.name}{!z.active && <span className="ml-2 font-mono text-[11px] text-muted-foreground">(off)</span>}</h2>
              <form action={deleteZone}><input type="hidden" name="id" value={z.id} /><Submit className="btn-ghost btn-sm" pendingText="…" confirm={`Delete ${z.name}?`}>Delete</Submit></form></div>
            <ZoneForm z={z} />
          </section>
        ))}
        <section className="panel border-t-4 border-accent-blue"><h2 className="panel-title">New delivery option</h2><ZoneForm /></section>
      </div>
    </>
  );
}
