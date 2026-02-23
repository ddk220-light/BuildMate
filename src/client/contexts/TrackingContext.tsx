/**
 * Tracking Context
 *
 * Provides Google Tag Manager and Facebook Pixel integration.
 * Configure GTM_ID and FB_PIXEL_ID environment variables to enable tracking.
 *
 * Environment variables:
 * - VITE_GTM_ID: Google Tag Manager container ID (e.g., "GTM-XXXXXXX")
 * - VITE_FB_PIXEL_ID: Facebook Pixel ID (e.g., "1234567890")
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";

// Tracking event types for conversion tracking
export type TrackingEvent =
  | "build_started"      // User starts a new build
  | "build_step"         // User reaches a step (step number in params)
  | "build_completed"    // User completes a build
  | "build_exported"     // User exports/downloads a build
  | "build_shared"       // User shares a build
  | "build_cloned";      // User clones a shared build

interface TrackingParams {
  buildId?: string;
  step?: number;
  category?: string;
  totalValue?: number;
  currency?: string;
  [key: string]: string | number | boolean | undefined;
}

interface TrackingContextValue {
  trackEvent: (event: TrackingEvent, params?: TrackingParams) => void;
  trackPageView: (pagePath: string, pageTitle?: string) => void;
  isEnabled: boolean;
}

const TrackingContext = createContext<TrackingContextValue | null>(null);

// Get IDs from environment variables
const GTM_ID = import.meta.env.VITE_GTM_ID || "";
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID || "";

// Extend window type for GTM dataLayer and FB pixel
declare global {
  interface Window {
    dataLayer: unknown[];
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const isEnabled = Boolean(GTM_ID || FB_PIXEL_ID);

  // Initialize Google Tag Manager
  useEffect(() => {
    if (!GTM_ID) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];

    // GTM script injection
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

    // Add gtm.js to dataLayer
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });

    document.head.appendChild(script);

    // Add noscript iframe
    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    return () => {
      script.remove();
      noscript.remove();
    };
  }, []);

  // Initialize Facebook Pixel
  useEffect(() => {
    if (!FB_PIXEL_ID) return;

    // Facebook Pixel base code
    const fbq = function(...args: unknown[]) {
      if (window.fbq) {
        // @ts-expect-error FB pixel uses apply pattern
        window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, args) : window.fbq.queue.push(args);
      }
    };

    if (!window.fbq) {
      window.fbq = fbq as typeof window.fbq;
      // @ts-expect-error FB pixel internal property
      window.fbq.push = fbq;
      // @ts-expect-error FB pixel internal property
      window.fbq.loaded = true;
      // @ts-expect-error FB pixel internal property
      window.fbq.version = "2.0";
      // @ts-expect-error FB pixel internal property
      window.fbq.queue = [];
    }

    // Load FB pixel script
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    // Initialize pixel
    window.fbq("init", FB_PIXEL_ID);
    window.fbq("track", "PageView");

    return () => {
      script.remove();
    };
  }, []);

  // Track custom events
  const trackEvent = useCallback((event: TrackingEvent, params?: TrackingParams) => {
    // Google Tag Manager / GA4 event
    if (GTM_ID && window.dataLayer) {
      const gtmEvent: Record<string, unknown> = {
        event: event,
        ...params,
      };
      window.dataLayer.push(gtmEvent);
    }

    // Facebook Pixel event
    if (FB_PIXEL_ID && window.fbq) {
      // Map our events to FB standard events where applicable
      switch (event) {
        case "build_started":
          window.fbq("track", "InitiateCheckout", {
            content_category: params?.category,
            value: params?.totalValue,
            currency: params?.currency || "USD",
          });
          break;
        case "build_completed":
          window.fbq("track", "Purchase", {
            content_category: params?.category,
            value: params?.totalValue,
            currency: params?.currency || "USD",
          });
          break;
        case "build_shared":
          window.fbq("track", "Lead", {
            content_category: params?.category,
          });
          break;
        default:
          // Custom event for other tracking
          window.fbq("trackCustom", event, params);
      }
    }
  }, []);

  // Track page views
  const trackPageView = useCallback((pagePath: string, pageTitle?: string) => {
    // Google Tag Manager page view
    if (GTM_ID && window.dataLayer) {
      window.dataLayer.push({
        event: "page_view",
        page_path: pagePath,
        page_title: pageTitle,
      });
    }

    // Facebook Pixel page view
    if (FB_PIXEL_ID && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, []);

  return (
    <TrackingContext.Provider value={{ trackEvent, trackPageView, isEnabled }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error("useTracking must be used within a TrackingProvider");
  }
  return context;
}
