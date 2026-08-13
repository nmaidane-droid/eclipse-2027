/* Éclipse 2027 — service worker
   Coquille applicative en cache d'abord, polices en réseau d'abord avec repli cache. */
const VERSION = 'ecl2027-v1';
const SHELL = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;

const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(FICHIERS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((n) => n !== SHELL && n !== RUNTIME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // polices Google : on tente le réseau, on garde une copie, on retombe sur le cache
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copie));
        return rep;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // navigation : cache d'abord, l'application est entièrement autonome
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((rep) => {
      const copie = rep.clone();
      caches.open(RUNTIME).then((c) => c.put(req, copie));
      return rep;
    }).catch(() => caches.match('./index.html')))
  );
});
