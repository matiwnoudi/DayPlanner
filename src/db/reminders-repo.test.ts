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
} from './reminders-repo';
import { db } from './schema';

// Her testten önce veritabanını temizle
beforeEach(async () => {
  await db.reminders.clear();
  await db.messages.clear();
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
