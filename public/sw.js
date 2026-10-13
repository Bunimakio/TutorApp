// Service Worker para TutorApp - Offline First
const CACHE_NAME = 'tutorapp-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const CACHE_STRATEGIES = {
  // Cache first para assets estáticos
  static: 'cache-first',
  // Network first para API calls
  api: 'network-first',
  // Stale while revalidate para HTML
  html: 'stale-while-revalidate',
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar same-origin
  if (url.origin !== location.origin) {
    return;
  }

  // API calls - Network first
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML pages - Stale while revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets - Cache first
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Background sync para cola de operaciones offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    // Obtener clientes y notificarles que sincronicen
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_NOW' });
    });
  } catch (error) {
    console.error('[SW] Error en background sync:', error);
  }
}

// Push notifications (futuro)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Cerrar' },
      ],
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open') {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

console.log('[SW] Service Worker cargado');