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
    expect(result?.getUTCHours()).toBe(13);
    expect(result?.getUTCMinutes()).toBe(0);
    expect(result?.getUTCDate()).toBe(15); // Aynı gün
  });

  it('bugünün son saati geçmişse yarının ilkini bulmalı', () => {
    // now: 22:00, times: [09:00, 13:00, 21:00] → 09:00 yarın
    const now = new Date('2027-03-15T22:00:00Z'); // UTC 22:00
    const times = ['09:00', '13:00', '21:00'];
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.getUTCHours()).toBe(9);
    expect(result?.getUTCMinutes()).toBe(0);
    expect(result?.getUTCDate()).toBe(16); // Ertesi gün
  });

  it('gece yarısı sınır durumunu işlemeli', () => {
    // now: 23:50, times: [00:15] → 00:15 yarın
    const now = new Date('2027-03-15T23:50:00Z');
    const times = ['00:15'];
    const timeZone = 'UTC';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    expect(result?.getUTCHours()).toBe(0);
    expect(result?.getUTCMinutes()).toBe(15);
    expect(result?.getUTCDate()).toBe(16); // Ertesi gün
  });

  it('Europe/Berlin yaz saati geçişi - var olmayan saat (2027-03-28 02:30)', () => {
    // 2027-03-28 02:00'de saat 03:00'e atlar (02:00-02:59 arası yok)
    // now: 2027-03-28 01:00 CET (UTC+1)
    // times: [02:30] → var olmayan saat
    // Sonuç: 02:30 için oluşturulan Date, 03:30 CEST (UTC+2) olarak yorumlanır veya geri döner
    // DST davranışı browser/ortama bağlı
    const now = new Date('2027-03-28T00:00:00Z'); // UTC 00:00 = CET 01:00
    const times = ['02:30'];
    const timeZone = 'Europe/Berlin';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    // DST nedeniyle 02:30 mevcut değil
    // Davranış: Intl API bu saati ilerletebilir veya geri çevirebilir
    // Test: sonuç o gün içinde olmalı (UTC 28 Mart)
    expect(result?.getUTCDate()).toBe(28);
    // Test: saat makul aralıkta olmalı (UTC 00:00 - 03:00 arası)
    const utcHour = result?.getUTCHours() || 0;
    expect(utcHour).toBeGreaterThanOrEqual(0);
    expect(utcHour).toBeLessThanOrEqual(3);
  });

  it('Europe/Berlin kış saati geçişi - iki kez yaşanan saat (2026-10-25 02:30)', () => {
    // 2026-10-25 03:00'de saat 02:00'e geri döner (02:00-02:59 arası iki kez yaşanır)
    // İlk 02:30: CEST (UTC+2) = UTC 00:30
    // İkinci 02:30: CET (UTC+1) = UTC 01:30
    // now: 2026-10-25 00:00 UTC (CEST 02:00 - ilk oluşum öncesi)
    const now = new Date('2026-10-25T00:00:00Z'); // UTC 00:00 = CEST 02:00
    const times = ['02:30'];
    const timeZone = 'Europe/Berlin';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    // Davranış: Intl API ilk veya ikinci oluşumu seçebilir (ortama bağlı)
    // Test: sonuç bugün olmalı, makul saat aralığında (UTC 00:00 - 02:00)
    expect(result?.getUTCDate()).toBe(25);
    const utcHour = result?.getUTCHours() || 0;
    expect(utcHour).toBeGreaterThanOrEqual(0);
    expect(utcHour).toBeLessThanOrEqual(2);
  });

  it('Asia/Tehran sabit UTC+03:30 (2022 sonrası)', () => {
    // İran 2022 sonrası yaz saati uygulamıyor, sabit UTC+03:30
    // Ancak bu test ortamın tz veritabanına bağlı
    // now: 2027-07-15 10:00 UTC = 13:30 Tehran time
    // times: [14:00, 18:00] → 14:00 bugün
    const now = new Date('2027-07-15T10:00:00Z'); // UTC 10:00
    const times = ['14:00', '18:00'];
    const timeZone = 'Asia/Tehran';

    const result = nextOccurrence(now, times, timeZone);

    expect(result).not.toBeNull();
    // Tehran 14:00 = UTC 10:30
    // Ancak ortam tz veritabanı güncel değilse yaz saati uygulayabilir (UTC+04:30)
    // Test: sonuç bugün olmalı ve 14:00 civarı (Tehran time)
    const tehranHour = parseInt(
      result!.toLocaleString('en-US', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        hour12: false,
      }),
    );
    expect(tehranHour).toBe(14);
    expect(result?.getUTCDate()).toBe(15); // Aynı gün
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
    expect(result?.getUTCHours()).toBe(13); // Bugünün sıradaki saati
    expect(result?.getUTCMinutes()).toBe(0);
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
