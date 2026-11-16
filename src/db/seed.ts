/**
 * Veritabanı ilk seed verisi
 *
 * İlk açılışta demo hatırlatmalar ve mesajlar oluşturur.
 * İdempotent: iki kez çalışsa da kayıt çoğalmaz.
 */

import { db } from './schema';
import type { Reminder, Message } from './schema';

/**
 * Seed bayrak anahtarı
 */
const SEED_FLAG_KEY = 'seedCompleted';

/**
 * İlk seed verilerini oluştur
 *
 * Meta tablosunda bayrak varsa hiçbir şey yapmaz.
 * Bayrak yoksa seed'i çalıştırıp bayrağı set eder.
 *
 * Transaction içinde çalışır, böylece React StrictMode'da
 * iki kez çağrılsa da yalnızca bir kez seed edilir.
 *
 * @returns Promise<void>
 */
export async function seedDatabase(): Promise<void> {
  await db.transaction('rw', db.meta, db.reminders, db.messages, async () => {
    // Bayrak kontrolü
    const flag = await db.meta.get(SEED_FLAG_KEY);
    if (flag) {
      // Seed zaten yapılmış
      return;
    }

    // Seed verilerini oluştur
    const now = Date.now();

    // ========================================================================
    // Hatırlatmalar
    // ========================================================================
    const reminders: Reminder[] = [
      {
        id: 'water-1',
        type: 'water',
        title: 'Su İç',
        times: ['09:00', '12:00', '15:00', '18:00', '21:00'],
        enabled: true,
        createdAt: now,
      },
      {
        id: 'meal-1',
        type: 'meal',
        title: 'Öğün Zamanı',
        times: ['08:00', '13:00', '19:00'],
        enabled: true,
        createdAt: now,
      },
      {
        id: 'vitamin-1',
        type: 'supplement',
        title: 'Takviye',
        times: ['09:30', '21:30'],
        enabled: true,
        createdAt: now,
      },
    ];

    await db.reminders.bulkPut(reminders);

    // ========================================================================
    // Motivasyon Mesajları
    // ========================================================================
    const messages: Message[] = [
      // Su mesajları (10 adet)
      { id: 'water-1-m1', reminderId: 'water-1', text: 'Bir bardak su içme zamanı! 💧', lang: 'tr' },
      { id: 'water-1-m2', reminderId: 'water-1', text: 'Vücudun sana teşekkür edecek, bir yudum su iç 😊', lang: 'tr' },
      { id: 'water-1-m3', reminderId: 'water-1', text: 'Susuz kalma, enerjini yenile! 🌊', lang: 'tr' },
      { id: 'water-1-m4', reminderId: 'water-1', text: 'Kendin için bir bardak su doldur ✨', lang: 'tr' },
      { id: 'water-1-m5', reminderId: 'water-1', text: 'Hidrasyon vakti! Su içmeyi unutma 💙', lang: 'tr' },
      { id: 'water-1-m6', reminderId: 'water-1', text: 'Bir bardak su, bir bardak sağlık 🥤', lang: 'tr' },
      { id: 'water-1-m7', reminderId: 'water-1', text: 'Bedenin sıvı istiyor, su içelim! 💦', lang: 'tr' },
      { id: 'water-1-m8', reminderId: 'water-1', text: 'Küçük bir mola ver, su iç ☺️', lang: 'tr' },
      { id: 'water-1-m9', reminderId: 'water-1', text: 'Sağlığın için bir bardak su! 🌈', lang: 'tr' },
      { id: 'water-1-m10', reminderId: 'water-1', text: 'Su içmeyi unutma, iyi hissedeceksin! 🌟', lang: 'tr' },

      // Öğün mesajları (8 adet)
      { id: 'meal-1-m1', reminderId: 'meal-1', text: 'Öğün zamanı geldi, afiyet olsun! 🍽️', lang: 'tr' },
      { id: 'meal-1-m2', reminderId: 'meal-1', text: 'Bir şeyler yeme vakti, kendine iyi bak 😊', lang: 'tr' },
      { id: 'meal-1-m3', reminderId: 'meal-1', text: 'Mideyi mutlu et, bir lokma ye! 🥗', lang: 'tr' },
      { id: 'meal-1-m4', reminderId: 'meal-1', text: 'Enerjini tazeleme zamanı ✨', lang: 'tr' },
      { id: 'meal-1-m5', reminderId: 'meal-1', text: 'Güzel bir öğün seni bekliyor 🍲', lang: 'tr' },
      { id: 'meal-1-m6', reminderId: 'meal-1', text: 'Kendine lezzetli bir mola ver 🌻', lang: 'tr' },
      { id: 'meal-1-m7', reminderId: 'meal-1', text: 'Yemek zamanı! Afiyet şeker olsun 💚', lang: 'tr' },
      { id: 'meal-1-m8', reminderId: 'meal-1', text: 'Bir öğün atlamadan gününe devam et 🌞', lang: 'tr' },

      // Takviye mesajları (9 adet)
      { id: 'vitamin-1-m1', reminderId: 'vitamin-1', text: 'Takviye alma zamanı! 💊', lang: 'tr' },
      { id: 'vitamin-1-m2', reminderId: 'vitamin-1', text: 'Günlük desteğini almayı unutma 😊', lang: 'tr' },
      { id: 'vitamin-1-m3', reminderId: 'vitamin-1', text: 'Takviyeni al, kendine iyi bak ✨', lang: 'tr' },
      { id: 'vitamin-1-m4', reminderId: 'vitamin-1', text: 'Sağlığın için küçük bir adım 🌟', lang: 'tr' },
      { id: 'vitamin-1-m5', reminderId: 'vitamin-1', text: 'Takviye zamanı geldi! 🌈', lang: 'tr' },
      { id: 'vitamin-1-m6', reminderId: 'vitamin-1', text: 'Bir yudum suyla takviyeni al 💧', lang: 'tr' },
      { id: 'vitamin-1-m7', reminderId: 'vitamin-1', text: 'Günlük rutinin için takviye vakti 💚', lang: 'tr' },
      { id: 'vitamin-1-m8', reminderId: 'vitamin-1', text: 'Kendine iyi bakmayı unutma 🌸', lang: 'tr' },
      { id: 'vitamin-1-m9', reminderId: 'vitamin-1', text: 'Takviyeni almayı unutma! 🌺', lang: 'tr' },
    ];

    await db.messages.bulkPut(messages);

    // Seed tamamlandı bayrağını set et
    await db.meta.put({ key: SEED_FLAG_KEY, value: 'true' });
  });
}
