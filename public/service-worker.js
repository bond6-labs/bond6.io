const VERSION='bond6-shell-v2';
const SHELL=['/','/zh/','/style.css','/reader.js','/manifest.webmanifest','/favicon.svg','/bond6-logo.png'];
const isNavigation=request=>request.mode==='navigate';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bond6-shell-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  // Subscription links contain private tokens and must never enter offline caches.
  if(new URL(event.request.url).pathname.startsWith('/email/'))return;
  if(isNavigation(event.request)){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok)caches.open(VERSION).then(cache=>cache.put(event.request,response.clone()));
      return response;
    }).catch(async()=>await caches.match(event.request)||await caches.match('/')||new Response('Bond6 is offline. Please reconnect and try again.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).pathname.match(/^\/(?:style\.css|reader\.js|manifest\.webmanifest|favicon\.svg|bond6-logo\.png)$/))caches.open(VERSION).then(cache=>cache.put(event.request,response.clone()));
    return response;
  })));
});
