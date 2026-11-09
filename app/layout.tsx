import type { Metadata } from "next";
import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const ui = Hanken_Grotesk({
  variable: "--font-ui",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Graveyard",
  description: "A 3D cemetery for any GitHub account. Old repositories become mossy, cracked graves.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
