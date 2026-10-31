import type { Metadata } from "next";
import { Alegreya_Sans, IM_Fell_English } from "next/font/google";
import "./globals.css";

const display = IM_Fell_English({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const ui = Alegreya_Sans({
  variable: "--font-ui",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Graveyard",
  description: "Walk through a 3D cemetery built from anyone's public GitHub repositories.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
