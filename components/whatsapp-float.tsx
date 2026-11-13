"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "./icons";
import { whatsappLink } from "@/lib/site";

/** Floating WhatsApp chat button, bottom-right on every page except checkout and admin. */
export function WhatsAppFloat() {
  const pathname = usePathname();
  if (pathname?.startsWith("/checkout") || pathname?.startsWith("/admin")) return null;
  return (
    <a
      href={whatsappLink("Hi MAVERICK, I have a question.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with MAVERICK on WhatsApp"
      className="group fixed z-50 flex items-center gap-2 bg-[#25D366] py-3 pl-3 pr-3 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-[padding,transform] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:pr-4"
      style={{
        right: "max(16px, calc(env(safe-area-inset-right, 0px) + 16px))",
        bottom: "max(16px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
        clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
      }}
    >
      <WhatsAppIcon size={26} />
      <span className="hidden text-[12px] font-bold uppercase tracking-[0.16em] sm:inline">Chat with us</span>
    </a>
  );
}
