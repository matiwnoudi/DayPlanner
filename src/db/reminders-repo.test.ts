/**
 * Reminders Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto'; // IndexedDB mock
import {
  createReminder,
  updateReminder,
  deleteReminder,
  setEnabled,
  addMessage,
  updateMessage,
  deleteMessage,
  addCompletion,
  deleteCompletion,
  listCompletions,
} from './reminders-repo';
import { db } from './schema';

// Her testten önce veritabanını temizle
beforeEach(async () => {
  await db.reminders.clear();
  await db.messages.clear();
  await db.completions.clear();
});

describe('createReminder', () => {
  it('yeni hatırlatma oluşturmalı', async () => {
    const reminder = await createReminder('water', 'Su İç', ['09:00', '13:00', '18:00']);

    expect(reminder.id).toBeTruthy();
    expect(reminder.type).toBe('water');
    expect(reminder.title).toBe('Su İç');
    expect(reminder.times).toEqual(['09:00', '13:00', '18:00']);
    expect(reminder.enabled).toBe(true);
    expect(reminder.createdAt).toBeGreaterThan(0);

    // Veritabanında var mı kontrol et
    const saved = await db.reminders.get(reminder.id);
    expect(saved).toEqual(reminder);
  });

  it('başlık boşsa hata fırlatmalı', async () => {
    await expect(createReminder('water', '', ['09:00'])).rejects.toThrow('Başlık boş olamaz');
    await expect(createReminder('water', '   ', ['09:00'])).rejects.toThrow('Başlık boş olamaz');
  });

  it('başlık 100 karakterden uzunsa hata fırlatmalı', async () => {
    const longTitle = 'a'.repeat(101);
    await expect(createReminder('water', longTitle, ['09:00'])).rejects.toThrow(
      'Başlık en fazla 100 karakter olabilir',
    );
  });

  it('geçersiz saat formatında hata fırlatmalı', async () => {
    await expect(createReminder('water', 'Test', ['25:00'])).rejects.toThrow(
      'Geçersiz saat formatı',
    );
    await expect(createReminder('water', 'Test', ['09:60'])).rejects.toThrow(
      'Geçersiz saat formatı',
    );
    await expect(createReminder('water', 'Test', ['9:00'])).rejects.toThrow(
      'Geçersiz saat formatı',
    );
  });

  it('tekrar eden saatleri tekilleştirmeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00', '13:00', '09:00']);
    expect(reminder.times).toEqual(['09:00', '13:00']);
  });

  it('saatleri sıralamalı', async () => {
    const reminder = await createReminder('water', 'Test', ['18:00', '09:00', '13:00']);
    expect(reminder.times).toEqual(['09:00', '13:00', '18:00']);
  });

  it('12 saatten fazla eklenememeli', async () => {
    const times = Array.from({ length: 13 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    await expect(createReminder('water', 'Test', times)).rejects.toThrow(
      'En fazla 12 saat eklenebilir',
    );
  });
});

describe('updateReminder', () => {
  it('hatırlatma güncellemeli', async () => {
    const reminder = await createReminder('water', 'Su İç', ['09:00']);

    await updateReminder(reminder.id, {
      title: 'Bol Su İç',
      times: ['09:00', '15:00'],
    });

    const updated = await db.reminders.get(reminder.id);
    expect(updated?.title).toBe('Bol Su İç');
    expect(updated?.times).toEqual(['09:00', '15:00']);
  });

  it('hatırlatma bulunamazsa hata fırlatmalı', async () => {
    await expect(
      updateReminder('non-existent-id', { title: 'Test' }),
    ).rejects.toThrow('Hatırlatma bulunamadı');
  });

  it('başlık boşsa hata fırlatmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    await expect(updateReminder(reminder.id, { title: '' })).rejects.toThrow(
      'Başlık boş olamaz',
    );
  });

  it('geçersiz saat formatında hata fırlatmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    await expect(updateReminder(reminder.id, { times: ['25:00'] })).rejects.toThrow(
      'Geçersiz saat formatı',
    );
  });

  it('saatleri sıralamalı ve tekilleştirmeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    await updateReminder(reminder.id, { times: ['18:00', '09:00', '18:00'] });

    const updated = await db.reminders.get(reminder.id);
    expect(updated?.times).toEqual(['09:00', '18:00']);
  });
});

describe('setEnabled', () => {
  it('hatırlatma durumunu değiştirmeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    expect(reminder.enabled).toBe(true);

    await setEnabled(reminder.id, false);
    const updated = await db.reminders.get(reminder.id);
    expect(updated?.enabled).toBe(false);

    await setEnabled(reminder.id, true);
    const updated2 = await db.reminders.get(reminder.id);
    expect(updated2?.enabled).toBe(true);
  });

  it('hatırlatma bulunamazsa hata fırlatmalı', async () => {
    await expect(setEnabled('non-existent-id', false)).rejects.toThrow(
      'Hatırlatma bulunamadı',
    );
  });
});

describe('deleteReminder', () => {
  it('hatırlatma ve bağlı mesajları birlikte silmeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message1 = await addMessage(reminder.id, 'Mesaj 1');
    const message2 = await addMessage(reminder.id, 'Mesaj 2');

    // Başka bir hatırlatma ve mesajı (etkilenmemeli)
    const reminder2 = await createReminder('meal', 'Öğün', ['12:00']);
    const message3 = await addMessage(reminder2.id, 'Mesaj 3');

    // İlk hatırlatmayı sil
    await deleteReminder(reminder.id);

    // Hatırlatma ve mesajları silinmiş olmalı
    expect(await db.reminders.get(reminder.id)).toBeUndefined();
    expect(await db.messages.get(message1.id)).toBeUndefined();
    expect(await db.messages.get(message2.id)).toBeUndefined();

    // İkinci hatırlatma ve mesajı etkilenmemeli
    expect(await db.reminders.get(reminder2.id)).toBeTruthy();
    expect(await db.messages.get(message3.id)).toBeTruthy();
  });

  it('hatırlatma bulunamazsa hata fırlatmalı', async () => {
    await expect(deleteReminder('non-existent-id')).rejects.toThrow(
      'Hatırlatma bulunamadı',
    );
  });
});

describe('addMessage', () => {
  it('yeni mesaj eklemeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message = await addMessage(reminder.id, 'Su iç!', 'tr');

    expect(message.id).toBeTruthy();
    expect(message.reminderId).toBe(reminder.id);
    expect(message.text).toBe('Su iç!');
    expect(message.lang).toBe('tr');

    // Veritabanında var mı kontrol et
    const saved = await db.messages.get(message.id);
    expect(saved).toEqual(message);
  });

  it('hatırlatma bulunamazsa hata fırlatmalı', async () => {
    await expect(addMessage('non-existent-id', 'Test')).rejects.toThrow(
      'Hatırlatma bulunamadı',
    );
  });

  it('mesaj boşsa hata fırlatmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    await expect(addMessage(reminder.id, '')).rejects.toThrow('Mesaj boş olamaz');
    await expect(addMessage(reminder.id, '   ')).rejects.toThrow('Mesaj boş olamaz');
  });

  it('mesaj 500 karakterden uzunsa hata fırlatmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const longMessage = 'a'.repeat(501);
    await expect(addMessage(reminder.id, longMessage)).rejects.toThrow(
      'Mesaj en fazla 500 karakter olabilir',
    );
  });

  it('lang varsayılan "tr" olmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message = await addMessage(reminder.id, 'Test');
    expect(message.lang).toBe('tr');
  });
});

describe('updateMessage', () => {
  it('mesaj güncellemeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message = await addMessage(reminder.id, 'Eski mesaj');

    await updateMessage(message.id, 'Yeni mesaj');

    const updated = await db.messages.get(message.id);
    expect(updated?.text).toBe('Yeni mesaj');
  });

  it('mesaj bulunamazsa hata fırlatmalı', async () => {
    await expect(updateMessage('non-existent-id', 'Test')).rejects.toThrow(
      'Mesaj bulunamadı',
    );
  });

  it('mesaj boşsa hata fırlatmalı', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message = await addMessage(reminder.id, 'Test');
    await expect(updateMessage(message.id, '')).rejects.toThrow('Mesaj boş olamaz');
  });
});

describe('deleteMessage', () => {
  it('mesaj silmeli', async () => {
    const reminder = await createReminder('water', 'Test', ['09:00']);
    const message = await addMessage(reminder.id, 'Test');

    await deleteMessage(message.id);

    expect(await db.messages.get(message.id)).toBeUndefined();
  });

  it('mesaj bulunamazsa hata fırlatmalı', async () => {
    await expect(deleteMessage('non-existent-id')).rejects.toThrow('Mesaj bulunamadı');
  });
});

// ============================================================================
// COMPLETIONS TESTLERI
// ============================================================================

describe('addCompletion', () => {
  it('should add a valid completion', async () => {
    const id = await addCompletion({
      date: '2026-11-22',
      category: 'water',
      amount: 250,
      note: 'Test note',
      source: 'manual',
    });

    expect(id).toBeTruthy();

    const completion = await db.completions.get(id);
    expect(completion).toBeDefined();
    expect(completion!.date).toBe('2026-11-22');
    expect(completion!.category).toBe('water');
    expect(completion!.amount).toBe(250);
    expect(completion!.note).toBe('Test note');
    expect(completion!.source).toBe('manual');
    expect(completion!.at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
  });

  it('should use current time for at field if not provided', async () => {
    const before = Date.now();
    const id = await addCompletion({
      date: '2026-11-22',
      category: 'meal',
      source: 'reminder',
    });
    const after = Date.now();

    const completion = await db.completions.get(id);
    const completionTime = new Date(completion!.at).getTime();
    expect(completionTime).toBeGreaterThanOrEqual(before);
    expect(completionTime).toBeLessThanOrEqual(after);
  });

  it('should throw error for invalid date format', async () => {
    await expect(
      addCompletion({
        date: '22-11-2026', // Yanlış format
        category: 'water',
        source: 'manual',
      }),
    ).rejects.toThrow('Invalid date format');
  });

  it('should throw error for invalid calendar date', async () => {
    await expect(
      addCompletion({
        date: '2026-02-30', // Geçersiz takvim tarihi
        category: 'water',
        source: 'manual',
      }),
    ).rejects.toThrow('Invalid calendar date');
  });

  it('should throw error for invalid category', async () => {
    await expect(
      addCompletion({
        date: '2026-11-22',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: 'invalid' as any,
        source: 'manual',
      }),
    ).rejects.toThrow('Invalid category');
  });

  it('should throw error for negative amount', async () => {
    await expect(
      addCompletion({
        date: '2026-11-22',
        category: 'water',
        amount: -10,
        source: 'manual',
      }),
    ).rejects.toThrow('Amount must be a non-negative number');
  });

  it('should throw error for note longer than 500 characters', async () => {
    await expect(
      addCompletion({
        date: '2026-11-22',
        category: 'water',
        note: 'a'.repeat(501),
        source: 'manual',
      }),
    ).rejects.toThrow('Note must be a string with maximum 500 characters');
  });

  it('should throw error for invalid source', async () => {
    await expect(
      addCompletion({
        date: '2026-11-22',
        category: 'water',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: 'invalid' as any,
      }),
    ).rejects.toThrow('Invalid source');
  });
});

describe('deleteCompletion', () => {
  it('should delete a completion', async () => {
    const id = await addCompletion({
      date: '2026-11-22',
      category: 'water',
      source: 'manual',
    });

    await deleteCompletion(id);

    const completion = await db.completions.get(id);
    expect(completion).toBeUndefined();
  });
});

describe('listCompletions', () => {
  beforeEach(async () => {
    // Test verileri ekle
    await addCompletion({
      date: '2026-02-28',
      category: 'water',
      reminderId: 'reminder-1',
      source: 'manual',
    });

    await addCompletion({
      date: '2026-03-01',
      category: 'meal',
      reminderId: 'reminder-2',
      source: 'manual',
    });

    await addCompletion({
      date: '2026-03-02',
      category: 'water',
      reminderId: 'reminder-1',
      source: 'reminder',
    });

    await addCompletion({
      date: '2026-03-05',
      category: 'supplement',
      source: 'manual',
    });
  });

  it('should list completions in date range', async () => {
    const completions = await listCompletions({
      startDate: '2026-03-01',
      endDate: '2026-03-02',
    });

    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.date).sort()).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('should filter by category', async () => {
    const completions = await listCompletions({
      startDate: '2026-02-28',
      endDate: '2026-03-05',
      category: 'water',
    });

    expect(completions).toHaveLength(2);
    expect(completions.every((c) => c.category === 'water')).toBe(true);
  });

  it('should filter by reminderId', async () => {
    const completions = await listCompletions({
      startDate: '2026-02-28',
      endDate: '2026-03-05',
      reminderId: 'reminder-1',
    });

    expect(completions).toHaveLength(2);
    expect(completions.every((c) => c.reminderId === 'reminder-1')).toBe(true);
  });

  it('should return empty array if no completions match', async () => {
    const completions = await listCompletions({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(completions).toHaveLength(0);
  });

  it('should handle month boundary correctly', async () => {
    const completions = await listCompletions({
      startDate: '2026-02-28',
      endDate: '2026-03-01',
    });

    expect(completions).toHaveLength(2);
    const dates = completions.map((c) => c.date).sort();
    expect(dates).toEqual(['2026-02-28', '2026-03-01']);
  });
});

describe('deleteReminder with completions', () => {
  it('should not delete completions when reminder is deleted', async () => {
    // Hatırlatma oluştur
    const reminder = await createReminder('water', 'Test Su', ['09:00']);

    // Completion ekle
    const completionId = await addCompletion({
      date: '2026-11-22',
      category: 'water',
      reminderId: reminder.id,
      source: 'reminder',
    });

    // Hatırlatmayı sil
    await deleteReminder(reminder.id);

    // Completion hala var olmalı (yetim reminderId ile)
    const completion = await db.completions.get(completionId);
    expect(completion).toBeDefined();
    expect(completion!.reminderId).toBe(reminder.id);

    // Hatırlatma silinmiş olmalı
    const deletedReminder = await db.reminders.get(reminder.id);
    expect(deletedReminder).toBeUndefined();
  });
});
