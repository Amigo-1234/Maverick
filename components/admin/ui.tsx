/** Small building blocks for the admin dashboard (usable from server components). */
import Link from "next/link";
import { FULFILMENT_LABELS, PAYMENT_LABELS, type FulfilmentStatus, type PaymentStatus } from "@/lib/order";
import { formatPrice } from "@/lib/site";
import { INQUIRY_LABELS, type InquiryStatus } from "@/lib/server/inquiries";

export function PageHead({ code, title, intro, actions }: { code: string; title: string; intro?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-5">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{code}</p>
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] uppercase leading-[0.9]">{title}</h1>
        {intro && <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Success / error message passed back from an action through the URL. */
export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!ok && !error) return null;
  return (
    <p role={error ? "alert" : "status"} className={`mb-6 border-l-4 px-4 py-3 text-sm font-semibold ${error ? "border-accent-red bg-[#fbe9e8] text-[#8a1510]" : "border-accent-blue bg-paper"}`}>
      {error ?? ok}
    </p>
  );
}

const PAY_TONE: Record<PaymentStatus, string> = {
  paid: "bg-ink text-paper", pending: "bg-paper ring-1 ring-inset ring-foreground/30", failed: "bg-accent-red text-paper", abandoned: "bg-[#d9d7d2] text-muted-foreground",
  refunded: "bg-accent-blue text-paper", partially_refunded: "bg-accent-blue/15 text-accent-blue ring-1 ring-inset ring-accent-blue/40",
};
const FUL_TONE: Record<FulfilmentStatus, string> = {
  unfulfilled: "bg-paper ring-1 ring-inset ring-foreground/30", processing: "bg-[#ffe9a8] text-ink", preparing: "bg-[#ffd36b] text-ink", shipped: "bg-accent-blue text-paper",
  delivered: "bg-[#1f7a3a] text-paper", cancelled: "bg-[#d9d7d2] text-muted-foreground line-through", on_hold: "bg-accent-red/15 text-accent-red ring-1 ring-inset ring-accent-red/40",
  refund_requested: "bg-accent-red text-paper",
};
const pill = "inline-flex items-center whitespace-nowrap px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]";

export const PaymentPill = ({ s }: { s: PaymentStatus }) => <span className={`${pill} ${PAY_TONE[s]}`}>{PAYMENT_LABELS[s]}</span>;
export const FulfilmentPill = ({ s }: { s: FulfilmentStatus }) => <span className={`${pill} ${FUL_TONE[s]}`}>{FULFILMENT_LABELS[s]}</span>;
const INQ_TONE: Record<InquiryStatus, string> = { new: "bg-accent-blue text-paper", in_progress: "bg-[#ffd36b] text-ink", answered: "bg-ink text-paper", closed: "bg-[#d9d7d2] text-muted-foreground" };
export const InquiryPill = ({ s }: { s: InquiryStatus }) => <span className={`${pill} ${INQ_TONE[s]}`}>{INQUIRY_LABELS[s]}</span>;
export const StockPill = ({ stock, lowAt }: { stock: number; lowAt: number }) =>
  stock === 0 ? <span className={`${pill} bg-accent-red text-paper`}>Sold out</span>
    : stock <= lowAt ? <span className={`${pill} bg-[#ffd36b] text-ink`}>Low · {stock}</span>
    : <span className={`${pill} bg-paper ring-1 ring-inset ring-foreground/20`}>{stock} in stock</span>;

export function Stat({ label, value, note, tone = "plain", href }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "plain" | "ink" | "alert"; href?: string }) {
  const body = (
    <div className={`flex h-full flex-col justify-between gap-3 p-4 ${tone === "ink" ? "bg-ink text-paper" : tone === "alert" ? "bg-accent-red text-paper" : "bg-paper"}`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tone === "plain" ? "text-muted-foreground" : "opacity-70"}`}>{label}</p>
      <p className="price text-[clamp(1.6rem,3vw,2.2rem)] leading-none">{value}</p>
      {note && <p className={`text-[12px] ${tone === "plain" ? "text-muted-foreground" : "opacity-80"}`}>{note}</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring">{body}</Link> : body;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 border-2 border-dashed border-foreground/15 px-6 py-12">
      <p className="font-display text-3xl uppercase">{title}</p>
      {children && <div className="max-w-[60ch] text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export const Money = ({ n }: { n: number }) => <span className="price">{formatPrice(n)}</span>;
export const when = (d: Date | string | null) => (d ? new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : "—");
export const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }) : "—");

export function AdminLoading() {
  return <p role="status" className="py-24 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Loading…</p>;
}

/** Simple, accurately-scaled bar chart (server-rendered SVG). */
export function BarChart({ data, format, label }: { data: { x: string; y: number }[]; format: (n: number) => string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.y));
  const W = 720, H = 200, pad = 28, bw = (W - pad) / Math.max(1, data.length);
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const every = Math.ceil(data.length / 8);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{label}</figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={label}>
          {ticks.map((t) => {
            const y = H - (t / max) * (H - 10);
            return <g key={t}><line x1={pad} x2={W} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.1" /><text x={pad - 4} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.55">{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</text></g>;
          })}
          {data.map((d, i) => {
            const h = (d.y / max) * (H - 10);
            return (
              <g key={d.x}>
                <rect x={pad + i * bw + bw * 0.15} y={H - h} width={bw * 0.7} height={Math.max(h, d.y > 0 ? 1.5 : 0)} fill={d.y > 0 ? "var(--accent-blue)" : "transparent"}><title>{`${d.x}: ${format(d.y)}`}</title></rect>
                {i % every === 0 && <text x={pad + i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6">{d.x.slice(5)}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
