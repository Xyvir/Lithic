const CACHE_NAME = 'lithic-v1'; // Renamed to match your project

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',                     // Root alias
        'index.html',             // The redirector
        'src/launcher.html',      // The NEW main app
        'src/lithic.html',
        'src/mstile-150x150.png', // Luancher Banner Icon     
        'manifest.json',
        'favicon.ico',            //  are still at root?
        'android-chrome-192x192.png',
        'android-chrome-512x512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

// Optional: Clean up old caches (like 'tiddlystow-001')
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});