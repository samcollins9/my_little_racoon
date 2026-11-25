import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TagManager } from "./TagManager";
import { SITE_TITLE } from "@/lib/site-title";

// R3: self-hosted at build time via next/font/google -- fonts make no
// runtime request to fonts.googleapis.com or any other host. (The one
// deliberate third-party request is analytics, Sprint 46: <TagManager />
// below, production only.) Loaded once, here, so the
// resulting --font-cormorant/--font-mono custom properties are available
// to every page and CSS module, not just app/reading/[id]/.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Sprint 49: the default for every page without a date (redirects, 404s,
  // the error page). Pages with a date set datedTitle() in generateMetadata.
  title: SITE_TITLE,
  description:
    "Pick a date to see the sky over it and what happened that day, and have a horoscope written for it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${mono.variable}`}>
      <body>
        {children}
        {/* Sprint 46: Google Tag Manager, once per page, production only. */}
        <TagManager />
      </body>
    </html>
  );
}
