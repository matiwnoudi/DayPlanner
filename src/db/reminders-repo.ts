/**
 * Reminders Repository
 *
 * Hatırlatma ve mesaj CRUD işlemleri.
 * Tüm işlemler transaction içinde, hata yönetimi ile.
 */

import { db, type Reminder, type Message, type ReminderType, type Completion } from './schema';

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
 * NOT: Completions tablosu SİLİNMEZ. Geçmiş tamamlama kayıtları korunur,
 * reminderId yetim kalabilir (kullanıcının geçmiş verisi).
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

// ============================================================================
// COMPLETIONS (Tamamlama kayıtları)
// ============================================================================

/**
 * Completion verisi doğrulama
 */
function validateCompletionData(data: {
  date: string;
  category: string;
  amount?: number;
  note?: string;
  source: string;
}): void {
  // Date: YYYY-MM-DD formatı ve geçerli takvim tarihi
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  // Takvim geçerliliği: ISO string ile karşılaştır (normalize olmamalı)
  const [year, month, day] = data.date.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  const reconstructed = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
  
  if (reconstructed !== data.date || isNaN(parsedDate.getTime())) {
    throw new Error('Invalid calendar date.');
  }

  // Category: enum kontrolü
  const validCategories = ['water', 'meal', 'supplement', 'workout'];
  if (!validCategories.includes(data.category)) {
    throw new Error(`Invalid category. Expected one of: ${validCategories.join(', ')}.`);
  }

  // Amount: >= 0 (opsiyonel)
  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || data.amount < 0) {
      throw new Error('Amount must be a non-negative number.');
    }
  }

  // Note: en fazla 500 karakter (opsiyonel)
  if (data.note !== undefined) {
    if (typeof data.note !== 'string' || data.note.length > 500) {
      throw new Error('Note must be a string with maximum 500 characters.');
    }
  }

  // Source: enum kontrolü
  const validSources = ['manual', 'reminder'];
  if (!validSources.includes(data.source)) {
    throw new Error(`Invalid source. Expected one of: ${validSources.join(', ')}.`);
  }
}

/**
 * Yeni completion kaydı ekle
 *
 * @param data - Completion verisi
 * @returns Promise<string> - Oluşturulan completion ID
 */
export async function addCompletion(data: {
  date: string;
  category: 'water' | 'meal' | 'supplement' | 'workout';
  reminderId?: string;
  amount?: number;
  note?: string;
  source: 'manual' | 'reminder';
  at?: string;
}): Promise<string> {
  // Validasyon
  validateCompletionData(data);

  const id = crypto.randomUUID();
  const at = data.at || new Date().toISOString();

  const completion: Completion = {
    id,
    date: data.date,
    category: data.category,
    reminderId: data.reminderId,
    amount: data.amount,
    note: data.note,
    at,
    source: data.source,
  };

  await db.completions.add(completion);
  return id;
}

/**
 * Completion kaydını sil
 *
 * @param id - Completion ID
 */
export async function deleteCompletion(id: string): Promise<void> {
  await db.completions.delete(id);
}

/**
 * Completion kayıtlarını listele
 *
 * @param opts - Filtre seçenekleri
 * @returns Promise<Completion[]> - Completion listesi
 */
export async function listCompletions(opts: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (dahil)
  category?: 'water' | 'meal' | 'supplement' | 'workout';
  reminderId?: string;
}): Promise<Completion[]> {
  let query = db.completions.where('date').between(opts.startDate, opts.endDate, true, true);

  if (opts.category) {
    query = query.and((c) => c.category === opts.category);
  }

  if (opts.reminderId) {
    query = query.and((c) => c.reminderId === opts.reminderId);
  }

  return await query.toArray();
}
