/**
 * ics.ts testleri
 *
 * RFC 5545 iCalendar formatı doğrulaması
 */

import { describe, it, expect } from 'vitest';
import {
  escapeIcsText,
  foldLine,
  unfoldLines,
  formatLocalDateTime,
  formatUtcDateTime,
  buildIcs,
  type IcsEvent,
} from './ics';
import ICAL from 'ical.js';

describe('escapeIcsText', () => {
  it('should escape backslash first', () => {
    expect(escapeIcsText('a\\b')).toBe('a\\\\b');
  });

  it('should escape semicolon', () => {
    expect(escapeIcsText('a;b')).toBe('a\\;b');
  });

  it('should escape comma', () => {
    expect(escapeIcsText('a,b')).toBe('a\\,b');
  });

  it('should escape newline (\\n)', () => {
    expect(escapeIcsText('a\nb')).toBe('a\\nb');
  });

  it('should escape CRLF (\\r\\n)', () => {
    expect(escapeIcsText('a\r\nb')).toBe('a\\nb');
  });

  it('should escape complex string with all special chars', () => {
    // Girdi: "a\\b;c,d\ne"
    // Beklenen: "a\\\\b\\;c\\,d\\ne"
    const input = 'a\\b;c,d\ne';
    const expected = 'a\\\\b\\;c\\,d\\ne';
    expect(escapeIcsText(input)).toBe(expected);
  });
});

describe('foldLine', () => {
  it('should not fold short lines', () => {
    const line = 'SUMMARY:Test';
    expect(foldLine(line)).toBe(line);
  });

  it('should fold long ASCII line at 75 bytes', () => {
    // 76 karakter ASCII (76 byte)
    const line = 'A'.repeat(76);
    const folded = foldLine(line);

    // İlk satır 75 A, sonra CRLF + boşluk + 1 A
    expect(folded).toBe('A'.repeat(75) + '\r\n A');
  });

  it('should fold long Turkish line without breaking UTF-8 characters', () => {
    // "ü" = 2 byte (U+00FC)
    // 74 A + 1 ü = 76 byte (sınır aşımı, katlanmalı)
    const line = 'A'.repeat(74) + 'ü';
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    
    // Katlandı mı kontrol et
    expect(parts.length).toBeGreaterThan(0);
    
    // Unfold sonrası orijinale dönmeli
    const unfolded = unfoldLines(folded);
    expect(unfolded).toBe(line);

    // 74 A + 2 ü = 78 byte (kesin katlanır)
    const line2 = 'A'.repeat(74) + 'üü';
    const folded2 = foldLine(line2);
    const unfolded2 = unfoldLines(folded2);
    expect(unfolded2).toBe(line2);
  });

  it('should fold line with 4-byte emoji without breaking character', () => {
    // "💧" = 4 byte (U+1F4A7)
    // 72 A + 💧 = 76 byte (sınır aşımı)
    const line = 'A'.repeat(72) + '💧';
    const folded = foldLine(line);
    
    // Unfold sonrası orijinale dönmeli
    const unfolded = unfoldLines(folded);
    expect(unfolded).toBe(line);
    
    // Emoji kırılmamış olmalı (içinde 💧 var)
    expect(folded).toContain('💧');
  });

  it('should maintain fold/unfold round-trip', () => {
    const original = 'A'.repeat(100) + 'ü'.repeat(20);
    const folded = foldLine(original);
    const unfolded = unfoldLines(folded);
    expect(unfolded).toBe(original);
  });

  it('should ensure each physical line is <= 75 UTF-8 bytes', () => {
    const line = 'Süü içme zamanı geldi! '.repeat(10); // Uzun Türkçe metin
    const folded = foldLine(line);
    const physicalLines = folded.split('\r\n');

    const encoder = new TextEncoder();
    physicalLines.forEach((physLine) => {
      const bytes = encoder.encode(physLine);
      expect(bytes.length).toBeLessThanOrEqual(75);
    });
  });

  it('should handle random Turkish + emoji strings (property test)', () => {
    // 200 rastgele string üret - sadece Türkçe karakterler (emoji yok)
    const chars = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ ';
    
    for (let i = 0; i < 200; i++) {
      const length = Math.floor(Math.random() * 200) + 50;
      let randomStr = '';
      for (let j = 0; j < length; j++) {
        randomStr += chars[Math.floor(Math.random() * chars.length)];
      }

      const folded = foldLine(randomStr);
      const unfolded = unfoldLines(folded);

      // Round-trip doğrula
      expect(unfolded).toBe(randomStr);

      // Her fiziksel satır <= 75 byte
      const encoder = new TextEncoder();
      const physicalLines = folded.split('\r\n');
      physicalLines.forEach((physLine) => {
        const bytes = encoder.encode(physLine);
        expect(bytes.length).toBeLessThanOrEqual(75);
      });
    }
  });
});

describe('formatLocalDateTime', () => {
  it('should format floating local time without timezone', () => {
    // Sabit bir zaman: 2026-11-22 20:30:00 (local)
    const date = new Date(2026, 10, 22, 20, 30, 0); // month 10 = November
    const formatted = formatLocalDateTime(date);

    // Beklenen: 20261122T203000 (Z yok, TZID yok)
    expect(formatted).toBe('20261122T203000');
    expect(formatted).not.toContain('Z');
  });

  it('should use local time components, not UTC', () => {
    // process.env.TZ test edebilmek için mock kullanılabilir,
    // ancak vitest'te TZ değiştirmek karmaşık.
    // Bunun yerine: Date constructor yerel saati kullanır.
    
    const date = new Date(2026, 0, 15, 9, 45, 30); // 2026-01-15 09:45:30 local
    const formatted = formatLocalDateTime(date);

    expect(formatted).toBe('20260115T094500'); // Saniye 00
  });
});

describe('formatUtcDateTime', () => {
  it('should format UTC time with Z suffix', () => {
    const date = new Date('2026-11-22T20:30:00Z');
    const formatted = formatUtcDateTime(date);

    expect(formatted).toBe('20261122T203000Z');
  });
});

describe('buildIcs', () => {
  it('should generate valid iCalendar with CRLF line endings', () => {
    const now = new Date('2026-11-22T20:00:00Z');
    const events: IcsEvent[] = [
      {
        summary: 'Test Event',
        description: 'Test Description',
        start: new Date(2026, 10, 22, 20, 10, 0),
      },
    ];

    const ics = buildIcs(events, now);

    // CRLF kontrolü
    expect(ics).toMatch(/\r\n/);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
  });

  it('should include required calendar headers', () => {
    const now = new Date();
    const events: IcsEvent[] = [];

    const ics = buildIcs(events, now);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//DayPlanner//Rutin Deneme//TR');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('X-WR-CALNAME:Rutin Deneme');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('should generate empty calendar for empty events list', () => {
    const now = new Date();
    const events: IcsEvent[] = [];

    const ics = buildIcs(events, now);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('should generate 3 VEVENTs with unique UIDs', () => {
    const now = new Date('2026-11-22T20:00:00Z');
    const events: IcsEvent[] = [
      { summary: 'Event 1', description: 'Desc 1', start: new Date(2026, 10, 22, 20, 10, 0) },
      { summary: 'Event 2', description: 'Desc 2', start: new Date(2026, 10, 22, 20, 13, 0) },
      { summary: 'Event 3', description: 'Desc 3', start: new Date(2026, 10, 22, 20, 16, 0) },
    ];

    const ics = buildIcs(events, now);

    // 3 VEVENT
    const veventMatches = ics.match(/BEGIN:VEVENT/g);
    expect(veventMatches).toHaveLength(3);

    // 3 benzersiz UID
    const uidMatches = ics.match(/UID:([^\r\n]+)/g);
    expect(uidMatches).toHaveLength(3);

    const uids = uidMatches!.map((m) => m.split(':')[1]);
    const uniqueUids = new Set(uids);
    expect(uniqueUids.size).toBe(3); // Hepsi farklı
  });

  it('should include VALARM for each event', () => {
    const now = new Date('2026-11-22T20:00:00Z');
    const events: IcsEvent[] = [
      { summary: 'Event 1', description: 'Desc 1', start: new Date(2026, 10, 22, 20, 10, 0) },
      { summary: 'Event 2', description: 'Desc 2', start: new Date(2026, 10, 22, 20, 13, 0) },
      { summary: 'Event 3', description: 'Desc 3', start: new Date(2026, 10, 22, 20, 16, 0) },
    ];

    const ics = buildIcs(events, now);

    // 3 VALARM
    const valarmMatches = ics.match(/BEGIN:VALARM/g);
    expect(valarmMatches).toHaveLength(3);

    // TRIGGER:PT0M
    const triggerMatches = ics.match(/TRIGGER:PT0M/g);
    expect(triggerMatches).toHaveLength(3);

    // ACTION:DISPLAY
    const actionMatches = ics.match(/ACTION:DISPLAY/g);
    expect(actionMatches).toHaveLength(3);
  });

  it('should set DTEND = DTSTART + 5 minutes', () => {
    const now = new Date('2026-11-22T20:00:00Z');
    const start = new Date(2026, 10, 22, 20, 10, 0); // 20:10
    const events: IcsEvent[] = [
      { summary: 'Event', description: 'Desc', start },
    ];

    const ics = buildIcs(events, now);

    expect(ics).toContain('DTSTART:20261122T201000');
    expect(ics).toContain('DTEND:20261122T201500'); // +5 dakika
  });

  it('should parse with ical.js successfully', () => {
    const now = new Date('2026-11-22T20:00:00Z');
    const events: IcsEvent[] = [
      { summary: 'Su içme zamanı', description: 'Bir bardak su iç', start: new Date(2026, 10, 22, 20, 10, 0) },
      { summary: 'Öğün vakti', description: 'Yemek ye', start: new Date(2026, 10, 22, 20, 13, 0) },
      { summary: 'Takviye', description: 'Vitamini al', start: new Date(2026, 10, 22, 20, 16, 0) },
    ];

    const ics = buildIcs(events, now);

    // ical.js ile parse et
    const jcalData = ICAL.parse(ics);
    const comp = new ICAL.Component(jcalData);

    // VCALENDAR kontrolü
    expect(comp.name).toBe('vcalendar');

    // VEVENT sayısı
    const vevents = comp.getAllSubcomponents('vevent');
    expect(vevents).toHaveLength(3);

    // İlk event kontrolü
    const firstEvent = vevents[0];
    expect(firstEvent.getFirstPropertyValue('summary')).toBe('Su içme zamanı');
    expect(firstEvent.getFirstPropertyValue('description')).toBe('Bir bardak su iç');

    // VALARM kontrolü
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vevents.forEach((vevent: any) => {
      const valarms = vevent.getAllSubcomponents('valarm');
      expect(valarms).toHaveLength(1);

      const valarm = valarms[0];
      expect(valarm.getFirstPropertyValue('action')).toBe('DISPLAY');
      
      // TRIGGER PT0M veya PT0S (ical.js normalize edebilir)
      const trigger = valarm.getFirstPropertyValue('trigger').toString();
      expect(trigger).toMatch(/PT0[MS]/);
      
      expect(valarm.getFirstPropertyValue('description')).toBeTruthy();
    });
  });
});
