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
  applicationName: "Paradelle Chocolates",
  creator: "Paradelle Chocolates",
  publisher: "Paradelle Chocolates",
  title: {
    default: "Premium Chocolates Online in India | Paradelle Chocolates",
    template: "%s | Paradelle Chocolates",
  },
  description:
    "Explore Paradelle Chocolates, a premium chocolate brand featuring Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled chocolate bars.",
  keywords: [
    "Paradelle Chocolates",
    "premium chocolates India",
    "luxury chocolate brand",
    "chocolate bars online India",
    "premium chocolate bars",
    "buy chocolate online",
    "milk chocolate bar",
    "dark chocolate bar",
  ],
  alternates: { canonical: `${SITE_URL}/` },
  icons: {
    icon: { url: "/images/logo.png", type: "image/png", sizes: "500x500" },
    shortcut: { url: "/images/logo.png", type: "image/png", sizes: "500x500" },
    apple: { url: "/images/logo.png", type: "image/png", sizes: "500x500" },
  },
  openGraph: {
    title: "Premium Chocolates Online in India | Paradelle Chocolates",
    description:
      "Explore Paradelle Chocolates, a premium chocolate brand featuring Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled chocolate bars.",
    url: `${SITE_URL}/`,
    siteName: "Paradelle Chocolates",
    images: [{ url: "/images/hero.webp" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Chocolates Online in India | Paradelle Chocolates",
    description:
      "Explore Paradelle Chocolates, a premium chocolate brand featuring Signature Milk, Signature Dark, Crunchy Nut and Pistachio Filled chocolate bars.",
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
