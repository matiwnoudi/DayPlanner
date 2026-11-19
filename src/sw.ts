/**
 * Service Worker
 *
 * Uygulama kabuğunu önbelleğe alır ve çevrimdışı çalışmayı sağlar.
 * Push bildirimleri 9. adımda eklenecek.
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

// ============================================================================
// PRECACHE: Uygulama kabuğunu önbelleğe al
// ============================================================================

// Vite build sırasında __WB_MANIFEST yerine precache listesi inject edilir
precacheAndRoute(self.__WB_MANIFEST);

// ============================================================================
// SPA NAVIGATION FALLBACK
// ============================================================================

// Tüm navigasyon istekleri için index.html döndür
// Not: HashRouter kullanıyoruz, bu yüzden tüm URL'ler aslında /#/... şeklinde
// Ancak bazı durumlarda doğrudan /hatirlatmalar gibi bir URL açılabilir,
// bu durumda index.html döndürmek gerekir

// Base-aware: GitHub Pages gibi alt yollar için doğru URL
const indexUrl = new URL('./index.html', self.location.origin + import.meta.env.BASE_URL).href;
const handler = createHandlerBoundToURL(indexUrl);
const navigationRoute = new NavigationRoute(handler, {
  // Navigasyon isteklerini yakala
  denylist: [
    // API çağrıları veya diğer özel rotalar varsa buraya ekle
    // Şimdilik boş
  ],
});
registerRoute(navigationRoute);

// ============================================================================
// ACTIVATE: Yeni service worker aktif olunca
// ============================================================================

self.addEventListener('activate', (event) => {
  // Tüm istemcileri hemen kontrol altına al (yeni SW aktif olur)
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// MESSAGE: Uygulama tarafından gönderilen mesajları dinle
// ============================================================================

self.addEventListener('message', (event) => {
  // SKIP_WAITING mesajı gelirse yeni SW'yi hemen aktif et
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================================
// PUSH & NOTIFICATION HANDLERs (9. adımda eklenecek)
// ============================================================================

// TODO: 9. adımda push event handler eklenecek
// - event.data.json() ile reminderId çekilecek
// - IndexedDB'den (schema.ts import) mesaj okunacak
// - showNotification() çağrılacak (her push için zorunlu, iOS)

// TODO: 9. adımda notificationclick handler eklenecek
// - Bildirime tıklanınca uygulamayı aç veya odaklan
// - İlgili sayfaya yönlendir (#/hatirlatmalar?id=...)
