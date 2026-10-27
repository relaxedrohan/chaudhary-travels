import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { display } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
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
