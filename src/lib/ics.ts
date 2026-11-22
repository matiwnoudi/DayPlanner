/**
 * iCalendar (.ics) dosya üretimi
 *
 * RFC 5545: iCalendar format
 * - CRLF satır sonları (\r\n)
 * - 75 oktet (byte) satır uzunluğu sınırı (UTF-8)
 * - Kaçış kuralları (TEXT tipi için)
 * - Yüzen yerel saat (TZID yok, Z yok)
 * - VALARM zorunlu alanlar
 *
 * TODO-VERIFY: iOS Safari standalone PWA'da .ics teslim davranışı:
 * - Web Share API File paylaşımı çalışıyor mu?
 * - Blob URL + download attribute Safari'de çalışıyor mu?
 * - Takvim uygulaması otomatik açılıyor mu?
 */

/**
 * iCalendar için metin kaçışı (RFC 5545 TEXT tipi)
 *
 * Sıra ÖNEMLİ:
 * 1. \ → \\
 * 2. ; → \;
 * 3. , → \,
 * 4. \r\n ve \n → literal iki karakter '\n' (ters eğik çizgi + n)
 *
 * @param text - Ham metin
 * @returns Kaçışlanmış metin
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\') // \ → \\
    .replace(/;/g, '\\;') // ; → \;
    .replace(/,/g, '\\,') // , → \,
    .replace(/\r\n/g, '\\n') // \r\n → \n (literal)
    .replace(/\n/g, '\\n'); // \n → \n (literal)
}

/**
 * Satır katlama (line folding) - RFC 5545
 *
 * Her satır en fazla 75 OKTET (UTF-8 byte).
 * Devam satırı tek boşlukla başlar.
 * Karakter ortasından BÖLÜNMEZ (multibyte UTF-8).
 *
 * @param line - Katlanacak satır
 * @returns CRLF ile ayrılmış satırlar
 */
export function foldLine(line: string): string {
  const maxOctets = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= maxOctets) {
    return line;
  }

  const lines: string[] = [];
  let currentByteIndex = 0;

  while (currentByteIndex < bytes.length) {
    let targetByteIndex = currentByteIndex + maxOctets;
    
    // Devam satırlarında ilk karakter boşluk (1 byte), gerçek içerik 74 byte
    if (lines.length > 0) {
      targetByteIndex = currentByteIndex + maxOctets - 1; // 1 byte boşluk için yer aç
    }

    if (targetByteIndex >= bytes.length) {
      targetByteIndex = bytes.length;
    }

    // UTF-8 karakter sınırı bul (karakter ortasından bölme yasak)
    // UTF-8'de devam byte'ları 10xxxxxx formatındadır
    while (targetByteIndex > currentByteIndex && (bytes[targetByteIndex] & 0xc0) === 0x80) {
      targetByteIndex--;
    }

    // Slice ve decode et
    const chunk = bytes.slice(currentByteIndex, targetByteIndex);
    const decoded = new TextDecoder().decode(chunk);

    if (lines.length > 0) {
      // Devam satırı: boşlukla başla
      lines.push(' ' + decoded);
    } else {
      // İlk satır
      lines.push(decoded);
    }

    currentByteIndex = targetByteIndex;
  }

  return lines.join('\r\n');
}

/**
 * Satır katlamayı geri al (unfold)
 *
 * Test için: fold sonra unfold = orijinal
 *
 * @param folded - Katlanmış içerik
 * @returns Orijinal satırlar
 */
export function unfoldLines(folded: string): string {
  // CRLF + SPACE veya LF + SPACE → sil (devam satırı)
  return folded.replace(/\r?\n /g, '');
}

/**
 * Tarih objesini yüzen yerel saat formatına çevir
 *
 * Format: YYYYMMDD'T'HHmmss (TZID yok, Z yok)
 * Cihazın yerel saati kullanılır.
 *
 * @param date - Tarih objesi
 * @returns iCalendar DATE-TIME formatı
 */
export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = '00';

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Tarih objesini UTC formatına çevir (DTSTAMP için)
 *
 * Format: YYYYMMDD'T'HHmmss'Z'
 *
 * @param date - Tarih objesi
 * @returns iCalendar UTC DATE-TIME formatı
 */
export function formatUtcDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * iCalendar etkinlik verisi
 */
export interface IcsEvent {
  summary: string; // Etkinlik başlığı
  description: string; // Açıklama
  start: Date; // Başlangıç zamanı (yerel)
}

/**
 * iCalendar (.ics) dosyası üret
 *
 * @param events - Etkinlik listesi
 * @param now - Şu anki zaman (DTSTAMP için)
 * @returns .ics dosya içeriği (CRLF satır sonları)
 */
export function buildIcs(events: IcsEvent[], now: Date): string {
  const lines: string[] = [];

  // VCALENDAR başlangıç
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//DayPlanner//Rutin Deneme//TR');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('X-WR-CALNAME:Rutin Deneme');

  // Her etkinlik için VEVENT
  events.forEach((event) => {
    const uid = crypto.randomUUID() + '@dayplanner';
    const dtstamp = formatUtcDateTime(now);
    const dtstart = formatLocalDateTime(event.start);

    // DTEND = DTSTART + 5 dakika
    const dtend = new Date(event.start.getTime() + 5 * 60 * 1000);
    const dtendStr = formatLocalDateTime(dtend);

    const summary = escapeIcsText(event.summary);
    const description = escapeIcsText(event.description);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtendStr}`);
    lines.push(foldLine(`SUMMARY:${summary}`));
    lines.push(foldLine(`DESCRIPTION:${description}`));

    // VALARM (TRIGGER:PT0M = etkinlik başlangıcında)
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('TRIGGER:PT0M');
    lines.push(foldLine(`DESCRIPTION:${description}`));
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  // VCALENDAR bitiş
  lines.push('END:VCALENDAR');

  // CRLF ile birleştir
  return lines.join('\r\n') + '\r\n';
}
