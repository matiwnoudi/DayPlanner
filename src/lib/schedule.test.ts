/**
 * Schedule Functions Tests
 */

import { describe, it, expect } from 'vitest';
import { nextOccurrence, pickMessage } from './schedule';

describe('nextOccurrence', () => {
  it('bugünün sıradaki saatini bulmalı', () => {
    // now: 10:00, times: [09:00, 13:00, 21:00] → 13:00 bugün
    const now = new Date('2027-03-15T10:00:00Z'); // UTC 10:00
    const times = ['09:00', '13:00', '21:00'];
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2027-03-15T13:00:00.000Z');
  });

  it('bugünün son saati geçmişse yarının ilkini bulmalı', () => {
    // now: 22:00, times: [09:00, 13:00, 21:00] → 09:00 yarın
    const now = new Date('2027-03-15T22:00:00Z'); // UTC 22:00
    const times = ['09:00', '13:00', '21:00'];
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2027-03-16T09:00:00.000Z');
  });

  it('Asia/Tehran - bugünün sıradaki saatini bulmalı (UTC+03:30 sabit)', () => {
    // now: 2026-11-20T10:00:00Z (Tehran 13:30)
    // times: [09:00, 13:00, 21:00] → 21:00 bugün (Tehran time)
    // 21:00 Tehran = UTC 17:30 (UTC+03:30)
    const now = new Date('2026-11-20T10:00:00Z');
    const times = ['09:00', '13:00', '21:00'];
    const timeZone = 'Asia/Tehran';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-11-20T17:30:00.000Z');
  });

  it('Asia/Tehran - yarının ilk saatini bulmalı', () => {
    // now: 2026-11-20T18:00:00Z (Tehran 21:30, tüm saatler geçmiş)
    // times: [09:00, 13:00, 21:00] → 09:00 yarın (Tehran time)
    // 09:00 Tehran = UTC 05:30 (UTC+03:30)
    const now = new Date('2026-11-20T18:00:00Z');
    const times = ['09:00', '13:00', '21:00'];
    const timeZone = 'Asia/Tehran';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-11-21T05:30:00.000Z');
  });

  it('Europe/Berlin - gece yarısı sınır durumu', () => {
    // now: 2026-11-20T22:50:00Z (Berlin 23:50 CET, UTC+1)
    // times: [00:15] → 00:15 yarın (Berlin time)
    // 00:15 Berlin CET = UTC 23:15 aynı gün (UTC 23:15 = Berlin 00:15 ertesi gün)
    const now = new Date('2026-11-20T22:50:00Z');
    const times = ['00:15'];
    const timeZone = 'Europe/Berlin';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-11-20T23:15:00.000Z');
  });

  it('Europe/Berlin - var olmayan saat (DST ileri, 2027-03-28 02:30)', () => {
    // 2027-03-28 02:00 CET → 03:00 CEST (02:00-02:59 yok)
    // now: 2027-03-28T00:00:00Z (Berlin 01:00 CET)
    // times: [02:30] → 02:30 yok, ileri kayar: 03:30 CEST
    // 03:30 CEST = UTC 01:30 (CEST = UTC+2)
    const now = new Date('2027-03-28T00:00:00Z');
    const times = ['02:30'];
    const timeZone = 'Europe/Berlin';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2027-03-28T01:30:00.000Z');
  });

  it('Europe/Berlin - iki kez yaşanan saat (DST geri, 2026-10-25 02:30)', () => {
    // 2026-10-25 03:00 CEST → 02:00 CET (02:00-02:59 iki kez)
    // İlk 02:30 CEST = UTC 00:30 (CEST = UTC+2)
    // İkinci 02:30 CET = UTC 01:30 (CET = UTC+1)
    // now: 2026-10-25T00:00:00Z (Berlin 02:00 CEST, ilk oluşum öncesi)
    // times: [02:30] → ilk oluşum: 02:30 CEST = UTC 00:30
    const now = new Date('2026-10-25T00:00:00Z');
    const times = ['02:30'];
    const timeZone = 'Europe/Berlin';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('now tam saatin kendisinde (Asia/Tehran 13:00)', () => {
    // now: 2026-11-20T09:30:00Z (Tehran 13:00 tam)
    // times: [13:00] → 13:00 geçti, yarının 13:00'ü
    // 13:00 Tehran yarın = UTC 09:30 yarın
    const now = new Date('2026-11-20T09:30:00Z');
    const times = ['13:00'];
    const timeZone = 'Asia/Tehran';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2026-11-21T09:30:00.000Z');
    expect(result!.getTime()).toBeGreaterThan(now.getTime());
  });

  it('boş times dizisi için null döndürmeli', () => {
    const now = new Date('2027-03-15T10:00:00Z');
    const times: string[] = [];
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).toBeNull();
  });

  it('sırasız ve tekrarlı times dizisini düzgün işlemeli', () => {
    // times: [13:00, 09:00, 21:00, 13:00] → [09:00, 13:00, 21:00]
    const now = new Date('2027-03-15T10:00:00Z'); // UTC 10:00
    const times = ['13:00', '09:00', '21:00', '13:00']; // Tekrarlı ve sırasız
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe('2027-03-15T13:00:00.000Z');
  });
});

describe('pickMessage', () => {
  it('tek mesaj varsa her zaman aynı mesajı döndürmeli', () => {
    const messages = [{ id: '1', text: 'Su iç!' }];
    const result = pickMessage(messages, null);

    expect(result).toEqual(messages[0]);
  });

  it('iki mesaj varsa lastId ile aynı olmayanı seçmeli', () => {
    const messages = [
      { id: '1', text: 'Su iç!' },
      { id: '2', text: 'Sağlığın için su iç!' },
    ];

    // lastId=1 → id=2 seçilmeli
    const result = pickMessage(messages, '1', () => 0); // rng=0 → index=0

    expect(result?.id).toBe('2');
  });

  it('üç mesaj varsa rastgele seçim yapmalı', () => {
    const messages = [
      { id: '1', text: 'Su iç!' },
      { id: '2', text: 'Sağlığın için su iç!' },
      { id: '3', text: 'Unutma, su iç!' },
    ];

    // rng=0.5 → index=1 (3 mesaj, 0.5*3=1.5 → floor=1)
    const result = pickMessage(messages, null, () => 0.5);

    expect(result).toEqual(messages[1]);
  });

  it('lastId varken diğer mesajlardan rastgele seçmeli', () => {
    const messages = [
      { id: '1', text: 'Su iç!' },
      { id: '2', text: 'Sağlığın için su iç!' },
      { id: '3', text: 'Unutma, su iç!' },
    ];

    // lastId=2 → candidates=[id=1, id=3]
    // rng=0 → index=0 → id=1
    const result = pickMessage(messages, '2', () => 0);

    expect(result?.id).toBe('1');

    // rng=0.99 → index=1 → id=3
    const result2 = pickMessage(messages, '2', () => 0.99);

    expect(result2?.id).toBe('3');
  });

  it('boş messages dizisi için null döndürmeli', () => {
    const messages: Array<{ id: string; text: string }> = [];
    const result = pickMessage(messages, null);

    expect(result).toBeNull();
  });

  it('lastId ile eşleşmeyen mesaj yoksa (olmaması gereken durum) tüm listeden seçmeli', () => {
    const messages = [
      { id: '1', text: 'Su iç!' },
      { id: '1', text: 'Aynı id ama farklı mesaj' }, // Normalde olmamalı
    ];

    // lastId=1 → candidates=[] → finalCandidates=messages (tüm liste)
    const result = pickMessage(messages, '1', () => 0);

    expect(result).toEqual(messages[0]);
  });
});


describe('nextOccurrence - property-based tests', () => {
  it('2026-2027 arası her gün, çoklu saat dilimi, property kontrolleri', { timeout: 10000 }, () => {
    const timeZones = ['Europe/Berlin', 'Asia/Tehran', 'America/New_York', 'Asia/Kolkata', 'UTC'];
    const times = ['00:15', '02:30', '09:00', '23:45'];
    const failures: string[] = [];

    // 2026-01-01'den 2027-12-31'e kadar
    const startDate = new Date('2026-01-01T00:00:00Z');
    const endDate = new Date('2027-12-31T23:59:59Z');

    // Her gün için test (performance için her 7 günde bir)
    for (let day = startDate; day <= endDate; day.setUTCDate(day.getUTCDate() + 7)) {
      for (const tz of timeZones) {
        // Her gün için farklı now zamanları
        const nows = [
          new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0)),
          new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 6, 0, 0)),
          new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0)),
          new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 18, 0, 0)),
        ];

        for (const now of nows) {
          const result = nextOccurrence(now, times, tz);

          if (!result) {
            failures.push(`${tz} ${now.toISOString()}: null result`);
            continue;
          }

          // Property (a): result > now
          if (result.getTime() <= now.getTime()) {
            failures.push(`${tz} ${now.toISOString()}: result <= now (${result.toISOString()})`);
          }

          // Property (b): result - now ≤ 26 saat
          const diffHours = (result.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours > 26) {
            failures.push(
              `${tz} ${now.toISOString()}: diff ${diffHours.toFixed(1)}h > 26h (${result.toISOString()})`,
            );
          }

          // Property (c): sonucun tz'deki yerel saat:dakika times'tan biri
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const resultTime = formatter.format(result);

          if (!times.includes(resultTime)) {
            // Var olmayan saat kontrolü (DST gap)
            // Gap sonrası saat olup olmadığını kontrol et
            const [resultHour, resultMinute] = resultTime.split(':').map(Number);
            const resultMinutes = resultHour * 60 + resultMinute;

            // times'daki en yakın saati bul
            const timeMinutes = times.map((t) => {
              const [h, m] = t.split(':').map(Number);
              return h * 60 + m;
            });

            const isAfterGap = timeMinutes.some((tm) => resultMinutes > tm && resultMinutes - tm <= 120);

            if (!isAfterGap) {
              failures.push(
                `${tz} ${now.toISOString()}: result time ${resultTime} not in times and not after gap`,
              );
            }
          }
        }
      }
    }

    // Başarısız örnekleri yazdır (ilk 10)
    if (failures.length > 0) {
      console.log(`Property test failures (${failures.length} total):`);
      failures.slice(0, 10).forEach((f) => console.log(`  ${f}`));
    }

    expect(failures).toEqual([]);
  });
});
