import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk, Manrope, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata: Metadata = {
  title: "EventGo — What's happening near you",
  description: "Discover events happening near you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${manrope.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
