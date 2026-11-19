/**
 * PWA kurulum algılama testleri
 */

import { describe, it, expect } from 'vitest';
import { isIOS, isStandalone, isSafariLike, getIOSVersion } from './install';

describe('isIOS', () => {
  it('iPhone userAgent için true döner', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIOS(ua)).toBe(true);
  });

  it('iPad userAgent için true döner', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIOS(ua)).toBe(true);
  });

  it('iPod userAgent için true döner', () => {
    const ua = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIOS(ua)).toBe(true);
  });

  it('Android userAgent için false döner', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(isIOS(ua)).toBe(false);
  });

  it('Masaüstü Chrome userAgent için false döner', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(isIOS(ua)).toBe(false);
  });
});

describe('isStandalone', () => {
  it('navigator.standalone true ise true döner', () => {
    const nav = { standalone: true } as unknown as Navigator;
    const win = { matchMedia: () => ({ matches: false }) } as unknown as Window;
    expect(isStandalone(nav, win)).toBe(true);
  });

  it('matchMedia standalone ise true döner', () => {
    const nav = {} as unknown as Navigator;
    const win = {
      matchMedia: (query: string) => ({
        matches: query === '(display-mode: standalone)',
      }),
    } as unknown as Window;
    expect(isStandalone(nav, win)).toBe(true);
  });

  it('her iki yöntem de false ise false döner', () => {
    const nav = {} as unknown as Navigator;
    const win = { matchMedia: () => ({ matches: false }) } as unknown as Window;
    expect(isStandalone(nav, win)).toBe(false);
  });
});

describe('isSafariLike', () => {
  it('iPhone Safari için true döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(isSafariLike(ua)).toBe(true);
  });

  it('iPad Safari için true döner', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(isSafariLike(ua)).toBe(true);
  });

  it('Chrome iOS (CriOS) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Firefox iOS (FxiOS) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Edge iOS (EdgiOS) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.2210.105 Mobile/15E148 Safari/604.1';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Opera iOS (OPiOS) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) OPiOS/3.2.10 Mobile/15E148 Safari/604.1';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Instagram uygulama içi tarayıcı için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 315.0.0.21.113 (iPhone13,2; iOS 17_0; tr_TR; tr-TR; scale=3.00; 1170x2532; 566599252)';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Facebook uygulama içi tarayıcı (FBAN) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBID/phone;FBLC/tr_TR;FBOP/5]';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Facebook uygulama içi tarayıcı (FBAV) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAV/442.0.0.36.109;FBBV/500000000]';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Line uygulama içi tarayıcı için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/13.20.1';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('WeChat uygulama içi tarayıcı (MicroMessenger) için false döner', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2f) NetType/WIFI Language/tr';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Android için false döner', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(isSafariLike(ua)).toBe(false);
  });

  it('Masaüstü Safari için false döner (iOS değil)', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    expect(isSafariLike(ua)).toBe(false);
  });
});

describe('getIOSVersion', () => {
  it('iPhone userAgent için iOS sürümünü döner (Version/ ile)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1';
    expect(getIOSVersion(ua)).toBe('26.6');
  });

  it('Gerçek iPhone 16 Pro userAgent (iOS 18.7 → Version 26.6.1)', () => {
    // iOS 18+ sürümlerinde "iPhone OS x_y" değeri sabitlenmiştir (18_7)
    // Gerçek iOS sürümü "Version/x.y" kısmından okunur
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1';
    expect(getIOSVersion(ua)).toBe('26.6'); // Version/26.6.1 → 26.6
  });

  it('iOS 18 için doğru sürümü döner (OS değerinden fallback)', () => {
    // Version/ kısmı yoksa OS kısmından fallback (güvenilmez)
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15';
    expect(getIOSVersion(ua)).toBe('18.1 (OS değerinden)');
  });

  it('Android için null döner', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(getIOSVersion(ua)).toBe(null);
  });
});
