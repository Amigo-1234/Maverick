import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { AdminLoading } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/server/admin";
import { navCounts } from "@/lib/server/admin-data";
import { releaseExpiredReservations } from "@/lib/server/orders";

export const metadata: Metadata = { title: { default: "Store admin", template: "%s — MAVERICK admin" }, robots: { index: false, follow: false } };

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background px-10"><AdminLoading /></div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Signs-in check for the whole dashboard. Pages and actions also check on their own. */
async function Gate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await releaseExpiredReservations().catch(() => 0); // return stock from unpaid checkouts past their window
  const counts = await navCounts();
  return <AdminShell admin={admin} counts={counts}>{children}</AdminShell>;
}
