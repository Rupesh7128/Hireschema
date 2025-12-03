
// global types for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Helper to log specific events
export const logEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, params);
    } else {
      // console.log(`[Analytics Dev]: ${eventName}`, params);
    }
  } catch (e) {
    console.warn("Analytics logging failed", e);
  }
};

// Helper to log page views (for SPA navigation)
export const logPageView = (pageName: string) => {
  try {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  } catch (e) {
    console.warn("Analytics page view failed", e);
  }
};
