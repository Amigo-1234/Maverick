import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TrackOrder } from "./track-order";

export const metadata: Metadata = { title: "Track your order", description: "Check the status of your MAVERICK order. No account needed.", robots: { index: false } };

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-5xl gutter pb-24 pt-10">
      <PageHeader eyebrow="Track order" title="Track your order" intro="Enter your order number and the email or phone number you used at checkout. Your order number is in your confirmation email and starts with MV-." />
      <Suspense fallback={<div className="h-64" />}>
        <TrackOrder />
      </Suspense>
    </div>
  );
}
