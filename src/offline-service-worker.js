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
        const rootPath = await idbKeyval.get('activeRootPath');
        if (rootPath) {
          // --- Native Tauri Mode ---

          // Construct asset URL with proper Windows normalization
          // 1. Replace backslashes with forward slashes
          const normalizedRoot = rootPath.replace(/\\/g, '/');

          // 2. Remove leading slash from path if present
          let relativePath = url.pathname;
          if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);

          // 3. Combine: asset://localhost/<Drive>:/<Path>/<File>
          // Note: encodeURIComponent would encoding ':' and '/' which breaks the protocol structure.
          // We assume standard URI encoding for the parts if needed, but for local paths, raw string often works best in Tauri asset scope.
          // Better safe: encodeURI handles spaces but leaves separators alone.
          const targetUrl = `asset://localhost/${encodeURI(normalizedRoot)}/${encodeURI(relativePath)}`;

          const msg = `[SW] Native Proxy: ${targetUrl}`;
          console.log(msg);
          self.clients.matchAll().then(c => c.forEach(cl => cl.postMessage({ type: 'LOG', msg })));

          try {
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            return response;
          } catch (err) {
            const errorMsg = `SW Error: ${err.message}\nPath: ${targetUrl}`;
            console.error(errorMsg);

            // Generate SVG with error text
            const svg = `
              <svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" style="background:#333; font-family:monospace; font-size:12px;">
                 <rect width="100%" height="100%" fill="#222" stroke="#f55" stroke-width="2"/>
                 <text x="10" y="20" fill="#f55" font-weight="bold">Service Worker Error</text>
                 <text x="10" y="40" fill="#fff">${err.message}</text>
                 <text x="10" y="60" fill="#ccc" font-size="10px">${targetUrl.substring(0, 50)}...</text>
              </svg>`;

            return new Response(svg, {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          }
        }

        // --- PWA Mode ---
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
            // Get MIME type from file or extensions
            const getMimeType = (name) => {
              if (name.endsWith('.pdf')) return 'application/pdf';
              if (name.endsWith('.txt')) return 'text/plain';
              if (name.endsWith('.html')) return 'text/html';
              if (name.endsWith('.css')) return 'text/css';
              if (name.endsWith('.js')) return 'application/javascript';
              if (name.endsWith('.json')) return 'application/json';
              if (name.endsWith('.png')) return 'image/png';
              if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
              if (name.endsWith('.gif')) return 'image/gif';
              if (name.endsWith('.svg')) return 'image/svg+xml';
              if (name.endsWith('.mp3')) return 'audio/mpeg';
              if (name.endsWith('.mp4')) return 'video/mp4';
              return null;
            };

            const mimeType = file.type || getMimeType(file.name) || 'application/octet-stream';

            return new Response(file, {
              headers: {
                'Content-Type': mimeType
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
