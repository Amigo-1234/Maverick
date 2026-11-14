"use client";

import * as React from "react";
import type { Catalog } from "@/lib/catalog";
import type { DeliveryZone, StoreSettings } from "@/lib/site";
import { whatsappLink } from "@/lib/site";

type Store = { catalog: Catalog; settings: StoreSettings; zones: DeliveryZone[] };
const StoreContext = React.createContext<Store | null>(null);

/** Live catalog and store settings from the database, provided once by the store layout. */
export function StoreProvider({ value, children }: { value: Store; children: React.ReactNode }) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = React.useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

export const useCatalog = () => useStore().catalog;
export const useSettings = () => useStore().settings;

/** WhatsApp link to the store's configured number. */
export function useWhatsApp() {
  const { whatsapp } = useSettings();
  return React.useCallback((text?: string) => whatsappLink(whatsapp, text), [whatsapp]);
}
