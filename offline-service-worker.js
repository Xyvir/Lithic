/* 
   idb-keyval minified standard implementation 
   (Required to access the directory handle from IndexedDB)
*/
let idbKeyval = (function (exports) {
  'use strict';
  class Store {
    constructor(dbName = 'keyval-store', storeName = 'keyval') {
      this.storeName = storeName;
      this._dbp = new Promise((resolve, reject) => {
        const openreq = indexedDB.open(dbName, 1);
        openreq.onerror = () => reject(openreq.error);
        openreq.onsuccess = () => resolve(openreq.result);
        openreq.onupgradeneeded = () => {
          openreq.result.createObjectStore(storeName);
        };
      });
    }
    _withIDBStore(type, callback) {
      return this._dbp.then(db => new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, type);
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(transaction.error);
        callback(transaction.objectStore(this.storeName));
      }));
    }
  }
  let store;
  function getDefaultStore() {
    if (!store) store = new Store();
    return store;
  }
  function get(key, store = getDefaultStore()) {
    let req;
    return store._withIDBStore('readonly', store => {
      req = store.get(key);
    }).then(() => req.result);
  }
  exports.Store = Store;
  exports.get = get;
  return exports;
}({}));

/* Service Worker Logic */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Filter out non-local/http requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    (async () => {
      // 1. Try to serve from local directory handle (if active)
      try {
        const dirHandle = await idbKeyval.get('activeDirHandle');
        console.log('[SW] Checking for activeDirHandle:', !!dirHandle, 'URL:', url.pathname);

        if (dirHandle) {
          // Remove leading slash if present
          let path = url.pathname;
          if (path.startsWith('/')) path = path.slice(1);

          // Try to resolve file in the handle with fallback support
          // Problem: URL might be /src/states.png but mounted handle IS 'src', so file is at root.
          // Solution: Try full path ['src', 'states.png']. If fail, try ['states.png'].

          const fullParts = path.split('/').filter(p => p.length > 0 && p !== '.');
          console.log('[SW] Initial path parts:', fullParts);

          async function tryResolve(handle, parts) {
            let current = handle;
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (i === parts.length - 1) {
                // Expect file
                const fileHandle = await current.getFileHandle(part);
                return await fileHandle.getFile();
              } else {
                // Expect directory
                current = await current.getDirectoryHandle(part);
              }
            }
            throw new Error('End of path without file');
          }

          let file = null;
          // Loop: try full path, then shift(), then shift()...
          // Limit to preventing excessive recursion if path is huge, but usually it's short.

          let partsToTry = [...fullParts];
          while (partsToTry.length > 0) {
            try {
              console.log('[SW] Trying resolve with:', partsToTry);
              file = await tryResolve(dirHandle, partsToTry);
              console.log('[SW] Success resolving:', partsToTry);
              break; // Found it!
            } catch (e) {
              // console.log('[SW] Failed resolve:', partsToTry, e.name);
              partsToTry.shift(); // Remove first segment and retry
            }
          }

          if (file) {
            return new Response(file, {
              headers: {
                'Content-Type': file.type || 'application/octet-stream'
              }
            });
          }
          console.log('[SW] Could not resolve file in local handle after all attempts.');

        }
      } catch (err) {
        // Not found locally or permission error, proceed to network/cache
        console.log('[SW] Local resolution skipped/failed:', err);
      }

      // 2. Cache/Network Fallback (Original Logic)
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;

      try {
        return await fetch(event.request);
      } catch (error) {
        console.log('Offline fetch failed for:', event.request.url);
        return new Response('Offline', { status: 408, statusText: 'Offline' });
      }
    })()
  );
});
