/**
 * Seed fonksiyonu testleri
 *
 * fake-indexeddb kullanarak seed'in idempotent olduğunu doğrular.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './schema';
import { seedDatabase } from './seed';

describe('seedDatabase', () => {
  beforeEach(async () => {
    // Her testten önce veritabanını sıfırla
    await db.delete();
    await db.open();
  });

  it('ilk seed doğru sayıda hatırlatma ve mesaj oluşturur', async () => {
    // Seed çalıştır
    await seedDatabase();

    // Hatırlatma sayısını kontrol et
    const reminders = await db.reminders.toArray();
    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => r.id).sort()).toEqual(['meal-1', 'vitamin-1', 'water-1']);

    // Her hatırlatmanın doğru alanları olmalı
    reminders.forEach((r) => {
      expect(r.id).toBeTruthy();
      expect(r.type).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(Array.isArray(r.times)).toBe(true);
      expect(r.times.length).toBeGreaterThan(0);
      expect(typeof r.enabled).toBe('boolean');
      expect(typeof r.createdAt).toBe('number');
    });

    // Mesaj sayısını kontrol et
    const messages = await db.messages.toArray();
    expect(messages.length).toBeGreaterThan(20); // En az 8+8+9=25 mesaj bekleniyor

    // water-1 için mesajlar
    const waterMessages = messages.filter((m) => m.reminderId === 'water-1');
    expect(waterMessages).toHaveLength(10);

    // meal-1 için mesajlar
    const mealMessages = messages.filter((m) => m.reminderId === 'meal-1');
    expect(mealMessages).toHaveLength(8);

    // vitamin-1 için mesajlar
    const vitaminMessages = messages.filter((m) => m.reminderId === 'vitamin-1');
    expect(vitaminMessages).toHaveLength(9);

    // Seed bayrağı set edilmiş olmalı
    const flag = await db.meta.get('seedCompleted');
    expect(flag).toBeDefined();
    expect(flag?.value).toBe('true');
  });

  it('seed iki kez art arda çağrılınca kayıtlar çoğalmaz', async () => {
    // İlk seed
    await seedDatabase();
    const remindersAfterFirst = await db.reminders.count();
    const messagesAfterFirst = await db.messages.count();

    // İkinci seed
    await seedDatabase();
    const remindersAfterSecond = await db.reminders.count();
    const messagesAfterSecond = await db.messages.count();

    // Sayılar aynı kalmalı
    expect(remindersAfterSecond).toBe(remindersAfterFirst);
    expect(messagesAfterSecond).toBe(messagesAfterFirst);
    expect(remindersAfterSecond).toBe(3);
  });

  it('seed aynı anda iki kez çağrılınca kayıtlar çoğalmaz (race condition)', async () => {
    // İki seed'i paralel çalıştır
    await Promise.all([seedDatabase(), seedDatabase()]);

    const reminders = await db.reminders.count();
    const messages = await db.messages.count();

    // Yine de sadece bir kez seed edilmiş olmalı
    expect(reminders).toBe(3);
    expect(messages).toBeGreaterThan(20);
    expect(messages).toBeLessThan(30); // Çoğalmadıysa max 27 olmalı
  });

  it('hatırlatmalar silindikten sonra seed tekrar çağrılınca geri getirmez', async () => {
    // İlk seed
    await seedDatabase();
    expect(await db.reminders.count()).toBe(3);

    // Tüm hatırlatmaları sil
    await db.reminders.clear();
    expect(await db.reminders.count()).toBe(0);

    // Seed tekrar çağır
    await seedDatabase();

    // Hala 0 olmalı, çünkü seed bayrağı var
    expect(await db.reminders.count()).toBe(0);

    // Bayrak hala var olmalı
    const flag = await db.meta.get('seedCompleted');
    expect(flag?.value).toBe('true');
  });
});
