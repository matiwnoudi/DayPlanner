/**
 * Layout Regression Test
 *
 * Kalıcı bir yerleşim regresyon testi:
 * - WebKit, viewport 393x852 (iPhone 14 benzeri)
 * - Yeni hatırlatma formunu aç
 * - 4 saat ekle ki form uzasın
 * - Sayfanın EN ALTINA kaydır (window.scrollTo)
 * - "Kaydet" ve "İptal" düğmelerinin bounding box bottom değeri
 * - tabbar'ın top değeri
 * - assert: düğme.bottom <= tabbar.top
 * - assert: document.elementFromPoint(düğme merkezi) düğmenin kendisi
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.describe('Layout Regression', () => {
  test.use({ 
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });

  test('form buttons should not overlap tabbar when scrolled to bottom (WebKit 393x852)', async ({ page }) => {
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

    // Form doldur
    await page.fill('input#title', 'Layout Test');
    
    // Su tipini seç
    await page.locator('.type-button').first().click();
    
    // 4 saat ekle ki form uzasın
    const times = ['08:00', '12:00', '16:00', '20:00'];
    for (const time of times) {
      await page.fill('input#new-time', time);
      await page.click('button:has-text("Ekle")');
      await page.waitForTimeout(300);
    }

    // Overflow kapsayıcısını dinamik bul ve EN ALTINA kaydır
    const scrollInfo = await page.evaluate(() => {
      // Tüm elemanları tara
      const allElements = Array.from(document.querySelectorAll('*')) as HTMLElement[];

      const scrollableElement = allElements.find((el) => {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const hasOverflow = el.scrollHeight > el.clientHeight;

        return (overflowY === 'auto' || overflowY === 'scroll') && hasOverflow;
      });

      if (scrollableElement) {
        // Kapsayıcıyı en alta kaydır
        scrollableElement.scrollTop = scrollableElement.scrollHeight;

        return {
          found: true,
          selector: scrollableElement.className || scrollableElement.tagName,
          scrollTop: scrollableElement.scrollTop,
          scrollHeight: scrollableElement.scrollHeight,
          clientHeight: scrollableElement.clientHeight,
        };
      }

      // Bulunamazsa window'u kaydır
      window.scrollTo(0, document.body.scrollHeight);

      return {
        found: false,
        selector: 'window',
        scrollTop: window.scrollY,
        scrollHeight: document.body.scrollHeight,
        clientHeight: window.innerHeight,
      };
    });

    console.log('=== SCROLL INFO ===');
    console.log(JSON.stringify(scrollInfo, null, 2));

    await page.waitForTimeout(500);

    // Ölçümleri al
    const measurements = await page.evaluate(() => {
      const saveButton = document.querySelector('.form-actions button[type="submit"]') as HTMLElement;
      const cancelButton = document.querySelector('.form-actions button[type="button"]') as HTMLElement;
      const tabbar = document.querySelector('.tabbar') as HTMLElement;

      const saveRect = saveButton?.getBoundingClientRect();
      const cancelRect = cancelButton?.getBoundingClientRect();
      const tabbarRect = tabbar?.getBoundingClientRect();

      // Element from point kontrolleri
      const saveCenterX = saveRect ? saveRect.left + saveRect.width / 2 : 0;
      const saveCenterY = saveRect ? saveRect.top + saveRect.height / 2 : 0;
      const elementAtSaveCenter = document.elementFromPoint(saveCenterX, saveCenterY);

      const cancelCenterX = cancelRect ? cancelRect.left + cancelRect.width / 2 : 0;
      const cancelCenterY = cancelRect ? cancelRect.top + cancelRect.height / 2 : 0;
      const elementAtCancelCenter = document.elementFromPoint(cancelCenterX, cancelCenterY);

      return {
        saveButton: {
          rect: saveRect ? {
            top: saveRect.top,
            bottom: saveRect.bottom,
            left: saveRect.left,
            right: saveRect.right,
            width: saveRect.width,
            height: saveRect.height,
          } : null,
          centerPoint: { x: saveCenterX, y: saveCenterY },
          elementAtCenter: elementAtSaveCenter ? {
            tag: elementAtSaveCenter.tagName,
            className: elementAtSaveCenter.className,
            isSameElement: elementAtSaveCenter === saveButton,
          } : null,
        },
        cancelButton: {
          rect: cancelRect ? {
            top: cancelRect.top,
            bottom: cancelRect.bottom,
            left: cancelRect.left,
            right: cancelRect.right,
            width: cancelRect.width,
            height: cancelRect.height,
          } : null,
          centerPoint: { x: cancelCenterX, y: cancelCenterY },
          elementAtCenter: elementAtCancelCenter ? {
            tag: elementAtCancelCenter.tagName,
            className: elementAtCancelCenter.className,
            isSameElement: elementAtCancelCenter === cancelButton,
          } : null,
        },
        tabbar: {
          rect: tabbarRect ? {
            top: tabbarRect.top,
            bottom: tabbarRect.bottom,
            left: tabbarRect.left,
            right: tabbarRect.right,
            width: tabbarRect.width,
            height: tabbarRect.height,
          } : null,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: window.scrollY,
          scrollHeight: document.body.scrollHeight,
        },
      };
    });

    // Ölçümleri YAZDIR
    console.log('=== LAYOUT MEASUREMENTS ===');
    console.log(JSON.stringify(measurements, null, 2));
    console.log('=== SPECIFIC VALUES ===');
    console.log(`Save button bottom: ${measurements.saveButton.rect?.bottom}`);
    console.log(`Cancel button bottom: ${measurements.cancelButton.rect?.bottom}`);
    console.log(`Tabbar top: ${measurements.tabbar.rect?.top}`);

    // Boşluk hesapla
    const saveGap = measurements.tabbar.rect!.top - measurements.saveButton.rect!.bottom;
    const cancelGap = measurements.tabbar.rect!.top - measurements.cancelButton.rect!.bottom;

    console.log(`Gap between Save button and tabbar: ${saveGap}px`);
    console.log(`Gap between Cancel button and tabbar: ${cancelGap}px`);
    console.log(`Save button at center is same element: ${measurements.saveButton.elementAtCenter?.isSameElement}`);
    console.log(`Cancel button at center is same element: ${measurements.cancelButton.elementAtCenter?.isSameElement}`);

    // ASSERTIONS
    expect(measurements.saveButton.rect).not.toBeNull();
    expect(measurements.cancelButton.rect).not.toBeNull();
    expect(measurements.tabbar.rect).not.toBeNull();

    // Boşluk >= 8px olmalı
    expect(saveGap).toBeGreaterThanOrEqual(8);
    expect(cancelGap).toBeGreaterThanOrEqual(8);

    // elementFromPoint(düğme merkezi) düğmenin kendisi olmalı
    expect(measurements.saveButton.elementAtCenter?.isSameElement).toBe(true);
    expect(measurements.cancelButton.elementAtCenter?.isSameElement).toBe(true);
  });
});
