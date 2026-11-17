import { Inter } from "next/font/google";
import { headers } from "next/headers";
import type { Viewport } from "next";

import { BRAND, brandMetadata } from "@/lib/brand";
import { isPwaApplicationHost } from "@/lib/pwa";

import { PwaProvider } from "@/components/pwa/pwa-provider";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#174b3f",
};

export function generateMetadata() {
  const metadata = brandMetadata();
  if (!isPwaApplicationHost(headers().get("host"))) return metadata;
  return {
    ...metadata,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Roomline",
      statusBarStyle: "default" as const,
    },
    icons: { icon: BRAND.favicon, apple: "/icons/apple-touch-icon.png" },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
