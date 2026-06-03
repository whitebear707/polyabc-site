const CACHE_NAME = 'polyabc-v2';
const ASSETS = [
  '/polyabc-site/',
  '/polyabc-site/index.html',
  '/polyabc-site/LOGO.png',
  '/polyabc-site/nosee.png',
  '/polyabc-site/noseeandhear.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // Activate immediately — don't wait for old SW to die
});

self.addEventListener('activate', e => {
  // Clear old caches so the broken v1 SW is gone
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle same-origin requests (GitHub Pages assets)
  // Never intercept backend API calls or socket.io — let them go straight to the network
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
