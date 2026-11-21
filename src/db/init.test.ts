/**
 * init.ts testleri
 *
 * Bootstrap fonksiyonunun seed'i doğru çalıştırdığını doğrular
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { bootstrap, initDB } from './init';
import { db } from './schema';

describe('initDB', () => {
  beforeEach(async () => {
    // Her testten önce veritabanını temizle
    await db.reminders.clear();
    await db.messages.clear();
    await db.meta.clear();
  });

  it('should seed database with 3 reminders and 27 messages', async () => {
    await initDB();

    const reminders = await db.reminders.toArray();
    const messages = await db.messages.toArray();

    expect(reminders).toHaveLength(3);
    expect(messages).toHaveLength(27);
  });

  it('should not duplicate seed on second call', async () => {
    await initDB();
    await initDB();

    const reminders = await db.reminders.toArray();
    const messages = await db.messages.toArray();

    expect(reminders).toHaveLength(3);
    expect(messages).toHaveLength(27);
  });

  it('should not throw if persist() is not supported', async () => {
    // fake-indexeddb ortamında persist() desteklenmiyor
    // Hata fırlatmaması gerekiyor
    await expect(initDB()).resolves.toBeDefined();
  });

  it('should preserve existing user reminders when seeding', async () => {
    // Kullanıcı bir hatırlatma ekler
    const userReminder = {
      id: 'user-custom-1',
      type: 'water' as const,
      title: 'Kullanıcı Hatırlatması',
      times: ['10:00'],
      enabled: true,
      createdAt: Date.now(),
    };

    await db.reminders.put(userReminder);

    // Bootstrap çağrılır (seed çalışır)
    await initDB();

    // Kullanıcının hatırlatması + 3 örnek = 4 toplam
    const reminders = await db.reminders.toArray();
    expect(reminders).toHaveLength(4);

    // Kullanıcının hatırlatması değişmeden kalmalı
    const userReminderFromDb = await db.reminders.get('user-custom-1');
    expect(userReminderFromDb).toEqual(userReminder);

    // Seed hatırlatmaları mevcut olmalı
    const seedIds = ['water-1', 'meal-1', 'vitamin-1'];
    for (const id of seedIds) {
      const reminder = await db.reminders.get(id);
      expect(reminder).toBeDefined();
    }
  });
});

describe('bootstrap', () => {
  beforeEach(async () => {
    await db.reminders.clear();
    await db.messages.clear();
    await db.meta.clear();
  });

  it('should not throw on error', async () => {
    // bootstrap hata olsa bile çökertmemeli
    await expect(bootstrap()).resolves.toBeUndefined();
  });

  it('should initialize database successfully', async () => {
    await bootstrap();

    const reminders = await db.reminders.toArray();
    const messages = await db.messages.toArray();

    expect(reminders).toHaveLength(3);
    expect(messages).toHaveLength(27);
  });
});
