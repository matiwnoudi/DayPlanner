/**
 * PWA kurulum algılama fonksiyonları
 *
 * Saf (pure) fonksiyonlar, navigator/window parametre olarak alır.
 * Test edilebilir.
 */

// ============================================================================
// TİPLER
// ============================================================================

/**
 * Navigator.standalone için tip genişletmesi
 * Safari/iOS özel bir özellik
 */
export interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * Cihaz tanılama bilgileri
 */
export interface DeviceInfo {
  standalone: boolean;
  hasServiceWorker: boolean;
  hasNotification: boolean;
  hasPushManager: boolean;
  isPersisted: boolean | null; // null: henüz kontrol edilmedi
  isOnline: boolean;
  screenWidth: number;
  userAgent: string;
  timeZone: string;
  notificationPermission: NotificationPermission | 'unsupported';
  appUrl: string;
  appVersion: string;
}

// ============================================================================
// ALGILAMA FONKSİYONLARI
// ============================================================================

/**
 * iOS cihaz mı kontrol et
 *
 * @param userAgent - navigator.userAgent değeri
 * @returns iOS cihazsa true
 */
export function isIOS(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Standalone modda mı kontrol et
 *
 * İki yöntem:
 * 1. navigator.standalone (Safari/iOS özel)
 * 2. matchMedia('(display-mode: standalone)') (W3C standart)
 *
 * TODO-VERIFY: iOS Safari'de her iki yöntem de güvenilir mi?
 * iOS'ta standalone algılama doğru çalışıyor mu?
 *
 * @param navigator - Navigator objesi
 * @param window - Window objesi
 * @returns Standalone modda çalışıyorsa true
 */
export function isStandalone(navigator: Navigator, window: Window): boolean {
  const nav = navigator as NavigatorWithStandalone;

  // iOS Safari özel özelliği
  if (nav.standalone === true) {
    return true;
  }

  // W3C standart
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
}

/**
 * Safari veya Safari tabanlı tarayıcı mı kontrol et
 *
 * iOS'ta "Safari'de Aç" demek için uygulama içi tarayıcıları ayırt etmek gerekir.
 *
 * UYARI: Bu algılama %100 güvenilir DEĞİLDİR. Uygulama içi tarayıcılar
 * userAgent'larını değiştirebildiği için bazı durumlarda yanlış sonuç verebilir.
 *
 * TODO-VERIFY: Instagram, Facebook, Telegram, Line, WeChat gibi popüler
 * uygulamaların iOS tarayıcılarında userAgent tespiti güvenilir mi?
 *
 * Tespit edilen tarayıcılar:
 * - Chrome iOS (CriOS)
 * - Firefox iOS (FxiOS)
 * - Edge iOS (EdgiOS)
 * - Opera iOS (OPiOS)
 * - Instagram (Instagram)
 * - Facebook (FBAN, FBAV)
 * - Line (Line/)
 * - WeChat (MicroMessenger)
 *
 * @param userAgent - navigator.userAgent değeri
 * @returns Safari veya Safari tabanlıysa true
 */
export function isSafariLike(userAgent: string): boolean {
  // iOS değilse Safari olamaz
  if (!isIOS(userAgent)) {
    return false;
  }

  // Safari/ string'i olmalı
  if (!/Safari\//i.test(userAgent)) {
    return false;
  }

  // Bilinen diğer tarayıcılar varsa Safari değil
  const nonSafariBrowsers = [
    'CriOS', // Chrome iOS
    'FxiOS', // Firefox iOS
    'EdgiOS', // Edge iOS
    'OPiOS', // Opera iOS
    'Instagram', // Instagram
    'FBAN', // Facebook
    'FBAV', // Facebook
    'Line/', // Line
    'MicroMessenger', // WeChat
  ];

  for (const browser of nonSafariBrowsers) {
    if (userAgent.includes(browser)) {
      return false;
    }
  }

  return true;
}

/**
 * iOS sürümünü userAgent'tan çıkarmaya çalış
 *
 * UYARI: Bu fonksiyon iOS sürümünü çıkarmaya çalışır ama güvenilir değildir.
 * Kullanıcıdan manuel olarak sormak daha doğrudur.
 *
 * @param userAgent - navigator.userAgent değeri
 * @returns iOS sürümü veya null
 */
export function getIOSVersion(userAgent: string): string | null {
  if (!isIOS(userAgent)) {
    return null;
  }

  // "OS 17_0" veya "iPhone OS 17_0" gibi pattern ara
  const match = userAgent.match(/OS (\d+)[_.](\d+)/i);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }

  return null;
}

/**
 * Cihaz tanılama bilgilerini topla
 *
 * Not: isPersisted async olduğu için null başlatılır,
 * ayrı bir fonksiyonla güncellenir.
 *
 * @param navigator - Navigator objesi
 * @param window - Window objesi
 * @param appVersion - Uygulama sürümü (package.json'dan)
 * @returns DeviceInfo objesi
 */
export function getDeviceInfo(
  navigator: Navigator,
  window: Window,
  appVersion: string,
): DeviceInfo {
  const baseUrl = import.meta.env.BASE_URL || '/';

  return {
    standalone: isStandalone(navigator, window),
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotification: 'Notification' in window,
    hasPushManager: 'PushManager' in window,
    isPersisted: null, // Async, sonra güncellenir
    isOnline: navigator.onLine,
    screenWidth: window.innerWidth,
    userAgent: navigator.userAgent,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notificationPermission:
      'Notification' in window ? Notification.permission : 'unsupported',
    appUrl: window.location.origin + baseUrl,
    appVersion,
  };
}

/**
 * Storage kalıcılık durumunu kontrol et (async)
 *
 * TODO-VERIFY: iOS Safari'de storage.persist() ve persisted()
 * fonksiyonları destekleniyor mu? Doğru sonuç veriyor mu?
 *
 * @param navigator - Navigator objesi
 * @returns Kalıcı storage garantisi varsa true
 */
export async function checkStoragePersisted(navigator: Navigator): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
