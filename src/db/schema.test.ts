/**
 * schema.ts migration testleri
 *
 * Dexie version 1 → version 2 geçişinin veri kaybı olmadan çalıştığını doğrular
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type EntityTable } from 'dexie';
import type { Reminder, Message, EventLog, Checklist, Meta } from './schema';

// seed.ts'ten gerçek seed bayrak anahtarı
const SEED_FLAG_KEY = 'seedCompleted';

describe('Dexie migration: version 1 → version 2', () => {
  beforeEach(async () => {
    // Test öncesi veritabanını temizle
    await Dexie.delete('DayPlannerDB');
  });

  it('should migrate from version 1 to version 2 without data loss', async () => {
    // ===== PHASE 1: Version 1 şemasıyla veritabanı oluştur =====
    class DayPlannerDBV1 extends Dexie {
      reminders!: EntityTable<Reminder, 'id'>;
      messages!: EntityTable<Message, 'id'>;
      eventLog!: EntityTable<EventLog, 'id'>;
      checklist!: EntityTable<Checklist, 'id'>;
      meta!: EntityTable<Meta, 'key'>;

      constructor() {
        super('DayPlannerDB');
        this.version(1).stores({
          reminders: 'id, type, enabled',
          messages: 'id, reminderId',
          eventLog: '++id, ts, type',
          checklist: 'id',
          meta: 'key',
        });
      }
    }

    const dbV1 = new DayPlannerDBV1();

    // Eski veri yaz (seed.ts yapısını taklit et)
    const now = Date.now();

    const reminders: Reminder[] = [
      {
        id: 'test-water-1',
        type: 'water',
        title: 'Test Su',
        times: ['09:00', '15:00'],
        enabled: true,
        createdAt: now,
      },
      {
        id: 'test-meal-1',
        type: 'meal',
        title: 'Test Öğün',
        times: ['12:00'],
        enabled: false,
        createdAt: now,
      },
    ];

    const messages: Message[] = [
      { id: 'test-msg-1', reminderId: 'test-water-1', text: 'Test mesaj 1', lang: 'tr' },
      { id: 'test-msg-2', reminderId: 'test-water-1', text: 'Test mesaj 2', lang: 'tr' },
    ];

    const eventLog: EventLog[] = [
      { ts: now, type: 'test-event', detail: 'Test event log' },
    ];

    const checklist: Checklist[] = [
      { id: 'test-check-1', status: 'pending', updatedAt: now },
    ];

    const meta: Meta[] = [
      { key: SEED_FLAG_KEY, value: 'true' },
    ];

    await dbV1.reminders.bulkPut(reminders);
    await dbV1.messages.bulkPut(messages);
    await dbV1.eventLog.bulkPut(eventLog);
    await dbV1.checklist.bulkPut(checklist);
    await dbV1.meta.bulkPut(meta);

    // Version 1 veritabanını kapat
    dbV1.close();

    // ===== PHASE 2: Version 2 şemasıyla veritabanını aç (auto-upgrade) =====
    class DayPlannerDBV2 extends Dexie {
      reminders!: EntityTable<Reminder, 'id'>;
      messages!: EntityTable<Message, 'id'>;
      eventLog!: EntityTable<EventLog, 'id'>;
      checklist!: EntityTable<Checklist, 'id'>;
      meta!: EntityTable<Meta, 'key'>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completions!: EntityTable<any, 'id'>;

      constructor() {
        super('DayPlannerDB');

        this.version(1).stores({
          reminders: 'id, type, enabled',
          messages: 'id, reminderId',
          eventLog: '++id, ts, type',
          checklist: 'id',
          meta: 'key',
        });

        this.version(2).stores({
          reminders: 'id, type, enabled',
          messages: 'id, reminderId',
          eventLog: '++id, ts, type',
          checklist: 'id',
          meta: 'key',
          completions: 'id, date, category, reminderId',
        });
      }
    }

    const dbV2 = new DayPlannerDBV2();

    // ===== PHASE 3: Eski verilerin yerinde olduğunu doğrula =====

    // Reminders kontrolü (sayı ve içerik)
    const remindersFromV2 = await dbV2.reminders.toArray();
    expect(remindersFromV2).toHaveLength(2);

    const waterReminder = remindersFromV2.find((r) => r.id === 'test-water-1');
    expect(waterReminder).toBeDefined();
    expect(waterReminder!.title).toBe('Test Su');
    expect(waterReminder!.type).toBe('water');
    expect(waterReminder!.times).toEqual(['09:00', '15:00']);
    expect(waterReminder!.enabled).toBe(true);
    expect(waterReminder!.createdAt).toBe(now);

    const mealReminder = remindersFromV2.find((r) => r.id === 'test-meal-1');
    expect(mealReminder).toBeDefined();
    expect(mealReminder!.title).toBe('Test Öğün');
    expect(mealReminder!.type).toBe('meal');
    expect(mealReminder!.enabled).toBe(false);

    // Messages kontrolü
    const messagesFromV2 = await dbV2.messages.toArray();
    expect(messagesFromV2).toHaveLength(2);

    const msg1 = messagesFromV2.find((m) => m.id === 'test-msg-1');
    expect(msg1).toBeDefined();
    expect(msg1!.reminderId).toBe('test-water-1');
    expect(msg1!.text).toBe('Test mesaj 1');
    expect(msg1!.lang).toBe('tr');

    // EventLog kontrolü
    const eventLogFromV2 = await dbV2.eventLog.toArray();
    expect(eventLogFromV2).toHaveLength(1);
    expect(eventLogFromV2[0].type).toBe('test-event');
    expect(eventLogFromV2[0].detail).toBe('Test event log');
    expect(eventLogFromV2[0].ts).toBe(now);

    // Checklist kontrolü
    const checklistFromV2 = await dbV2.checklist.toArray();
    expect(checklistFromV2).toHaveLength(1);
    expect(checklistFromV2[0].id).toBe('test-check-1');
    expect(checklistFromV2[0].status).toBe('pending');
    expect(checklistFromV2[0].updatedAt).toBe(now);

    // Meta kontrolü (seed bayrağı)
    const metaFromV2 = await dbV2.meta.toArray();
    expect(metaFromV2).toHaveLength(1);
    const seedFlag = await dbV2.meta.get(SEED_FLAG_KEY);
    expect(seedFlag).toBeDefined();
    expect(seedFlag!.value).toBe('true');

    // Completions tablosu var ve boş
    const completionsFromV2 = await dbV2.completions.toArray();
    expect(completionsFromV2).toHaveLength(0);

    dbV2.close();
  });
});
