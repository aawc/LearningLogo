export interface ServiceWorkerHandle {
  update: () => Promise<void>;
  getRegistration: () => ServiceWorkerRegistration | null;
  cleanup?: () => void;
}

export const UPDATE_CHECK_THROTTLE_MS = 60_000;

export function registerServiceWorker(
  onUpdateFound?: (waitingWorker?: ServiceWorker) => void
): ServiceWorkerHandle | void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Guard: Historical releases under /releases/ operate as live URLs only.
  // Never register a Service Worker for historical releases, and unregister any existing ones at this sub-scope.
  if (window.location.pathname.includes('/releases/')) {
    if (typeof navigator.serviceWorker.getRegistrations === 'function') {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            if (!reg.scope || reg.scope.includes('/releases/')) {
              reg.unregister().catch((err) => {
                console.warn('Failed to unregister historical release service worker:', err);
              });
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to get service worker registrations:', err);
        });
    } else if (typeof navigator.serviceWorker.getRegistration === 'function') {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg && (!reg.scope || reg.scope.includes('/releases/'))) {
            reg.unregister().catch((err) => {
              console.warn('Failed to unregister historical release service worker:', err);
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to get service worker registration:', err);
        });
    }
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

  let currentRegistration: ServiceWorkerRegistration | null = null;
  let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  let registered = false;
  let isCleanedUp = false;
  let listenersAttached = false;
  let lastFocusCheck = 0;
  let lastOnlineCheck = 0;

  const reportedWorkers = new WeakSet<object>();
  const notifyUpdate = (worker?: ServiceWorker) => {
    if (!worker || isCleanedUp) return;
    if (reportedWorkers.has(worker)) return;
    reportedWorkers.add(worker);
    if (onUpdateFound) {
      onUpdateFound(worker);
    }
  };

  const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
    if (isCleanedUp) return;
    const newWorker = registration.installing || registration.waiting;
    if (!newWorker) return;

    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyUpdate(newWorker);
      return;
    }

    newWorker.addEventListener('statechange', () => {
      if (isCleanedUp) return;
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        notifyUpdate(newWorker);
      }
    });
  };

  const onVisibilityChange = () => {
    if (isCleanedUp) return;
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      currentRegistration &&
      typeof currentRegistration.update === 'function'
    ) {
      currentRegistration.update().catch((err) => {
        console.warn('Visibility change Service Worker update check failed:', err);
      });
    }
  };

  const onFocusOrOnline = (event?: Event) => {
    if (isCleanedUp) return;
    const now = Date.now();
    const isOnline = event?.type === 'online';
    const lastCheck = isOnline ? lastOnlineCheck : lastFocusCheck;
    if (now - lastCheck < UPDATE_CHECK_THROTTLE_MS) {
      return;
    }
    if (isOnline) {
      lastOnlineCheck = now;
    } else {
      lastFocusCheck = now;
    }

    if (currentRegistration && typeof currentRegistration.update === 'function') {
      currentRegistration.update().catch((err) => {
        console.warn('Lifecycle Service Worker update check failed:', err);
      });
    }
  };

  const runRegistration = (): Promise<ServiceWorkerRegistration | null> => {
    if (isCleanedUp) {
      return Promise.resolve(null);
    }
    if (registered && registrationPromise) {
      return registrationPromise;
    }
    registered = true;

    registrationPromise = navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        currentRegistration = registration;

        if (isCleanedUp) {
          return registration;
        }

        if (typeof registration.update === 'function') {
          registration.update().catch((err) => {
            console.warn('Initial Service Worker update check failed:', err);
          });
        }

        if (!listenersAttached) {
          if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
          }
          if (typeof window !== 'undefined') {
            window.addEventListener('focus', onFocusOrOnline);
            window.addEventListener('online', onFocusOrOnline);
          }
          listenersAttached = true;
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          handleUpdateFound(registration);
        });

        return registration;
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
        return null;
      });

    return registrationPromise;
  };

  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    runRegistration();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('load', runRegistration);
  }

  const cleanup = () => {
    isCleanedUp = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('load', runRegistration);
    }
    if (listenersAttached) {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocusOrOnline);
        window.removeEventListener('online', onFocusOrOnline);
      }
      listenersAttached = false;
    }
  };

  const handle: ServiceWorkerHandle = {
    update: async () => {
      try {
        const reg = currentRegistration ?? (await (registrationPromise || runRegistration()));
        if (reg && typeof reg.update === 'function') {
          await reg.update();
        }
      } catch (err) {
        console.warn('Service Worker handle update failed:', err);
      }
    },
    getRegistration: () => currentRegistration,
    cleanup,
  };

  return handle;
}
