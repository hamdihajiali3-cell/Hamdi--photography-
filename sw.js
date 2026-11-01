const CACHE='hamdi-studio-pwa-v4';
const CORE=[
  './studio.html',
  './css/studio.css',
  './js/studio.js',
  './manifest.webmanifest',
  './icons/hamdi-studio.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);

  if(request.method!=='GET'||url.origin!==self.location.origin)return;

  // Keep navigation fallback separate from assets: never return HTML for a missing JS/CSS/image.
  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(async()=>{
        return (await caches.match(request))
          || (await caches.match('./studio.html'))
          || new Response('الصفحة غير متاحة دون اتصال.',{
            status:503,
            headers:{'Content-Type':'text/plain; charset=utf-8'}
          });
      })
    );
    return;
  }

  // Cache-first for same-origin static assets; update the cache in the background when online.
  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      });
      return cached || network.catch(()=>new Response('',{status:504,statusText:'Offline'}));
    })
  );
});
