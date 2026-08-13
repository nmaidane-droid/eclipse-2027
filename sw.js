/* Éclipse 2027 — service worker en stratégie RÉSEAU D'ABORD.
   Le cache ne sert que si le réseau est injoignable : une version déployée
   est visible dès le rechargement suivant, sans avoir à vider quoi que ce soit.
   Le fonctionnement hors connexion reste assuré — utile sur un cap le 2 août 2027. */
const VERSION = 'ecl-v8';
const CACHE = 'secours-' + VERSION;

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
    caches.open(CACHE)
      .then((c) => Promise.all(FICHIERS.map((f) => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.map((n) => (n !== CACHE ? caches.delete(n) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // polices Google : réseau d'abord, copie gardée, repli sur le cache
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(req, copie));
        return rep;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // pages et images : réseau d'abord, cache uniquement en secours
  e.respondWith(
    fetch(req).then((rep) => {
      const copie = rep.clone();
      caches.open(CACHE).then((c) => c.put(req, copie));
      return rep;
    }).catch(() => caches.match(req).then((hit) => {
      return hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
    }))
  );
});
