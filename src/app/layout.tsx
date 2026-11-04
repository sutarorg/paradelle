import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { GoogleAnalytics } from "@/components/google-analytics";

const playfair = localFont({
  src: "../../public/fonts/playfair-display-latin-variable.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = localFont({
  src: "../../public/fonts/dm-sans-latin-variable.woff2",
  weight: "100 1000",
  style: "normal",
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
  alternates: { canonical: `${SITE_URL}/` },
  icons: { icon: "/images/logo.png", apple: "/images/logo.png" },
  openGraph: {
    title: "PARADELLE CHOCOLATES — Crafted for True Indulgence",
    description: "Crafted for true indulgence. Four signature bars, small-batch made.",
    url: `${SITE_URL}/`,
    siteName: "PARADELLE CHOCOLATES",
    images: [{ url: "/images/hero.webp" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PARADELLE CHOCOLATES — Crafted for True Indulgence",
    description: "Crafted for true indulgence. Four signature bars, small-batch made.",
    images: ["/images/hero.webp"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#291813",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="bg-ivory font-sans text-espresso antialiased">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
