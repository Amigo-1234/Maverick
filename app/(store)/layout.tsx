import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { Pixels } from "@/components/pixels";
import { StoreProvider } from "@/components/store-provider";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { Suspense } from "react";
import { getStorefront } from "@/lib/server/store";
import { HeaderFallback } from "@/components/header-fallback";

/** The shop: live catalog and settings from the database (cached until an admin edit or a sale). */
export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const store = await getStorefront();
  return (
    <StoreProvider value={store}>
      <MaintenanceGate>
        <CartProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
          <Suspense fallback={<HeaderFallback />}><SiteHeader /></Suspense>
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <Suspense fallback={null}><WhatsAppFloat /></Suspense>
          <Suspense fallback={null}><Pixels /></Suspense>
        </CartProvider>
      </MaintenanceGate>
    </StoreProvider>
  );
}
