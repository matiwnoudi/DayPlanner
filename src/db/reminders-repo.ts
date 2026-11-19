/**
 * Reminders Repository
 *
 * Hatırlatma ve mesaj CRUD işlemleri.
 * Tüm işlemler transaction içinde, hata yönetimi ile.
 */

import { db, type Reminder, type Message, type ReminderType } from './schema';

/**
 * Yeni hatırlatma oluşturur
 *
 * @param type - Hatırlatma türü
 * @param title - Başlık
 * @param times - Saatler dizisi (HH:mm formatında, sıralı, tekrarsız)
 * @returns Oluşturulan hatırlatma
 * @throws Başlık boşsa veya saatler geçersizse hata fırlatır
 */
export async function createReminder(
  type: ReminderType,
  title: string,
  times: string[],
): Promise<Reminder> {
  // Doğrulama
  if (!title || title.trim().length === 0) {
    throw new Error('Başlık boş olamaz');
  }

  if (title.length > 100) {
    throw new Error('Başlık en fazla 100 karakter olabilir');
  }

  // Saatleri sırala, tekilleştir, doğrula
  const validatedTimes = validateAndSortTimes(times);

  if (validatedTimes.length > 12) {
    throw new Error('En fazla 12 saat eklenebilir');
  }

  const reminder: Reminder = {
    id: crypto.randomUUID(),
    type,
    title: title.trim(),
    times: validatedTimes,
    enabled: true,
    createdAt: Date.now(),
  };

  await db.reminders.add(reminder);
  return reminder;
}

/**
 * Hatırlatma günceller
 *
 * @param id - Hatırlatma id
 * @param updates - Güncellenecek alanlar
 * @throws Hatırlatma bulunamazsa hata fırlatır
 */
export async function updateReminder(
  id: string,
  updates: Partial<Pick<Reminder, 'title' | 'times' | 'type'>>,
): Promise<void> {
  const reminder = await db.reminders.get(id);
  if (!reminder) {
    throw new Error(`Hatırlatma bulunamadı: ${id}`);
  }

  // Doğrulama
  if (updates.title !== undefined) {
    if (!updates.title || updates.title.trim().length === 0) {
      throw new Error('Başlık boş olamaz');
    }
    if (updates.title.length > 100) {
      throw new Error('Başlık en fazla 100 karakter olabilir');
    }
  }

  if (updates.times !== undefined) {
    updates.times = validateAndSortTimes(updates.times);
    if (updates.times.length > 12) {
      throw new Error('En fazla 12 saat eklenebilir');
    }
  }

  const finalUpdates: Partial<Reminder> = {};
  if (updates.title !== undefined) finalUpdates.title = updates.title.trim();
  if (updates.times !== undefined) finalUpdates.times = updates.times;
  if (updates.type !== undefined) finalUpdates.type = updates.type;

  await db.reminders.update(id, finalUpdates);
}

/**
 * Hatırlatma aktif/pasif durumunu ayarlar
 *
 * @param id - Hatırlatma id
 * @param enabled - Aktif/pasif
 */
export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const reminder = await db.reminders.get(id);
  if (!reminder) {
    throw new Error(`Hatırlatma bulunamadı: ${id}`);
  }

  await db.reminders.update(id, { enabled });
}

/**
 * Hatırlatma siler (bağlı mesajlarıyla birlikte, tek transaction)
 *
 * @param id - Hatırlatma id
 * @throws Hatırlatma bulunamazsa hata fırlatır
 */
export async function deleteReminder(id: string): Promise<void> {
  const reminder = await db.reminders.get(id);
  if (!reminder) {
    throw new Error(`Hatırlatma bulunamadı: ${id}`);
  }

  // Transaction: hatırlatma + bağlı mesajlar
  await db.transaction('rw', [db.reminders, db.messages], async () => {
    // Önce mesajları sil
    await db.messages.where('reminderId').equals(id).delete();
    // Sonra hatırlatmayı sil
    await db.reminders.delete(id);
  });
}

/**
 * Yeni mesaj ekler
 *
 * @param reminderId - Hatırlatma id
 * @param text - Mesaj metni
 * @param lang - Dil kodu (varsayılan: "tr")
 * @returns Oluşturulan mesaj
 * @throws Mesaj boşsa veya hatırlatma bulunamazsa hata fırlatır
 */
export async function addMessage(
  reminderId: string,
  text: string,
  lang: string = 'tr',
): Promise<Message> {
  // Hatırlatma var mı kontrol et
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) {
    throw new Error(`Hatırlatma bulunamadı: ${reminderId}`);
  }

  // Doğrulama
  if (!text || text.trim().length === 0) {
    throw new Error('Mesaj boş olamaz');
  }

  if (text.length > 500) {
    throw new Error('Mesaj en fazla 500 karakter olabilir');
  }

  const message: Message = {
    id: crypto.randomUUID(),
    reminderId,
    text: text.trim(),
    lang,
  };

  await db.messages.add(message);
  return message;
}

/**
 * Mesaj günceller
 *
 * @param id - Mesaj id
 * @param text - Yeni mesaj metni
 * @throws Mesaj bulunamazsa hata fırlatır
 */
export async function updateMessage(id: string, text: string): Promise<void> {
  const message = await db.messages.get(id);
  if (!message) {
    throw new Error(`Mesaj bulunamadı: ${id}`);
  }

  // Doğrulama
  if (!text || text.trim().length === 0) {
    throw new Error('Mesaj boş olamaz');
  }

  if (text.length > 500) {
    throw new Error('Mesaj en fazla 500 karakter olabilir');
  }

  await db.messages.update(id, { text: text.trim() });
}

/**
 * Mesaj siler
 *
 * @param id - Mesaj id
 * @throws Mesaj bulunamazsa hata fırlatır
 */
export async function deleteMessage(id: string): Promise<void> {
  const message = await db.messages.get(id);
  if (!message) {
    throw new Error(`Mesaj bulunamadı: ${id}`);
  }

  await db.messages.delete(id);
}

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

/**
 * Saatleri doğrular, sıralar ve tekilleştirir
 *
 * @param times - Saat dizisi (HH:mm formatında)
 * @returns Sıralı, tekrarsız saat dizisi
 * @throws Geçersiz format varsa hata fırlatır
 */
function validateAndSortTimes(times: string[]): string[] {
  const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (const time of times) {
    if (!HH_MM_REGEX.test(time)) {
      throw new Error(`Geçersiz saat formatı: ${time} (HH:mm bekleniyor)`);
    }
  }

  // Sırala ve tekilleştir
  return Array.from(new Set(times)).sort();
}
