// Работа без сети: открыть последнюю загруженную версию страницы.
// Всегда сначала сеть (свежая версия), кэш — только если сети нет. Данные (/api/) и другие сайты не трогаем.
const CACHE = 'app-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: r.mode === 'navigate' })
    .then(m => m || (r.mode === 'navigate' ? caches.match(new URL('./', self.registration.scope).href) : Response.error()))));
});
