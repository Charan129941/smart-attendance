self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('smart-attendance-v1').then((cache) => {
      return cache.addAll(['/']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
