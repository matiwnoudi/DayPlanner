/**
 * Veritabanı başlatma fonksiyonları
 *
 * Bu dosya YALNIZCA uygulama kodu tarafından import edilir.
 * Service worker bu fonksiyonları kullanmaz.
 */

import { seedDatabase } from './seed';

/**
 * Storage kalıcılığını talep et
 *
 * İOS TAVSİYE VERİLİR: navigator.storage.persist() iOS Safari'de
 * her zaman false döndürüyor olabilir veya hiç desteklenmiyor olabilir.
 * Ancak çağırmak zararsızdır ve gelecekte destek eklenirse hazır oluruz.
 *
 * Kaynak: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
 *
 * @returns Promise<boolean> - Kalıcılık garantisi verildi mi (iOS'ta muhtemelen false)
 */
async function requestPersistence(): Promise<boolean> {
  // TODO-VERIFY: iOS Safari'de persist() davranışı henüz doğrulanmadı.
  // Test edilmesi gereken:
  // 1. persist() çağrısı hata veriyor mu?
  // 2. true/false dönüyor mu?
  // 3. Gerçekten kalıcılık garantisi veriyor mu yoksa IndexedDB yine de silinebiliyor mu?

  if (!navigator.storage || !navigator.storage.persist) {
    // Tarayıcı desteklemiyor
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  } catch (error) {
    // Hata olsa bile uygulama çökmesin
    console.warn('Storage persistence request failed:', error);
    return false;
  }
}

/**
 * Veritabanını başlat
 *
 * 1. Storage kalıcılığını talep et
 * 2. İlk seed verilerini oluştur (eğer gerekiyorsa)
 *
 * @returns Promise<{ persisted: boolean }> - Kalıcılık durumu
 */
export async function initDB(): Promise<{ persisted: boolean }> {
  // Kalıcılık talebi
  const persisted = await requestPersistence();

  // Seed verisi
  await seedDatabase();

  return { persisted };
}
