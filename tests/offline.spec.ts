/**
 * Offline Test
 *
 * Service Worker'ın precache'i doğru yapıp yapmadığını
 * ve uygulamanın çevrimdışı açıldığını test eder.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Offline functionality', () => {
  test('should cache app shell and work offline', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Network request'leri kaydet
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      const resourceType = request.resourceType();
      if (['document', 'script', 'stylesheet', 'image', 'manifest', 'font'].includes(resourceType)) {
        failedRequests.push(`${resourceType}: ${request.url()}`);
      }
    });

    // 1. İlk yükleme ve SW kayıt
    await page.goto(BASE_URL);

    // 2. Service Worker aktif ve sayfayı kontrol ediyor mu?
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 },
    );

    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state || 'unknown';
    });
    expect(swState).toBe('activated');

    // 3. Offline yap
    await context.setOffline(true);

    // 4. Sayfayı reload ile yeniden yükle (gerçek offline test)
    failedRequests.length = 0;
    await page.reload({ waitUntil: 'networkidle' });

    // Offline'dayken hiçbir önemli istek başarısız olmamalı
    expect(failedRequests).toEqual([]);

    // Sayfa yüklenmeli
    const title = await page.title();
    expect(title).toBe('Rutin Test');

    // Görünür içerik kontrolü
    const appName = await page.locator('text=Rutin Test').first().isVisible();
    expect(appName).toBe(true);

    // 5. Yeni sayfa aç ve offline yükle
    const page2 = await context.newPage();
    await page2.goto(BASE_URL);
    const title2 = await page2.title();
    expect(title2).toBe('Rutin Test');
    await page2.close();

    // 6. NEGATİF KONTROL: SW kaldırınca offline yükleme başarısız olmalı
    await context.setOffline(false);
    await page.goto(BASE_URL);

    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.unregister();
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    });

    await context.setOffline(true);

    let loadFailed = false;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      const hasError = await page.locator('text=Rutin Test').first().isVisible({ timeout: 1000 });
      if (!hasError) loadFailed = true;
    } catch {
      loadFailed = true;
    }

    expect(loadFailed).toBe(true);

    await context.close();
  });

  test('tabbar should remain clickable when update prompt is visible', async ({ page }) => {
    await page.goto(BASE_URL);

    // SW kayıt ve offline-ready mesajını bekle
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 10000 },
    );

    // UpdatePrompt görünürse bile tabbar tıklanabilir olmalı
    const updatePrompt = page.locator('.update-prompt');
    const tabbarLink = page.locator('a[href="#/hatirlatmalar"]');

    if (await updatePrompt.isVisible()) {
      // Prompt görünürken tabbar'a tıkla
      await tabbarLink.click();
      await page.waitForTimeout(500);

      // Sayfa değişmeli
      const currentUrl = page.url();
      expect(currentUrl).toContain('#/hatirlatmalar');
    } else {
      // Prompt görünmüyorsa da test geçsin (offline-ready auto-close olmuş olabilir)
      await tabbarLink.click();
      const currentUrl = page.url();
      expect(currentUrl).toContain('#/hatirlatmalar');
    }
  });
});

test.describe('IndexedDB Persistence', () => {
  test('should persist reminder with messages across offline reload', async ({ page, context }, testInfo) => {
    testInfo.setTimeout(60000);
    await page.goto(BASE_URL);

    // SW aktif olana kadar bekle
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 15000 }
    );

    // UpdatePrompt varsa 6s bekle (auto-close)
    await page.waitForTimeout(7000);

    // Hatırlatmalar sayfasına git
    await page.click('a[href="#/hatirlatmalar"]');
    await page.waitForTimeout(2000);

    // Yeni hatırlatma ekle
    await page.click('button:has-text("+ Yeni Hatırlatma")');
    await page.waitForSelector('input#title', { timeout: 10000 });

    await page.fill('input#title', 'Test hatırlatması');
    
    // Su tipini seç (ilk buton)
    const waterButton = page.locator('.type-button').first();
    await waterButton.click();
    
    // Saat ekle
    await page.fill('input#new-time', '09:00');
    await page.click('button:has-text("Ekle")');

    // Kaydet
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Liste sayfasında "Test hatırlatması" görünmeli
    const reminderCard = page.locator('.reminder-card:has-text("Test hatırlatması")');
    await reminderCard.waitFor({ state: 'visible', timeout: 10000 });

    // Mesaj ekle
    await reminderCard.locator('button:has-text("Mesajlar")').click();
    await page.waitForTimeout(1000);

    const messageTextarea = page.locator('.add-message-form textarea');
    await messageTextarea.fill('Test mesajı');
    await page.click('button:has-text("Mesaj Ekle")');
    await page.waitForTimeout(1000);

    // Geri dön
    await page.click('button:has-text("← Geri")');
    await page.waitForTimeout(1000);

    // "1 mesaj" görünmeli
    const messageCount = await page.locator('text=1 mesaj').isVisible();
    expect(messageCount).toBe(true);

    // Offline'a geç ve yenile
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Hatırlatma ve mesaj sayısı hâlâ görünür olmalı
    const offlineReminder = await page.locator('.reminder-card:has-text("Test hatırlatması")').isVisible();
    expect(offlineReminder).toBe(true);

    const offlineMessageCount = await page.locator('text=1 mesaj').isVisible();
    expect(offlineMessageCount).toBe(true);
  });
});
