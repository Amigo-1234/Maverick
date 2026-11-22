"use client";

import * as React from "react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function base64Key(value: string) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function PushNotifications({ audience, inquiryId, token, compact = false }: { audience: "admin" | "customer"; inquiryId?: number; token?: string; compact?: boolean }) {
  const [state, setState] = React.useState<"checking" | "unsupported" | "install" | "ready" | "enabled" | "denied" | "unconfigured">("checking");
  const [installPrompt, setInstallPrompt] = React.useState<InstallPrompt | null>(null);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const onInstall = (e: Event) => { e.preventDefault(); setInstallPrompt(e as InstallPrompt); setState("install"); };
    window.addEventListener("beforeinstallprompt", onInstall);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const timer = window.setTimeout(async () => {
      if (!supported) return setState("unsupported");
      const config = await fetch("/api/push/subscribe").then((r) => r.json()).catch(() => ({ ready: false }));
      if (!config.ready) return setState("unconfigured");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) return setState("enabled");
      const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setState(isiOS && !standalone ? "install" : "ready");
    }, 0);
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);

  const enable = async () => {
    setMessage("");
    if (installPrompt) { await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === "accepted") setMessage("App installed. Open it from your Home Screen, then tap Enable notifications again."); return; }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isiOS && !standalone) { setMessage("On iPhone: tap Share, choose Add to Home Screen, then open MAVERICK from the new icon."); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }
      const config = await fetch("/api/push/subscribe").then((r) => r.json()) as { publicKey: string };
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Key(config.publicKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, inquiryId, token, subscription: subscription.toJSON() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't enable notifications.");
      setState("enabled"); setMessage("Notifications are on for this device.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Couldn't enable notifications."); }
  };

  if (state === "checking" || state === "unconfigured") return state === "unconfigured" && audience === "admin" ? <p className="text-[11px] text-muted-foreground">Add VAPID keys to enable home-screen alerts.</p> : null;
  if (state === "enabled") return <p className={compact ? "text-[11px] font-semibold text-[#1f7a3a]" : "border-l-4 border-[#1f7a3a] bg-paper px-3 py-2 text-xs font-semibold"}>Notifications enabled on this device.</p>;
  if (state === "unsupported") return <p className="text-[11px] text-muted-foreground">Push notifications are not supported in this browser.</p>;
  return <div className={`flex flex-col gap-2 ${compact ? "" : "border border-border bg-paper p-3"}`}>
    <button type="button" onClick={enable} className={compact ? "btn-ghost self-start text-xs" : "btn btn-sm self-start"}>{state === "install" ? "Add app & enable alerts" : "Enable notifications"}</button>
    {state === "denied" && <p className="text-[11px] text-accent-red">Notifications are blocked. Allow them in your device settings and try again.</p>}
    {message && <p role="status" className="max-w-[52ch] text-[11px] leading-relaxed text-muted-foreground">{message}</p>}
  </div>;
}
