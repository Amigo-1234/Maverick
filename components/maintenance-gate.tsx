"use client";

import { LogoMark, WhatsAppIcon } from "./icons";
import { useSettings, useWhatsApp } from "./store-provider";

/** When maintenance mode is on (Admin → Settings), shoppers see a holding page. Checkout is also refused on the server. */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const wa = useWhatsApp();
  if (!settings.maintenance) return <>{children}</>;
  return (
    <main id="main" className="flex min-h-screen flex-col items-start justify-center gap-6 bg-ink px-[max(24px,env(safe-area-inset-left))] py-20 text-paper">
      <LogoMark size={56} />
      <h1 className="font-display text-[clamp(3rem,10vw,7rem)] uppercase leading-[0.85]">Back soon.</h1>
      <p className="max-w-[46ch] text-paper/75">{settings.name} is updating the shop. Orders and questions are still welcome on WhatsApp.</p>
      <a href={wa("Hi MAVERICK!")} target="_blank" rel="noopener noreferrer" className="btn-light"><WhatsAppIcon size={18} /> {settings.whatsappDisplay}</a>
    </main>
  );
}
