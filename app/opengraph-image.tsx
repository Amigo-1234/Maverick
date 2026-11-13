import { ImageResponse } from "next/og";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/logo-path";

export const alt = "MAVERICK. DIFFERENT BY CHOICE.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when the site is shared on WhatsApp, TikTok, X, etc. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#0b0b0c", color: "#f7f6f3", padding: "0 90px", gap: 70 }}>
        <svg width="300" height="300" viewBox={LOGO_VIEWBOX}><path fill="#f7f6f3" d={LOGO_PATH} /></svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>MAVERICK</div>
          <div style={{ fontSize: 34, letterSpacing: 8, color: "#1c3fff", fontWeight: 700 }}>DIFFERENT BY CHOICE.</div>
          <div style={{ fontSize: 26, color: "#a9a8a3", marginTop: 10 }}>Oversized graphic tees, ringers & long sleeves</div>
        </div>
      </div>
    ),
    size,
  );
}
