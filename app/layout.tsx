import type { Metadata } from "next";
import {
  Syne,
  Cormorant_Garamond,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-syne",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LumiList — Liquid-Glass Personal Operating System",
  description:
    "A nature-inspired floating liquid-glass personal operating system and productivity dashboard with quick launcher, live USD/IDR forex terminal, Open-Meteo weather, daily planner with weekly progress analytics, and real-time prayer schedule.",

  icons: {
    icon: "/src/favicon.png",
    shortcut: "/src/favicon.png",
    apple: "/src/favicon.png",
  },

  openGraph: {
    title: "LumiList — Liquid-Glass Personal Operating System",
    description:
      "A nature-inspired floating liquid-glass personal operating system and productivity dashboard with quick launcher, live USD/IDR forex terminal, Open-Meteo weather, daily planner with weekly progress analytics, and real-time prayer schedule.",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "LumiList — Liquid-Glass Personal Operating System",
    description:
      "A nature-inspired floating liquid-glass personal operating system and productivity dashboard with quick launcher, live USD/IDR forex terminal, Open-Meteo weather, daily planner with weekly progress analytics, and real-time prayer schedule.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${cormorant.variable} ${jakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#050706] text-[#F4F5F0] antialiased selection:bg-[#B8E66A]/25 selection:text-[#B8E66A] overflow-x-hidden"
        style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}