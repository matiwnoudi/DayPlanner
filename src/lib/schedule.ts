/**
 * Schedule Functions
 *
 * Hatırlatma zamanlaması için saf fonksiyonlar.
 * Saat dilimi desteği: Intl API kullanır, yaz/kış saati geçişlerini otomatik işler.
 */

/**
 * Sıradaki hatırlatma zamanını hesaplar
 *
 * @param now - Şu anki zaman (genellikle new Date())
 * @param times - Saatler dizisi (HH:mm formatında, örn: ["09:00", "13:00", "21:00"])
 * @param timeZone - IANA saat dilimi (örn: "Europe/Istanbul", "Asia/Tehran", "Europe/Berlin")
 * @returns Sıradaki hatırlatma zamanı veya null (times boşsa)
 *
 * Davranış:
 * - Bugünün sıradaki saatini veya yarının ilk saatini döndürür
 * - Saatler "yüzen yerel saat" olarak saklanır (HH:mm), saat dilimi kaydedilmez
 * - Yaz/kış saati geçişlerinde Intl.DateTimeFormat kullanır
 * - Var olmayan saatler (DST ileri): o günün ilk geçerli anından sonra seçilir
 * - İki kez yaşanan saatler (DST geri): ilk oluşum seçilir
 */
export function nextOccurrence(
  now: Date,
  times: string[],
  timeZone: string,
): Date | null {
  if (times.length === 0) {
    return null;
  }

  // Saat listesini sırala ve tekilleştir (tekrarlı/sırasız times'ı desteklemek için)
  const uniqueSortedTimes = Array.from(new Set(times)).sort();

  // now'ı saat dilimine göre HH:mm formatına çevir
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const nowInTZ = formatter.format(now);
  const [nowHoursStr, nowMinutesStr] = nowInTZ.split(':');
  const nowTimeString = `${nowHoursStr}:${nowMinutesStr}`;

  // Bugünün sıradaki saatini bul
  for (const time of uniqueSortedTimes) {
    if (time > nowTimeString) {
      // Bugünün bu saatini döndür
      return createDateInTimeZone(now, time, timeZone, 0);
    }
  }

  // Bugünün tüm saatleri geçmiş, yarının ilk saatini döndür
  return createDateInTimeZone(now, uniqueSortedTimes[0], timeZone, 1);
}

/**
 * Belirtilen saat diliminde belirli bir saat için Date nesnesi oluşturur
 *
 * Strateji: Saat diliminde "wall clock" zamanı (örn: Berlin'de 14:30) için
 * UTC karşılığını bulmak. Bu, offset hesaplama gerekt irir.
 *
 * @param baseDate - Temel tarih (bugün veya yarın hesabı için)
 * @param time - Hedef saat (HH:mm formatında)
 * @param timeZone - IANA saat dilimi
 * @param daysOffset - Gün offset'i (0: bugün, 1: yarın)
 * @returns Date nesnesi (UTC zaman damgası)
 */
function createDateInTimeZone(
  baseDate: Date,
  time: string,
  timeZone: string,
  daysOffset: number,
): Date {
  const [hours, minutes] = time.split(':').map(Number);

  // baseDate'in saat dilimindeki tarih bileşenlerini al
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(baseDate);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value);
  const day = parseInt(parts.find((p) => p.type === 'day')!.value);

  // Hedef tarihi hesapla (gün offset'li)
  const targetDay = day + daysOffset;

  // İstenen "wall clock" zamanını temsil eden bir UTC Date oluştur (placeholder)
  // Sonra offset'i düzelteceğiz
  const placeholder = new Date(Date.UTC(year, month - 1, targetDay, hours, minutes, 0));

  // Bu placeholder Date'in saat diliminde nasıl göründüğünü bul
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const tzParts = tzFormatter.formatToParts(placeholder);
  const tzYear = parseInt(tzParts.find((p) => p.type === 'year')!.value);
  const tzMonth = parseInt(tzParts.find((p) => p.type === 'month')!.value);
  const tzDay = parseInt(tzParts.find((p) => p.type === 'day')!.value);
  const tzHour = parseInt(tzParts.find((p) => p.type === 'hour')!.value);
  const tzMinute = parseInt(tzParts.find((p) => p.type === 'minute')!.value);

  // Placeholder UTC'de hours:minutes'da, ama saat diliminde tzHour:tzMinute'da görünüyor
  // İstenen: saat diliminde hours:minutes görünsün
  // Fark: (hours*60+minutes) - (tzHour*60+tzMinute) dakika
  const wantedMinutes = hours * 60 + minutes;
  const currentMinutes = tzHour * 60 + tzMinute;
  const diffMinutes = wantedMinutes - currentMinutes;

  // Tarih farkını da hesaba kat (DST geçişlerinde gün kayabilir)
  const wantedDateUTC = Date.UTC(year, month - 1, targetDay);
  const currentDateUTC = Date.UTC(tzYear, tzMonth - 1, tzDay);
  const diffDays = (wantedDateUTC - currentDateUTC) / (1000 * 60 * 60 * 24);

  // Düzeltilmiş UTC zamanı
  return new Date(placeholder.getTime() + diffMinutes * 60000 + diffDays * 24 * 60 * 60000);
}

/**
 * Mesajlardan rastgele birini seçer (art arda aynı mesaj yok)
 *
 * @param messages - Mesaj dizisi ({id, text})
 * @param lastId - Son seçilen mesajın id'si (null ise ilk seçim)
 * @param rng - Rastgele sayı üreteci (varsayılan: Math.random, test için inject edilebilir)
 * @returns Seçilen mesaj veya null (messages boşsa)
 *
 * Davranış:
 * - Tek mesaj varsa her zaman aynı mesajı döndürür
 * - İki veya daha fazla mesaj varsa, lastId ile aynı id'yi seçmeye çalışmaz
 * - lastId ile aynı id'ye sahip tek mesaj varsa, onu döndürür (seçenek yok)
 */
export function pickMessage(
  messages: Array<{ id: string; text: string }>,
  lastId: string | null,
  rng: () => number = Math.random,
): { id: string; text: string } | null {
  if (messages.length === 0) {
    return null;
  }

  if (messages.length === 1) {
    return messages[0];
  }

  // lastId varsa ve başka seçenek varsa, lastId'yi çıkar
  const candidates =
    lastId !== null
      ? messages.filter((m) => m.id !== lastId)
      : messages;

  // Eğer candidates boşsa (tüm mesajlar lastId'ye eşit - olmaması gereken durum),
  // tüm listeyi kullan
  const finalCandidates = candidates.length > 0 ? candidates : messages;

  // Rastgele seç
  const index = Math.floor(rng() * finalCandidates.length);
  return finalCandidates[index];
}
