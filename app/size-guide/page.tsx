import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { sizeChart } from "@/lib/site";

export const metadata: Metadata = { title: "Size Guide" };

export default function SizeGuide() {
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Size guide" intro="Our tees are cut oversized and boxy, with dropped shoulders. Take your usual size for the intended look, or size down for a closer fit." />
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left tabular-nums">
            <caption className="mb-3 text-left font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Garment measurements in {sizeChart.unit}, laid flat</caption>
            <thead><tr>{sizeChart.columns.map((c) => <th key={c} scope="col" className="border-b-2 border-foreground py-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.12em]">{c}</th>)}</tr></thead>
            <tbody>{sizeChart.rows.map((r) => <tr key={r[0]}>{r.map((v, k) => k === 0 ? <th key={k} scope="row" className="border-b border-border py-3 pr-4 font-display text-2xl">{v}</th> : <td key={k} className="border-b border-border py-3 pr-4 font-mono">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="prose-mv">
          <h2 className="!mt-0">How to measure</h2>
          <p><strong>Chest:</strong> lay a tee you own flat and measure straight across, armpit to armpit.</p>
          <p><strong>Length:</strong> from the highest point of the shoulder, next to the collar, down to the hem.</p>
          <p><strong>Sleeve:</strong> from the shoulder seam to the end of the sleeve.</p>
          <p>Compare those numbers with the chart. If you&apos;re between sizes, go up for more room or down for a cleaner line.</p>
        </div>
      </div>
    </div>
  );
}
