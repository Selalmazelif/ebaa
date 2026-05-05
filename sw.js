const CACHE_NAME = 'eba-v3.1';
const STATIC_ASSETS = [
  '/panel.css',
  '/auth-utils.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. API, Socket, ve HTML sayfaları: HER ZAMAN ŞEBEKE (NETWORK ONLY)
  // Bu sayede "Refresh" (F5) yapıldığında her zaman güncel veri gelir.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    event.request.method !== 'GET' ||
    url.pathname.endsWith('.html') ||
    !url.pathname.includes('.') // HTML sayfaları bazen uzantısız çağrılabilir
  ) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // 2. Statik Dosyalar (CSS, JS, Resimler): NETWORK-FIRST STRATEJİSİ
  // Önce şebekeden dene, hata varsa (offline) önbellekten getir.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
