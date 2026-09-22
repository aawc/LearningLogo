export function registerServiceWorker(onUpdateFound?: (waitingWorker?: ServiceWorker) => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (!import.meta.env.PROD) {
    if (typeof navigator.serviceWorker.getRegistrations === 'function') {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch((err) => {
              console.warn('Failed to unregister service worker:', err);
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to get service worker registrations:', err);
        });
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        if (registration.waiting && onUpdateFound) {
          onUpdateFound(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (onUpdateFound) {
                onUpdateFound(newWorker);
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
  });
}
