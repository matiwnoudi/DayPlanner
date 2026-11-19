/**
 * Offline Test
 *
 * Service Worker'ın precache'i doğru yapıp yapmadığını
 * ve uygulamanın çevrimdışı açıldığını test eder.
 *
 * ÖNEMLİ: HashRouter rotaları (/#/...) sayfayı yeniden yüklemez,
 * bu yüzden page.reload() ile gerçek offline yükleme test edilir.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Offline functionality', () => {
  test('should cache app shell and work offline in Chromium', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. İlk yükleme ve SW kayıt
    await page.goto(BASE_URL);

    // 2. Service Worker aktif ve sayfayı kontrol ediyor mu?
    const hasController = await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 },
    );
    expect(hasController).toBeTruthy();

    console.log('✓ Service Worker registered and controlling page');

    // SW state kontrolü
    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state || 'unknown';
    });
    expect(swState).toBe('activated');
    console.log(`  SW state: ${swState}`);

    // 3. Offline yap (SW aktifken)
    await context.setOffline(true);
    console.log('✓ Network set to offline');

    // 4a. Sayfayı reload ile yeniden yükle (gerçek offline test)
    await page.reload({ waitUntil: 'networkidle' });

    // Sayfa yüklenmeli
    const title = await page.title();
    expect(title).toBe('Rutin Test');

    // Görünür içerik kontrolü: başlık ve menü
    const appName = await page.locator('text=Rutin Test').first().isVisible();
    expect(appName).toBe(true);

    const navMenu = await page.locator('nav').count();
    expect(navMenu).toBeGreaterThan(0);

    console.log('  ✓ Page reloaded offline with visible content');

    // 4b. Yeni sayfa aç (context içinde) ve offline yükle
    const page2 = await context.newPage();
    await page2.goto(BASE_URL);

    const title2 = await page2.title();
    expect(title2).toBe('Rutin Test');

    const hasContent2 = await page2.locator('text=Rutin Test').first().isVisible();
    expect(hasContent2).toBe(true);

    console.log('  ✓ New page opened offline');

    await page2.close();

    // 5. NEGATİF KONTROL: SW kaldırınca offline yükleme BAŞARISIZ olmalı
    await context.setOffline(false); // Online yap
    await page.goto(BASE_URL); // Sayfaya geri dön

    // SW'yi kaldır ve cache'leri temizle
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.unregister();
      }
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    });

    console.log('  SW unregistered and caches cleared');

    // Offline yap
    await context.setOffline(true);

    // Reload dene - BAŞARISIZ olmalı
    let loadFailed = false;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      // Sayfa yüklendiyse (network error olmadıysa) test başarısız
      const hasError = await page.locator('text=Rutin Test').first().isVisible({ timeout: 1000 });
      if (!hasError) {
        loadFailed = true; // İçerik yüklenmemeli
      }
    } catch {
      // Timeout veya network error bekleniyor
      loadFailed = true;
    }

    expect(loadFailed).toBe(true);
    console.log('  ✓ Negative control: offline load FAILED without SW (as expected)');

    await context.close();
  });

  test('should cache app shell and work offline in WebKit (Safari engine)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. İlk yükleme ve SW kayıt
    await page.goto(BASE_URL);

    // 2. Service Worker aktif ve sayfayı kontrol ediyor mu?
    const hasController = await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 },
    );
    expect(hasController).toBeTruthy();

    console.log('✓ [WebKit] Service Worker registered and controlling page');

    // SW state kontrolü
    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state || 'unknown';
    });
    expect(swState).toBe('activated');
    console.log(`  [WebKit] SW state: ${swState}`);

    // 3. Offline yap (SW aktifken)
    await context.setOffline(true);
    console.log('✓ [WebKit] Network set to offline');

    // 4a. Sayfayı reload ile yeniden yükle (gerçek offline test)
    await page.reload({ waitUntil: 'networkidle' });

    // Sayfa yüklenmeli
    const title = await page.title();
    expect(title).toBe('Rutin Test');

    // Görünür içerik kontrolü
    const appName = await page.locator('text=Rutin Test').first().isVisible();
    expect(appName).toBe(true);

    const navMenu = await page.locator('nav').count();
    expect(navMenu).toBeGreaterThan(0);

    console.log('  ✓ [WebKit] Page reloaded offline with visible content');

    // 4b. Yeni sayfa aç (context içinde) ve offline yükle
    const page2 = await context.newPage();
    await page2.goto(BASE_URL);

    const title2 = await page2.title();
    expect(title2).toBe('Rutin Test');

    const hasContent2 = await page2.locator('text=Rutin Test').first().isVisible();
    expect(hasContent2).toBe(true);

    console.log('  ✓ [WebKit] New page opened offline');

    await page2.close();

    // 5. NEGATİF KONTROL: SW kaldırınca offline yükleme BAŞARISIZ olmalı
    await context.setOffline(false); // Online yap
    await page.goto(BASE_URL); // Sayfaya geri dön

    // SW'yi kaldır ve cache'leri temizle
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.unregister();
      }
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    });

    console.log('  [WebKit] SW unregistered and caches cleared');

    // Offline yap
    await context.setOffline(true);

    // Reload dene - BAŞARISIZ olmalı
    let loadFailed = false;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      const hasError = await page.locator('text=Rutin Test').first().isVisible({ timeout: 1000 });
      if (!hasError) {
        loadFailed = true;
      }
    } catch {
      loadFailed = true;
    }

    expect(loadFailed).toBe(true);
    console.log('  ✓ [WebKit] Negative control: offline load FAILED without SW (as expected)');

    await context.close();
  });
});
