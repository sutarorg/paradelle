"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const validMeasurementId = measurementId && /^G-[A-Z0-9]+$/i.test(measurementId) ? measurementId : undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!validMeasurementId || !pathname) return;
    const currentPath = `${pathname}${window.location.search}`;
    if (lastPath.current === null) {
      lastPath.current = currentPath;
      return;
    }
    if (lastPath.current === currentPath) return;

    lastPath.current = currentPath;
    window.gtag?.("event", "page_view", {
      page_path: currentPath,
      page_location: window.location.href,
    });
  }, [pathname]);

  if (!validMeasurementId) return null;

  return (
    <>
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${validMeasurementId}');`,
        }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${validMeasurementId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
