self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response; // Hit found in cache
      }

      // If not in cache, try to fetch, but catch errors!
      return fetch(event.request).catch(function(error) {
        // If we are here, we are offline AND the file wasn't in cache.
        console.log('Offline fetch failed for:', event.request.url);
        
        // Return a plain 408 (Timeout) or 404 so the browser stops waiting
        return new Response('Offline', { 
           status: 408, 
           statusText: 'Offline' 
        });
      });
    })
  );
});
