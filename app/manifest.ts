import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MAVERICK Store",
    short_name: "MAVERICK",
    description: "MAVERICK menswear and customer conversations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ecebe7",
    theme_color: "#0b0b0c",
    icons: [
      { src: "/brand/maverick-m.jpg", sizes: "1254x1254", type: "image/jpeg", purpose: "any" },
      { src: "/brand/maverick-m.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
