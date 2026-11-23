import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  applicationName: "MAVERICK Admin",
  appleWebApp: { capable: true, title: "MAVERICK Admin", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/brand/maverick-m.jpg", sizes: "1254x1254", type: "image/jpeg" }] },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
