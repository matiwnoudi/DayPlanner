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

  // Saat listesini sırala ve tekilleştir
  const uniqueSortedTimes = Array.from(new Set(times)).sort();

  // now'ın saat dilimindeki yerel tarihini al
  const formatter = getDateFormatter(timeZone);
  const parts = formatter.formatToParts(now);
  const nowYear = parseInt(parts.find((p) => p.type === 'year')!.value);
  const nowMonth = parseInt(parts.find((p) => p.type === 'month')!.value);
  const nowDay = parseInt(parts.find((p) => p.type === 'day')!.value);

  // dayOffset 0, 1, 2 için kontrol et (bugün, yarın, öbür gün)
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    // Hedef tarihi hesapla (JavaScript Date kullanarak takvim aritmetiği)
    const targetDate = new Date(Date.UTC(nowYear, nowMonth - 1, nowDay));
    targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
    const targetYear = targetDate.getUTCFullYear();
    const targetMonth = targetDate.getUTCMonth() + 1;
    const targetDay = targetDate.getUTCDate();

    // Bu günün tüm saatleri için instant hesapla
    for (const time of uniqueSortedTimes) {
      const [hour, minute] = time.split(':').map(Number);
      const instant = wallToInstant(targetYear, targetMonth, targetDay, hour, minute, timeZone);

      // instant > now ise bulduk
      if (instant && instant.getTime() > now.getTime()) {
        return instant;
      }
    }
  }

  // 3 gün içinde bulunamadı (olmaması gereken durum)
  return null;
}

/**
 * Saat dilimindeki belirli bir offset'i hesaplar
 *
 * @param timeZone - IANA saat dilimi
 * @param instant - UTC timestamp (Date)
 * @returns Offset milisaniye cinsinden (UTC - local time)
 */
function getOffsetMs(timeZone: string, instant: Date): number {
  // instant'ın saat dilimindeki yerel tarih/saatini al
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(instant);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value);
  const day = parseInt(parts.find((p) => p.type === 'day')!.value);
  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value);
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value);
  const second = parseInt(parts.find((p) => p.type === 'second')!.value);

  // Bu yerel zamanı UTC olarak yorumla
  const wallAsUTC = Date.UTC(year, month - 1, day, hour, minute, second);

  // Offset = wallAsUTC - instant
  return wallAsUTC - instant.getTime();
}

/**
 * Saat dilimindeki wall clock zamanını UTC instant'a çevirir
 *
 * @param year - Yıl
 * @param month - Ay (1-12)
 * @param day - Gün
 * @param hour - Saat (0-23)
 * @param minute - Dakika (0-59)
 * @param timeZone - IANA saat dilimi
 * @returns Date nesnesi (UTC instant) veya null (geçersizse)
 *
 * Algoritma:
 * - Wall clock zamanını UTC olarak yorumla (wallAsUTC)
 * - wallAsUTC - 24h ve wallAsUTC + 24h anlarındaki offset'leri hesapla
 * - Her farklı offset için aday instant hesapla: wallAsUTC - offset
 * - Adayın yerel tarih/saati tam (y,m,d,h,m) ise geçerli aday
 * - İki kez yaşanan saat: EN KÜÇÜK instant'ı dön (ilk oluşum)
 * - Var olmayan saat: önceki offset'i kullan
 */
function wallToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  // Wall clock zamanını UTC olarak yorumla
  const wallAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0);

  // 24 saat öncesi ve sonrası anlarındaki offset'leri hesapla
  const oneDayMs = 24 * 60 * 60 * 1000;
  const offsetBefore = getOffsetMs(timeZone, new Date(wallAsUTC - oneDayMs));
  const offsetAfter = getOffsetMs(timeZone, new Date(wallAsUTC + oneDayMs));

  // Farklı offset'leri topla
  const offsets = Array.from(new Set([offsetBefore, offsetAfter]));

  const candidates: Date[] = [];

  // Her offset için aday instant hesapla
  for (const offset of offsets) {
    const candidateInstant = new Date(wallAsUTC - offset);

    // Adayın yerel tarih/saatini kontrol et
    const formatter = getDateTimeFormatter(timeZone);
    const parts = formatter.formatToParts(candidateInstant);
    const cYear = parseInt(parts.find((p) => p.type === 'year')!.value);
    const cMonth = parseInt(parts.find((p) => p.type === 'month')!.value);
    const cDay = parseInt(parts.find((p) => p.type === 'day')!.value);
    const cHour = parseInt(parts.find((p) => p.type === 'hour')!.value);
    const cMinute = parseInt(parts.find((p) => p.type === 'minute')!.value);

    // Tam eşleşme mi?
    if (cYear === year && cMonth === month && cDay === day && cHour === hour && cMinute === minute) {
      candidates.push(candidateInstant);
    }
  }

  // Geçerli aday varsa EN KÜÇÜĞÜNÜ dön (iki kez yaşanan saatte ilk oluşum)
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0];
  }

  // Geçerli aday yok (var olmayan saat): önceki offset'i kullan
  return new Date(wallAsUTC - offsetBefore);
}

/**
 * Sıradaki hatırlatma zamanını formatlar
 *
 * @param nextDate - Sıradaki hatırlatma zamanı (nextOccurrence'tan)
 * @param now - Şu anki zaman
 * @param enabled - Hatırlatma açık mı
 * @param timeZone - IANA saat dilimi
 * @returns "Kapalı" | "Bugün HH:mm" | "Yarın HH:mm" | ""
 *
 * Davranış:
 * - enabled false ise "Kapalı"
 * - nextDate null ise ""
 * - nextDate bugünse "Bugün HH:mm"
 * - nextDate yarınsa "Yarın HH:mm"
 * - Diğer durumlarda "" (olmaması gereken)
 */
export function formatNext(
  nextDate: Date | null,
  now: Date,
  enabled: boolean,
  timeZone: string,
): string {
  if (!enabled) {
    return 'Kapalı';
  }

  if (!nextDate) {
    return '';
  }

  // now ve nextDate'in saat dilimindeki tarihlerini al
  const dateFormatter = getDateFormatter(timeZone);
  const timeFormatter = getTimeFormatter(timeZone);

  const nowParts = dateFormatter.formatToParts(now);
  const nextParts = dateFormatter.formatToParts(nextDate);

  const nowYear = parseInt(nowParts.find((p) => p.type === 'year')!.value);
  const nowMonth = parseInt(nowParts.find((p) => p.type === 'month')!.value);
  const nowDay = parseInt(nowParts.find((p) => p.type === 'day')!.value);

  const nextYear = parseInt(nextParts.find((p) => p.type === 'year')!.value);
  const nextMonth = parseInt(nextParts.find((p) => p.type === 'month')!.value);
  const nextDay = parseInt(nextParts.find((p) => p.type === 'day')!.value);

  // Yarını hesapla
  const tomorrowDate = new Date(Date.UTC(nowYear, nowMonth - 1, nowDay));
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrowYear = tomorrowDate.getUTCFullYear();
  const tomorrowMonth = tomorrowDate.getUTCMonth() + 1;
  const tomorrowDay = tomorrowDate.getUTCDate();

  // Saati formatla (HH:mm)
  const timeParts = timeFormatter.formatToParts(nextDate);
  const hour = timeParts.find((p) => p.type === 'hour')!.value;
  const minute = timeParts.find((p) => p.type === 'minute')!.value;
  const timeStr = `${hour}:${minute}`;

  // Bugün mü?
  if (nextYear === nowYear && nextMonth === nowMonth && nextDay === nowDay) {
    return `Bugün ${timeStr}`;
  }

  // Yarın mı?
  if (nextYear === tomorrowYear && nextMonth === tomorrowMonth && nextDay === tomorrowDay) {
    return `Yarın ${timeStr}`;
  }

  // Diğer durumlar (olmaması gereken)
  return '';
}

/**
 * Intl.DateTimeFormat önbelleği (saat dilimi başına)
 */
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  }
  return dateFormatterCache.get(timeZone)!;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!timeFormatterCache.has(timeZone)) {
    timeFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    );
  }
  return timeFormatterCache.get(timeZone)!;
}

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!dateTimeFormatterCache.has(timeZone)) {
    dateTimeFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    );
  }
  return dateTimeFormatterCache.get(timeZone)!;
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
