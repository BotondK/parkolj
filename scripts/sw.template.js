// Parkolj service worker: az app internet nélkül is betölt (mélygarázsban sincs térerő).
// A scripts/build-sw.mjs tölti ki a __VERSION__ és __PRECACHE__ helyeket a webes build után.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const APP = `parkolj-app-${VERSION}`;
const TILES = 'parkolj-tiles';
const MAX_TILES = 1500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('parkolj-app-') && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const trim = async () => {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) await c.delete(k);
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Az oldal maga: hálózat először (friss verzió), internet nélkül a tárolt példány
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(APP).then((c) => c.put(req, copy));
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(PRECACHE[0]))),
    );
    return;
  }

  // Saját fájlok (hash-elt JS, ikonok, zónaadat): tárolóból, ha nincs, hálózatról
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(APP).then((c) => c.put(req, copy));
            }
            return r;
          }),
      ),
    );
    return;
  }

  // Térkép (OpenFreeMap): a tárolt csempe azonnal, a háttérben frissítve; így a már látott környék offline is látszik
  if (url.hostname === 'tiles.openfreemap.org') {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((r) => {
            if (r.ok) c.put(req, r.clone()).then(() => Math.random() < 0.05 && trim());
            return r;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
  // Minden más (fiók, címkereső) a hálózatra megy, nem tároljuk
});

// Lejárati értesítés bezárt appnál (Web Push, supabase/functions/push-send). A tartalom titkosítva jön, a böngésző bontja ki.
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  const title = d.title || 'Parkolj';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      tag: d.tag || 'parkolj',
      renotify: true,
      icon: './apple-touch-icon.png',
      badge: './apple-touch-icon.png',
      data: { url: self.registration.scope },
    }),
  );
});

// Az értesítésre koppintva a már nyitott appra vált, vagy megnyitja
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
