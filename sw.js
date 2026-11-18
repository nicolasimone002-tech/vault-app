'use strict';
const CACHE='vault-pwa-midnight-dark-icons-v2';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/services/google.svg','./icons/services/amazon.svg','./icons/services/netflix.svg','./icons/services/instagram.svg','./icons/services/spotify.svg','./icons/services/apple.svg','./icons/services/microsoft.svg','./icons/services/facebook.svg','./icons/services/youtube.svg','./icons/services/github.svg','./icons/services/paypal.svg','./icons/services/linkedin.svg','./icons/services/dropbox.svg','./icons/services/tiktok.svg','./icons/services/whatsapp.svg','./icons/services/telegram.svg','./icons/services/x.svg'];
const ALLOWED=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('vault-pwa-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!ALLOWED.has(event.request.url))return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)))});

// Activation is requested only from a locked Vault session.
self.addEventListener('message',event=>{if(event.data&&event.data.type==='VAULT_APPLY_UPDATE')self.skipWaiting()});
