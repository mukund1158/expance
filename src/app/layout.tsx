import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";
import { ChunkReloadGuard } from "./ChunkReloadGuard";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const SITE_URL = process.env.AUTH_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "The shared money ledger for co-founders and families. Track who paid what, settle up, set budgets that warn early, and see where the money went — multi-currency, open source, installable on your phone.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Expance — know where the money went",
    template: "%s · Expance",
  },
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expance",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Expance",
    title: "Expance — know where the money went",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Expance — the shared money ledger" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expance — know where the money went",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Prevent iOS zoom-on-focus jank in forms; the UI stays readable at 1x.
  maximumScale: 1,
  themeColor: "#a6242f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <ChunkReloadGuard />
        {children}
      </body>
    </html>
  );
}
