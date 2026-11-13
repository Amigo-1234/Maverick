"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/** TikTok and Meta pixels. Each loads only if its ID is set (NEXT_PUBLIC_TIKTOK_PIXEL_ID / NEXT_PUBLIC_META_PIXEL_ID). */
const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function Pixels() {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; } // base code already sends the first page view
    const w = window as Window & { ttq?: { page: () => void }; fbq?: (...a: unknown[]) => void };
    try { w.ttq?.page(); } catch {}
    try { w.fbq?.("track", "PageView"); } catch {}
  }, [pathname]);

  return (
    <>
      {TIKTOK_ID && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${JSON.stringify(TIKTOK_ID)});ttq.page();}(window,document,"ttq");`}</Script>
      )}
      {META_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init",${JSON.stringify(META_ID)});fbq("track","PageView");`}</Script>
      )}
    </>
  );
}
