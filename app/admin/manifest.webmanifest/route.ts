import type { MetadataRoute } from "next";

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/admin",
    name: "MAVERICK Store Admin",
    short_name: "MAVERICK Admin",
    description: "Manage MAVERICK orders, products and customer conversations.",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#ecebe7",
    theme_color: "#0b0b0c",
    icons: [
      { src: "/brand/maverick-m.jpg", sizes: "1254x1254", type: "image/jpeg", purpose: "any" },
      { src: "/brand/maverick-m.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
