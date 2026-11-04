import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PARADELLE CHOCOLATES — Crafted for True Indulgence",
    template: "%s | PARADELLE CHOCOLATES",
  },
  description:
    "Small-batch European-style chocolate bars — Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled. Temperature-protected delivery across India. Secure Razorpay checkout.",
  icons: { icon: "/images/logo.png", apple: "/images/logo.png" },
  openGraph: {
    title: "PARADELLE CHOCOLATES",
    description: "Crafted for true indulgence. Four signature bars, small-batch made.",
    images: ["/images/hero.webp"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#291813",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="bg-ivory font-sans text-espresso antialiased">{children}</body>
    </html>
  );
}
