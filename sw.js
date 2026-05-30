const CACHE_NAME = 'polyabc-v1';
const ASSETS = [
  '/polyabc-site/',
  '/polyabc-site/index.html',
  '/polyabc-site/LOGO.png',
  '/polyabc-site/nosee.png',
  '/polyabc-site/noseeandhear.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
