self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open('washroom-v2');
    await cache.addAll(['/','/index.html','/app.js','/manifest.webmanifest','/icon-192.png','/icon-512.png']);
  })());
  self.skipWaiting();
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    try { return await fetch(event.request); }
    catch (e) {
      const cache = await caches.open('washroom-v2');
      const cached = await cache.match(event.request, {ignoreSearch:true});
      if (cached) return cached;
      return new Response('オフラインです', {status:503});
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || '洗面所：登録のお願い';
  const body = data.body || '開始と終了を設定してください。';
  const url = data.url || '/';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const all = await clients.matchAll({type:'window'});
    for (const c of all) { c.focus(); c.navigate(url); return; }
    clients.openWindow(url);
  })());
});
