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
  title: "Concept Lab: Master the Subject. Ace the Exam.",
  description:
    "Live Economics & Business classes for ambitious O-Level, IGCSE, A-Level and IB students. Two specialist teachers, examiner-marked practice, predicted grades and Concept Lab AI.",
  metadataBase: new URL("https://cognifypk.com"),
  openGraph: {
    title: "Concept Lab: Master the Subject. Ace the Exam.",
    description:
      "Live Economics & Business classes for ambitious O-Level, IGCSE, A-Level and IB students. Two specialist teachers, examiner-marked practice, predicted grades and Concept Lab AI.",
    url: "https://cognifypk.com",
    siteName: "Concept Lab",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Concept Lab: Master the Subject. Ace the Exam.",
    description:
      "Live Economics & Business classes for ambitious O-Level, IGCSE, A-Level and IB students.",
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
