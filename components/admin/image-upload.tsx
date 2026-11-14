"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Uploads one image for a product slot (front/back/side cut-out or gallery photo). */
export function ImageUpload({ productId, slot, label }: { productId: number; slot: "front" | "back" | "side" | "gallery"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const id = `up-${slot}`;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!(form.get("file") instanceof File) || !(form.get("file") as File).size) { setMsg({ ok: false, text: "Choose an image first." }); return; }
    form.set("productId", String(productId)); form.set("slot", slot);
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setMsg({ ok: true, text: "Uploaded." });
      e.currentTarget?.reset();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed." });
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 text-[13px]">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
      <input id={id} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="text-[12px] file:mr-2 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:uppercase file:text-paper" />
      {slot === "gallery"
        ? <input name="alt" placeholder="Describe the photo (for accessibility)" className="border-[1.5px] border-foreground/20 bg-background px-2 py-1.5" />
        : <label className="flex items-center gap-2"><input type="checkbox" name="removeBg" className="size-4" /> Remove plain background</label>}
      <button type="submit" disabled={busy} className="btn btn-sm self-start disabled:opacity-60">{busy ? "Uploading…" : "Upload"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-accent-blue" : "font-semibold text-accent-red"}>{msg.text}</p>}
    </form>
  );
}
