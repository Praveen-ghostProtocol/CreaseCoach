const version = '__VERSION__';
const cacheName = `creasecoach-${version}`;
const assets = "__ASSETS__";

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const requests = assets.map(asset => {
      const url = new URL(asset,self.registration.scope);
      url.searchParams.set('cc-release',version);
      return new Request(url,{cache:'reload'});
    });
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
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
    event.respondWith(caches.open(cacheName).then(async cache =>
      (await cache.match(new URL('./index.html',self.registration.scope),{ignoreSearch:true})) || fetch(request)));
    return;
  }
  event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request,{ignoreSearch:true})) || fetch(request)));
});
