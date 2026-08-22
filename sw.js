// ============================================================
// sw.js – Service Worker unificado para REF Electrotecnia
// Soporta: index.html (raíz), admin.html (raíz), 201/form.html
// ============================================================

const CACHE_NAME = 'ref-electrotecnia-v2'; // Cambia la versión al actualizar
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/201/form.html',

  // Manifiestos (cada PWA usa el suyo)
  '/manifest-index.json',
  '/manifest-admin.json',
  '/201/manifest-form.json',

  // Íconos (compartidos)
  '/icon-192.png',
  '/icon-512.png',

  // Recursos externos (CDN, fuentes, librerías)
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',

  // Imágenes de la marca (las que uses en las páginas)
  'https://sebagsc2020.github.io/refelectrotecnia/images/logoref.png',
  'https://sebagsc2020.github.io/refelectrotecnia/images/icon-192.png',
  'https://sebagsc2020.github.io/refelectrotecnia/images/icon-512.png',
  'https://sebagsc2020.github.io/refelectrotecnia/images/firma.png'
];

// ============================================================
// INSTALACIÓN: cachear recursos
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierto, añadiendo recursos...');
        return cache.addAll(urlsToCache)
          .catch(err => {
            console.warn('[SW] Algunos recursos no se pudieron cachear:', err);
            // No falla la instalación por recursos que fallen
          });
      })
      .then(() => {
        console.log('[SW] Instalación completada, forzando activación');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVACIÓN: limpiar caches antiguos y tomar control
// ============================================================
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activación completada, tomando control de las páginas');
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH: estrategia Cache First, con fallback a red y offline
// ============================================================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Ignorar peticiones a Firebase (datos dinámicos) o a Google Analytics
  if (request.url.includes('firestore.googleapis.com') ||
      request.url.includes('identitytoolkit.googleapis.com') ||
      request.url.includes('google-analytics.com') ||
      request.url.includes('googletagmanager.com')) {
    // No cachear, ir directamente a la red
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Si está en cache, servirlo
          return cachedResponse;
        }

        // Si no está en cache, ir a la red
        return fetch(request).then(networkResponse => {
          // Si la respuesta es válida, clonarla y guardarla en cache para futuras visitas
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si falla la red y no hay cache, mostrar una página offline básica
          // (opcional: puedes crear una página offline.html y servirla aquí)
          return new Response(
            '<html><body><h1>Sin conexión</h1><p>No se pudo cargar la página. Verifica tu conexión a internet.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});
