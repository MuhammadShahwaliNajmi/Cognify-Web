import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cognify: Learn the theory. Model the market.",
  description:
    "Live, premium online Economics and Business classes for ambitious IB, O Level, IGCSE & Edexcel students. A boutique academy built on first-principles learning.",
  metadataBase: new URL("https://cognifypk.com"),
  openGraph: {
    title: "Cognify: Learn the theory. Model the market.",
    description:
      "Live, premium online Economics and Business classes for ambitious IB, O Level, IGCSE & Edexcel students.",
    url: "https://cognifypk.com",
    siteName: "Cognify",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
