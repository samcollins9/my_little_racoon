import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// R3: self-hosted at build time via next/font/google -- no runtime request
// to fonts.googleapis.com or any other host. Loaded once, here, so the
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
  title: "Retroactive Horoscope",
  description:
    "A deployment-lifecycle exercise, proving a push to main reaches production.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
