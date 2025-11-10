self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open('washroom-v2');
    self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open('washroom-v2');
    const base = new URL(self.registration.scope).pathname; // 例: "/washroom-pwa-v2/"
    await cache.addAll([
      base,
      base + 'index.html',
      base + 'app.js',
      base + 'manifest.webmanifest',
      base + 'icon-192.png',
      base + 'icon-512.png',
    ]);
  })());
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || '洗面所：登録のお願い';
  const body  = data.body  || '開始と終了を設定してください。';
  const base  = new URL(self.registration.scope).pathname;
  const url   = data.url || base;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon:  base + 'icon-192.png',
    badge: base + 'icon-192.png',
    data: { url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || new URL(self.registration.scope).pathname;
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type:'window' });
    for (const c of all) { c.focus(); c.navigate(url); return; }
    clients.openWindow(url);
  })());
});

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
