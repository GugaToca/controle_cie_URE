/* ================= SERVICE WORKER — URE SJR Preto ================= */
/* Para forçar atualização do cache, incremente a versão: ure-v2, ure-v3... */

const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'masct_ure.png',
  'manifest.json'
];

const CACHE_NAME = 'ure-v2';

/* ---------- INSTALL — cacheia todos os arquivos estáticos ---------- */

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE — remove caches de versões antigas ---------- */

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH — Cache First para arquivos locais ---------- */

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Ignora chamadas para Firebase / Google — o Firestore cuida do próprio cache
  const externas = ['firestore.googleapis.com', 'googleapis.com', 'gstatic.com',
                    'firebase.com', 'firebaseio.com', 'firebaseapp.com',
                    'google.com', 'identitytoolkit.googleapis.com'];

  if (externas.some(h => url.hostname.includes(h))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Serve do cache e atualiza em segundo plano (stale-while-revalidate)
        const revalidate = fetch(e.request)
          .then(fresh => {
            caches.open(CACHE_NAME).then(c => c.put(e.request, fresh.clone()));
            return fresh;
          })
          .catch(() => {});

        return cached;
      }

      // Não está no cache — busca na rede e cacheia
      return fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Offline e não em cache — retorna index.html para navegação
          if (e.request.destination === 'document') {
            return caches.match('index.html');
          }
        });
    })
  );
});
