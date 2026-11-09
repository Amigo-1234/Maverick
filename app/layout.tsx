import type { Metadata } from "next";
import { Anton, Archivo, JetBrains_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "MAVERICK — DIFFERENT BY CHOICE.", template: "%s — MAVERICK" },
  description: "MAVERICK menswear. Oversized graphic tees, ringers and long sleeves. DIFFERENT BY CHOICE.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${anton.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
          <SiteHeader />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <WhatsAppFloat />
        </CartProvider>
      </body>
    </html>
  );
}
