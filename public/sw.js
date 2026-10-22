/**
 * AI بہشتی زیور - سروس ورکر (Service Worker)
 * PWA آف لائن سپورٹ اور تیز رفتار کیشنگ
 */

const CACHE_NAME = 'bz-ai-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
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

// فیچ ایونٹ: نیٹ ورک پہلے، اگر آف لائن ہو تو کیشے
self.addEventListener('fetch', (event) => {
  // API کالز کے لیے ہمیشہ نیٹ ورک سے تازہ ترین ڈیٹا حاصل کریں
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          found: false,
          refusal: "آپ فی الحال آف لائن ہیں۔ تازہ سوالات کے لیے انٹرنیٹ سے رابطہ درکار ہے۔"
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // اسٹیٹک ریسورسز (CSS/JS/Icons/HTML)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // بیک گراؤنڈ میں تازہ کاری کریں
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
