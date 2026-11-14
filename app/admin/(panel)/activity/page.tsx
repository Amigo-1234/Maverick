import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin";
import { activityLog } from "@/lib/server/admin-data";
import { AdminLoading, Empty, PageHead, when } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Activity log" };

export default function ActivityPage() {
  return <Suspense fallback={<AdminLoading />}><Body /></Suspense>;
}

async function Body() {
  await requireAdmin();
  const rows = await activityLog(200);
  return (
    <>
      <PageHead code="11 / Activity" title="Activity log" intro="Every sign-in and change made in the dashboard, with who made it. Kept for accountability; it can't be edited." />
      {rows.length === 0 ? <Empty title="Nothing yet" /> : (
        <div className="overflow-x-auto bg-paper"><table className="atable"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th><th>Details</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap font-mono text-[12px] text-muted-foreground">{when(r.created_at)}</td>
              <td className="text-[13px]">{r.admin_email}</td>
              <td className="font-semibold">{r.action.replaceAll("_", " ")}</td>
              <td className="text-[13px]">{r.entity} {r.entity_id && <span className="font-mono text-muted-foreground">#{r.entity_id.slice(0, 12)}</span>}</td>
              <td className="max-w-[360px] truncate font-mono text-[11px] text-muted-foreground">{Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : ""}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
