/**
 * AI بہشتی زیور - سروس ورکر (Service Worker)
 * PWA آف لائن سپورٹ اور تیز رفتار کیشنگ
 */

const CACHE_NAME = 'bz-ai-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-512.png',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.png'
];

// انسٹالیشن ایونٹ: بنیادی فائلیں کیشے میں محفوظ کریں
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ایکٹیویشن ایونٹ: پرانے کیشے کو صاف کریں
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// فیچ ایونٹ: کیشے فرسٹ اور نیٹ ورک فال بیک حکمتِ عملی
self.addEventListener('fetch', (event) => {
  // API کالز کے لیے ہمیشہ نیٹ ورک استعمال کریں
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'آف لائن حالت',
          message: 'انٹرنیٹ کنکشن دستیاب نہیں ہے۔ براہ کرم انٹرنیٹ بحال ہونے پر دوبارہ کوشش کریں۔'
        }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      })
    );
    return;
  }

  // اسٹیٹک اثاثہ جات کے لیے کیشے فرسٹ
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // بیک گراؤنڈ میں کیشے اپ ڈیٹ کریں (Stale While Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
