'use client';

import { useEffect } from 'react';
import { registerServiceWorker, unregisterServiceWorker } from '@/lib/serviceWorker';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if service worker should be disabled
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
        console.log('✅ Registering Service Worker for offline support');
        registerServiceWorker();
      }
    }
  }, []);

  return null;
}
