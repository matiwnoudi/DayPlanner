/**
 * Dexie veritabanı şeması ve tipleri
 *
 * ÖNEMLİ: Bu dosya React'siz, saf TypeScript'tir.
 * Hem uygulama hem de service worker tarafından import edilir.
 *
 * ŞEma VERSİYON YÖNETİMİ:
 * - Şu anki versiyon: 1
 * - Gelecekte alan eklemek/değiştirmek için version(2) açıp migration yazmak gerekir.
 * - Dexie migration dokümantasyonu: https://dexie.org/docs/Tutorial/Design#database-versioning
 *
 * Örnek migration (gelecek için):
 *   db.version(2).stores({
 *     reminders: 'id, type, enabled, createdAt'  // Yeni alan eklendi
 *   }).upgrade(tx => {
 *     return tx.table('reminders').toCollection().modify(reminder => {
 *       reminder.newField = defaultValue;
 *     });
 *   });
 */

import Dexie, { type EntityTable } from 'dexie';

// ============================================================================
// TİPLER
// ============================================================================

/**
 * Hatırlatma türleri
 */
export type ReminderType = 'water' | 'meal' | 'supplement';

/**
 * Hatırlatma kaydı
 *
 * times: Yerel saat formatında string dizisi, örn. ["09:00", "13:00", "18:00"]
 *        Saat dilimi bilgisi YOK. Kullanıcının cihaz saati baz alınır.
 */
export interface Reminder {
  id: string; // örn. "water-1"
  type: ReminderType;
  title: string; // Kullanıcıya gösterilen başlık
  times: string[]; // Yerel saat "HH:mm" formatında, örn. ["09:00", "14:30"]
  enabled: boolean;
  createdAt: number; // Unix timestamp (ms)
}

/**
 * Motivasyon mesajları
 *
 * Her hatırlatma için birden fazla mesaj olabilir.
 * Bildirim gösterilirken rastgele seçilir.
 */
export interface Message {
  id: string; // örn. "water-1-m1"
  reminderId: string; // Hangi hatırlatmaya ait, örn. "water-1"
  text: string; // Motivasyon metni
  lang: string; // "tr" veya "fa"
}

/**
 * Olay günlüğü
 *
 * Push alındı, bildirim gösterildi, uygulama açıldı gibi olaylar.
 */
export interface EventLog {
  id?: number; // Otomatik artan
  ts: number; // Unix timestamp (ms)
  type: string; // "push-received", "notification-shown", "notification-clicked", vb.
  detail?: string; // JSON string veya açıklama
}

/**
 * Test kontrol listesi
 *
 * Kullanıcının manuel test sonuçları
 */
export interface Checklist {
  id: string; // Test maddesi id'si, örn. "install-home-screen"
  status: 'pending' | 'pass' | 'fail'; // Test durumu
  note?: string; // Kullanıcı notu
  updatedAt: number; // Unix timestamp (ms)
}

/**
 * Hatırlatma tamamlama kaydı
 *
 * Kullanıcının bir hatırlatmayı yerine getirdiği kayıt.
 */
export interface Completion {
  id: string; // UUID
  date: string; // Yerel tarih YYYY-MM-DD
  category: 'water' | 'meal' | 'supplement' | 'workout';
  reminderId?: string; // İlişkili hatırlatma (opsiyonel, yetim kalabilir)
  amount?: number; // Miktar (örn: su miktarı ml)
  note?: string; // Kullanıcı notu
  at: string; // ISO 8601 zaman damgası
  source: 'manual' | 'reminder'; // Kayıt kaynağı
}

/**
 * Metadata tablosu
 *
 * Uygulama ayarları ve bayraklar (örn. "seedCompleted": "true")
 */
export interface Meta {
  key: string;
  value: string;
}

// ============================================================================
// VERİTABANI
// ============================================================================

/**
 * Dexie veritabanı sınıfı
 */
class DayPlannerDB extends Dexie {
  reminders!: EntityTable<Reminder, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  eventLog!: EntityTable<EventLog, 'id'>;
  checklist!: EntityTable<Checklist, 'id'>;
  meta!: EntityTable<Meta, 'key'>;
  completions!: EntityTable<Completion, 'id'>;

  constructor() {
    super('DayPlannerDB');

    // Şema tanımı - versiyon 1 (başlangıç)
    this.version(1).stores({
      // İndeksler: birincil anahtar kalın, diğerleri virgülle ayrılır
      reminders: 'id, type, enabled',
      messages: 'id, reminderId',
      eventLog: '++id, ts, type', // ++id: otomatik artan
      checklist: 'id',
      meta: 'key',
    });

    // Şema tanımı - versiyon 2 (completions tablosu eklendi)
    this.version(2).stores({
      reminders: 'id, type, enabled',
      messages: 'id, reminderId',
      eventLog: '++id, ts, type',
      checklist: 'id',
      meta: 'key',
      completions: 'id, date, category, reminderId', // Yeni tablo
    });

    // versionchange: Başka bir sekme veritabanını yükseltiyor
    // Bağlantıyı kapat ve sayfayı yenile
    // TODO-VERIFY: iOS Safari'de bu davranış doğrulandı mı?
    this.on('versionchange', () => {
      this.close();
      window.location.reload();
    });

    // blocked: Yükseltme bloklandı (başka açık bağlantı var)
    this.on('blocked', () => {
      console.warn('Database upgrade blocked by another connection. Close other tabs.');
    });
  }
}

// Singleton veritabanı instance
export const db = new DayPlannerDB();
