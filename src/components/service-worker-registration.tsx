'use client';

import { useEffect } from 'react';
import { registerServiceWorker, unregisterServiceWorker } from '@/lib/serviceWorker';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Clear old unregistration timestamps (older than 10 seconds)
      const swUnregistered = sessionStorage.getItem('sw-unregistered');
      if (swUnregistered && Date.now() - parseInt(swUnregistered) > 10000) {
        sessionStorage.removeItem('sw-unregistered');
      }

      // Check if service worker should be disabled (including temporary disable during token fetch)
      const urlParams = new URLSearchParams(window.location.search);
      const disableSW = urlParams.get('disable-sw') === 'true' || 
                       localStorage.getItem('disable-sw') === 'true';
      
      if (disableSW) {
        console.log('🚫 Service Worker disabled via parameter/localStorage');
        unregisterServiceWorker();
        return;
      }
      
      // Don't register during next dev, but do register for built static files
      const isNextDev = process.env.NODE_ENV === 'development' && window.location.port === '3000';
      
      if (!isNextDev) {
        // Delay service worker registration to allow critical token fetching to complete first
        const dashboardId = urlParams.get('dashboard');
        const hasStoredToken = dashboardId && (() => {
          try {
            const savedDashboards = localStorage.getItem("klt-dashboards");
            if (savedDashboards) {
              const parsed = JSON.parse(savedDashboards);
              return parsed.some((d: any) => d.id === dashboardId);
            }
          } catch (error) {
            console.error("Failed to check stored dashboards:", error);
          }
          return false;
        })();
        
        // If we have a stored token, register SW immediately
        // If we don't have a token and there's a dashboard ID, delay SW registration to prioritize token fetch
        const registrationDelay = (!hasStoredToken && dashboardId) ? 2000 : 100;
        
        setTimeout(() => {
          // Double-check that SW is still not disabled
          const currentlyDisabled = localStorage.getItem('disable-sw') === 'true';
          if (!currentlyDisabled) {
            console.log('✅ Registering Service Worker for offline support');
            registerServiceWorker();
          }
        }, registrationDelay);
      }
    }
  }, []);

  return null;
}
