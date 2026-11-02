// Работа без сети и на плохой сети (02.11). Данные (/api/) и другие сайты не трогаем.
// Страница и файлы без версии: сначала сеть — свежая версия; сеть молчит дольше WAIT, а в кэше есть — отдаём из кэша,
// ответ сети всё равно докачивается в кэш (свежая версия — при следующем открытии). Сети нет совсем — кэш, для страницы — запасная.
// Файлы с версией в адресе (?v=<хеш содержимого>, ставит сборка — version_assets) не меняются: сразу из кэша, старые версии того же файла чистим.
const CACHE = 'app-v1', WAIT = 3000;
let slowUntil = 0;   // страница пришла из кэша по таймауту — 30 с остальное тоже сразу из кэша (иначе каждый файл ждал бы ещё WAIT)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
const keep = (r, res) => caches.open(CACHE).then(async c => {
  await c.put(r, res);
  const u = new URL(r.url);
  if (!u.searchParams.has('v')) return;
  for (const k of await c.keys()) { const ku = new URL(k.url); if (ku.pathname === u.pathname && ku.search !== u.search) await c.delete(k); }
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.includes('/api/')) return;
  const nav = r.mode === 'navigate', fixed = u.searchParams.has('v');
  const fromNet = () => {
    const net = fetch(r);
    e.waitUntil(net.then(res => { if (res.ok && res.type === 'basic') return keep(r, res.clone()); }).catch(() => {}));
    return net;
  };
  if (fixed) { e.respondWith(caches.match(r).then(m => m || fromNet())); return; }
  const net = fromNet();
  const wait = !nav && Date.now() < slowUntil ? 0 : WAIT;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = x => { if (x && !done) { done = true; clearTimeout(t); resolve(x); } };
    const t = setTimeout(() => caches.match(r, { ignoreSearch: nav }).then(m => { if (m && nav) slowUntil = Date.now() + 30000; give(m); }), wait);
    net.then(res => { if (nav && !done) slowUntil = 0; give(res); }, () => caches.match(r, { ignoreSearch: nav })
      .then(m => m || (nav ? caches.match(new URL('./', self.registration.scope).href) : null))
      .then(m => { if (m) give(m); else if (!done) { done = true; clearTimeout(t); resolve(Response.error()); } }));
  }));
});
