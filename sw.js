'use strict';
// 僅快取此應用程式的靜態檔案，不儲存報修清單、表單或 Supabase API 回應。
// 更新靜態檔案時遞增版本；使用 scope 區隔同網域下的其他 GitHub Pages 專案。
const PREFIX = `repair-pwa:${self.registration.scope}:`;
const CACHE = `${PREFIX}v1`;
const CORE = ['./index.html', './style.css', './app.js', './config.js', './pwa.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
const coreUrls = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // CDN 暫時不可用時仍可安裝外殼，連線後再次載入會補上程式庫。
    try { await cache.add(new Request(CDN, { mode: 'cors' })); } catch { /* 保留離線外殼 */ }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const home = new URL('./', self.registration.scope);
  // 只為應用首頁提供導覽 fallback，避免把其他文件誤回傳成首頁。
  if (request.mode === 'navigate' && url.origin === home.origin && (url.pathname === home.pathname || url.pathname === `${home.pathname}index.html`)) {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch { return (await caches.open(CACHE)).match(new URL('./index.html', home).href); }
    })());
  } else if (coreUrls.has(url.href) || url.href === CDN) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && url.href === CDN) await cache.put(request, response.clone());
      return response;
    })());
  }
});
