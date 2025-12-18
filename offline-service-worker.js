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

          // Try to resolve file in the handle
          const parts = path.split('/').filter(p => p.length > 0 && p !== '.');
          console.log('[SW] Path parts:', parts);

          let currentHandle = dirHandle;

          // HEURISTIC: If strict lookup fails, try stripping the first segment (e.g. 'src/') 
          // in case the mount point is deeper than the URL implies.
          // For now, let's just log traversal.

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            try {
              if (i === parts.length - 1) {
                // File check
                console.log('[SW] Looking for file:', part);
                const fileHandle = await currentHandle.getFileHandle(part);
                const file = await fileHandle.getFile();
                console.log('[SW] Found file!', part, file.size);
                return new Response(file, {
                  headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                  }
                });
              } else {
                // Directory check
                console.log('[SW] Descending into dir:', part);
                currentHandle = await currentHandle.getDirectoryHandle(part);
              }
            } catch (lookupErr) {
              console.log('[SW] Traversal failed at part:', part, lookupErr.name);
              // If this is the first part, maybe we are "inside" the folder already?
              // e.g. URL is /src/foo.png but handle IS 'src'.
              // Try to look for the *rest* of the path from the root?
              // This is complex to guess correctly without more info.
              throw lookupErr;
            }
          }
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
