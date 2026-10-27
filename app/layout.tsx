import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { display } from "./fonts";
import "./globals.css";

// Link previews (WhatsApp, Instagram) need absolute image URLs, including the Pages base path.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://relaxedrohan.github.io";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}${basePath}/`),
  openGraph: {
    type: "website",
    siteName: "Chaudhary Travels",
    locale: "en_IN",
    images: [
      {
        url: "og.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Chaudhary Travels · Bus travel from Okhla, New Delhi",
      },
    ],
  },
  title: "Chaudhary Travels · Bus travel from Okhla, New Delhi",
  description:
    "Chaudhary Travels — bus tickets from Batla House, Jamia Nagar, Okhla. Call 95999 08892 or 98102 90486 to book.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} antialiased`} suppressHydrationWarning>
      <body>
        {/* Skip the landing intro if it already played this session. Runs in <head>,
            before anything paints, so the intro never flashes on reload. */}
        <Script id="intro-once" strategy="beforeInteractive">
          {`try{if(sessionStorage.getItem("ct-intro"))document.documentElement.classList.add("no-intro")}catch(e){}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
