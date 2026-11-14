import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "./contact-form";
import { getStorefront } from "@/lib/server/store";
import { Socials } from "@/components/site-footer";

export const metadata: Metadata = { title: "Contact" };

export default async function Contact() {
  const { settings, zones } = await getStorefront();
  void zones;
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <PageHeader title="Contact" intro="Questions about an order, sizing or a collab? Message us on WhatsApp for the fastest reply, or send a message below." />
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <div className="flex flex-col gap-8 text-sm">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Fastest reply: WhatsApp</p>
            <Socials />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Email</p>
            <p className="select-all font-mono">{settings.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
