import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { listAdmins } from "@/lib/server/admin-data";
import { readSettings } from "@/lib/server/store";
import { config, emailReady, paymentsReady } from "@/lib/server/config";
import { AdminLoading, Flash, PageHead, when } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { addAdmin, saveStoreSettings, toggleAdmin, updatePassword } from "../../actions";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage(props: PageProps<"/admin/settings">) {
  return <Suspense fallback={<AdminLoading />}><Body sp={props.searchParams} /></Suspense>;
}

const F = ({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={id} {...rest} /></div>
);

async function Body({ sp: spP }: { sp: PageProps<"/admin/settings">["searchParams"] }) {
  const admin = await requireAdmin();
  const sp = await spP;
  const [s, team] = await Promise.all([readSettings(), listAdmins()]);
  const owner = admin.role === "owner";
  const checks = [
    ["Database", config.databaseUrl ? "Connected (PostgreSQL)" : "Local test database (set DATABASE_URL before going live)", Boolean(config.databaseUrl)],
    ["Payments", paymentsReady() ? (config.paystack.secretKey!.startsWith("sk_live_") ? "Paystack live" : "Paystack test mode") : "Not connected (PAYSTACK_SECRET_KEY)", paymentsReady()],
    ["Email", emailReady() ? "Resend connected" : "Not connected (RESEND_API_KEY, EMAIL_FROM)", emailReady()],
    ["Tracking links", config.appSecret.startsWith("dev-only") ? "Using the development secret (set APP_SECRET)" : "Signed", !config.appSecret.startsWith("dev-only")],
  ] as const;

  return (
    <>
      <PageHead code="10 / Settings" title="Settings" intro="Store details shown across the shop. Secret keys (Paystack, Resend, database) are never shown here. They live in the hosting environment settings." />
      <Flash sp={sp} />
      <section className="panel mb-6" aria-labelledby="sys-h">
        <h2 id="sys-h" className="panel-title">Connections</h2>
        <ul className="grid gap-2 sm:grid-cols-2">{checks.map(([k, v, ok]) => <li key={k} className="flex items-center gap-3 text-sm"><span aria-hidden="true" className={`size-2.5 ${ok ? "bg-[#1f7a3a]" : "bg-accent-red"}`} /><span className="font-semibold">{k}:</span> <span className="text-muted-foreground">{v}</span></li>)}</ul>
      </section>

      <form action={saveStoreSettings} className="grid gap-6 xl:grid-cols-2">
        <section className="panel grid gap-3 sm:grid-cols-2">
          <h2 className="panel-title sm:col-span-2">Store</h2>
          <F id="name" label="Store name" defaultValue={s.name} required />
          <F id="slogan" label="Slogan" defaultValue={s.slogan} />
          <div className="sm:col-span-2"><F id="announcement" label="Announcement bar (empty to hide)" defaultValue={s.announcement} /></div>
          <F id="email" label="Business email (shown to customers)" type="email" defaultValue={s.email} />
          <F id="orderNotifyEmail" label="Order & inquiry alerts go to" type="email" defaultValue={s.orderNotifyEmail} placeholder={config.email.ordersTo ?? "owner@…"} />
          <F id="whatsapp" label="WhatsApp number (with country code)" defaultValue={s.whatsapp} placeholder="2347025244302" inputMode="numeric" />
          <F id="whatsappDisplay" label="WhatsApp number as shown" defaultValue={s.whatsappDisplay} />
          <F id="supportContact" label="Customer support contact" defaultValue={s.supportContact} />
          <F id="address" label="Store address" defaultValue={s.address} />
          <F id="returnsDays" label="Returns window (days)" type="number" min={0} defaultValue={s.returnsDays} />
          <div className="field"><label htmlFor="currency">Currency</label><input id="currency" value="NGN (₦)" disabled readOnly /></div>
          <label className="flex items-center gap-2 border-l-4 border-accent-red bg-background px-3 py-2 text-sm sm:col-span-2"><input type="checkbox" name="maintenance" defaultChecked={s.maintenance} className="size-4" /> Maintenance mode: hide the shop and stop checkout (admin still works)</label>
        </section>
        <div className="flex flex-col gap-6">
          <section className="panel grid gap-3">
            <h2 className="panel-title">Social links</h2>
            <F id="tiktok" label="TikTok URL" defaultValue={s.socials.tiktok} type="url" />
            <F id="snapchat" label="Snapchat URL" defaultValue={s.socials.snapchat} type="url" />
            <F id="instagram" label="Instagram URL" defaultValue={s.socials.instagram} type="url" placeholder="https://www.instagram.com/…" />
          </section>
          <section className="panel grid gap-3 sm:grid-cols-2">
            <h2 className="panel-title sm:col-span-2">Legal pages</h2>
            <F id="businessName" label="Registered business name" defaultValue={s.legal.businessName} />
            <F id="registration" label="CAC number" defaultValue={s.legal.registration} placeholder="e.g. BN 1234567" />
            <F id="legalAddress" label="Address for notices" defaultValue={s.legal.address} />
            <F id="legalUpdated" label="Policies last updated" defaultValue={s.legal.updated} />
          </section>
          <Submit>Save settings</Submit>
        </div>
      </form>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section id="team" className="panel" aria-labelledby="team-h">
          <h2 id="team-h" className="panel-title">Team</h2>
          <ul className="mb-4 flex flex-col divide-y divide-border">
            {team.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><span className="font-semibold">{t.name}</span> <span className="text-muted-foreground">{t.email} · {t.role}{!t.active && " · deactivated"}</span><span className="block text-[12px] text-muted-foreground">Last sign-in {when(t.last_login_at)}</span></span>
                {owner && t.id !== admin.id && <form action={toggleAdmin}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="active" value={t.active ? "0" : "1"} /><Submit className="btn-ghost btn-sm" pendingText="…">{t.active ? "Deactivate" : "Reactivate"}</Submit></form>}
              </li>
            ))}
          </ul>
          {owner ? (
            <form action={addAdmin} className="grid gap-3 border-t-2 border-foreground pt-4 sm:grid-cols-2">
              <F id="new-name" label="Name" name="name" required />
              <F id="new-email" label="Email" name="email" type="email" required />
              <F id="new-password" label="Temporary password (10+ characters)" name="password" type="password" required minLength={10} autoComplete="new-password" />
              <div className="field"><label htmlFor="role">Role</label><select id="role" name="role"><option value="staff">Staff</option><option value="owner">Owner (can manage the team)</option></select></div>
              <div className="sm:col-span-2"><Submit className="btn btn-sm">Add team member</Submit></div>
            </form>
          ) : <p className="text-sm text-muted-foreground">Only the owner can add or remove team members.</p>}
        </section>
        <section id="password" className="panel" aria-labelledby="pw-h">
          <h2 id="pw-h" className="panel-title">Your password</h2>
          <form action={updatePassword} className="grid gap-3">
            <F id="current" label="Current password" type="password" required autoComplete="current-password" />
            <F id="next" label="New password (10+ characters)" type="password" required minLength={10} autoComplete="new-password" />
            <F id="confirm" label="Confirm new password" type="password" required minLength={10} autoComplete="new-password" />
            <Submit className="btn btn-sm self-start">Change password</Submit>
            <p className="text-[12px] text-muted-foreground">Changing it signs you out everywhere.</p>
          </form>
        </section>
      </div>
    </>
  );
}
