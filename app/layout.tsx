import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
