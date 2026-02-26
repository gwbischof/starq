import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ConstellationBg } from "@/components/constellation-bg";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starq — Distributed Work Queue",
  description: "Self-hosted distributed work queue with Redis Streams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ConstellationBg />
        <div className="relative z-10">
          <Nav />
          <main className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
