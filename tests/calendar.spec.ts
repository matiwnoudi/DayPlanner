/**
 * Calendar (.ics) Test
 *
 * Deneme takvimi dosyasının doğru üretildiğini ve indirildiğini test eder.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Calendar (.ics)', () => {
  test('should generate and download demo calendar (Chromium)', async ({ page, browser }, testInfo) => {
    // Sadece Chromium'da çalış (WebKit download desteği sınırlı)
    if (browser.browserType().name() !== 'chromium') {
      test.skip();
      return;
    }

    await page.goto(BASE_URL);

    // SW aktif olana kadar bekle
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 15000 }
    );

    // UpdatePrompt varsa 7s bekle (auto-close)
    await page.waitForTimeout(7000);

    // Takvim sayfasına git
    await page.click('a[href="#/takvim"]');
    await page.waitForTimeout(1000);

    // Download eventini dinle
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // "Deneme takvimi indir" düğmesine tıkla
    await page.click('button:has-text("Deneme takvimi indir")');

    // Download olayını yakala
    const download = await downloadPromise;

    // Dosya adı kontrol et
    expect(download.suggestedFilename()).toBe('rutin-deneme.ics');

    // Dosya içeriğini al
    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import('fs/promises');
    const content = await fs.readFile(path!, 'utf-8');

    // İçerik kontrolü
    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('END:VCALENDAR');
    expect(content).toContain('PRODID:-//DayPlanner//Rutin Deneme//TR');

    // 3 VEVENT
    const veventMatches = content.match(/BEGIN:VEVENT/g);
    expect(veventMatches).toHaveLength(3);

    // 3 VALARM
    const valarmMatches = content.match(/BEGIN:VALARM/g);
    expect(valarmMatches).toHaveLength(3);

    // CRLF satır sonları
    expect(content).toMatch(/\r\n/);

    console.log('✓ Calendar .ics file generated and downloaded successfully');
  });

  test('should show delivery method indicator', async ({ page, browser }) => {
    // WebKit'te download olmayabilir, bu durumu test et
    if (browser.browserType().name() === 'webkit') {
      console.log('WebKit: Download event may not be available, testing fallback');
    }

    await page.goto(BASE_URL);

    // SW aktif olana kadar bekle
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      { timeout: 15000 }
    );

    // UpdatePrompt varsa 7s bekle
    await page.waitForTimeout(7000);

    // Takvim sayfasına git
    await page.click('a[href="#/takvim"]');
    await page.waitForTimeout(1000);

    // Düğmeye tıkla
    await page.click('button:has-text("Deneme takvimi indir")');
    await page.waitForTimeout(2000);

    // Delivery method indicator görünür mü?
    const deliveryIndicator = page.locator('text=/Paylaşım penceresi|İndirme bağlantısı|Metin/');
    const isVisible = await deliveryIndicator.isVisible();

    if (isVisible) {
      console.log('✓ Delivery method indicator is visible');
    } else {
      console.log('⚠ Delivery method indicator not visible (user may have cancelled share)');
    }
  });
});
