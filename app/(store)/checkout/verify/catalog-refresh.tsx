"use client";

import * as React from "react";

/** Asks the server to refresh the shop's stock numbers after a payment changed them. Renders nothing. */
export function CatalogRefresh() {
  React.useEffect(() => { fetch("/api/catalog/refresh", { method: "POST" }).catch(() => {}); }, []);
  return null;
}
