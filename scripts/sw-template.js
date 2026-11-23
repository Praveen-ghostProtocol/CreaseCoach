const cacheName = `creasecoach-${'__VERSION__'}`;
const assets = "__ASSETS__";

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets.map(url => new Request(new URL(url,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('creasecoach-') && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(new URL('./index.html',self.registration.scope))));
    return;
  }
  event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request)) || fetch(request)));
});
