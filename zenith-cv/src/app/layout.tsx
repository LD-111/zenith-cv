import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LeaveGuard } from "./leave-guard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cv.ldevia.dev"),
  title: "Zenith CV — Markdown Resume Builder",
  description: "A privacy-first, self-contained Markdown-to-PDF resume builder.",
  openGraph: {
    title: "Zenith CV — Markdown Resume Builder",
    description: "A privacy-first, self-contained Markdown-to-PDF resume builder.",
    url: "https://cv.ldevia.dev",
    siteName: "Zenith CV",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zenith CV editor with live Markdown preview" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zenith CV — Markdown Resume Builder",
    description: "A privacy-first, self-contained Markdown-to-PDF resume builder.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LeaveGuard />
        {children}
      </body>
    </html>
  );
}
