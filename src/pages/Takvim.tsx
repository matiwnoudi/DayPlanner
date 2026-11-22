/**
 * Takvim (.ics) Sayfası
 *
 * Hatırlatmaları iPhone Takvim'e aktarmak için .ics dosyası üretir.
 * İlk aşama: Deneme takvimi (3 sabit mesaj, +10/+13/+16 dakika).
 *
 * TODO-VERIFY: iOS Safari standalone PWA'da teslim yöntemleri:
 * 1. Web Share API (navigator.share with files)
 * 2. Blob URL + download attribute
 * 3. Textarea (kopyala-yapıştır)
 * Hangisi çalışıyor? X-WR-CALNAME iOS'ta kullanılıyor mu?
 */

import { useState } from 'react';
import { Page } from '../components/Page';
import { tr } from '../i18n/tr';
import { buildIcs, type IcsEvent } from '../lib/ics';

// Deneme mesajları (sabit, kısa Türkçe)
const DEMO_MESSAGES = [
  { summary: 'Su içme zamanı', description: 'Bir bardak su için' },
  { summary: 'Öğün vakti', description: 'Yemek yeme zamanı' },
  { summary: 'Takviyeni almayı unutma', description: 'Günlük takviye' },
];

type DeliveryMethod = 'share' | 'download' | 'text' | null;

export function TakvimPage() {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(null);
  const [icsContent, setIcsContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  /**
   * Deneme takvimini üret ve teslim et
   */
  const handleDownloadDemo = async () => {
    setError('');
    setDeliveryMethod(null);
    setIcsContent('');

    try {
      // Şu an + 10, 13, 16 dakika
      const now = new Date();
      const events: IcsEvent[] = [];

      [10, 13, 16].forEach((offsetMinutes, index) => {
        const start = new Date(now.getTime() + offsetMinutes * 60 * 1000);
        const message = DEMO_MESSAGES[index % DEMO_MESSAGES.length];

        events.push({
          summary: message.summary,
          description: message.description,
          start,
        });
      });

      // .ics üret (eşzamanlı)
      const icsData = buildIcs(events, now);
      setIcsContent(icsData);

      // Teslim: 3 yol dene
      // 1. Web Share API
      if (navigator.canShare && navigator.canShare({ files: [] as File[] })) {
        try {
          const file = new File([icsData], 'rutin-deneme.ics', { type: 'text/calendar' });

          await navigator.share({
            files: [file],
            title: 'Rutin Deneme Takvimi',
          });

          setDeliveryMethod('share');
          return;
        } catch (err: any) {
          // AbortError: kullanıcı vazgeçti (hata sayma)
          if (err.name === 'AbortError') {
            return;
          }

          // Diğer hatalar: fallback'e geç
          console.warn('Web Share API failed:', err);
        }
      }

      // 2. Blob URL + download attribute
      try {
        const blob = new Blob([icsData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'rutin-deneme.ics';
        a.click();

        URL.revokeObjectURL(url);

        setDeliveryMethod('download');
        return;
      } catch (err) {
        console.warn('Blob download failed:', err);
      }

      // 3. Metin göster (seçilebilir textarea)
      setDeliveryMethod('text');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    }
  };

  return (
    <Page title={tr.takvim.title}>
      <div style={{ padding: '1rem' }}>
        <button onClick={handleDownloadDemo} className="button" style={{ marginBottom: '1rem' }}>
          {tr.takvim.downloadDemo}
        </button>

        {error && (
          <div
            style={{
              padding: '0.5rem',
              marginBottom: '1rem',
              background: 'var(--bg-danger)',
              color: 'var(--fg-danger)',
              borderRadius: '0.5rem',
            }}
          >
            {error}
          </div>
        )}

        {deliveryMethod && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--fg-secondary)',
              marginBottom: '1rem',
            }}
          >
            {deliveryMethod === 'share' && `✓ ${tr.takvim.deliveryMethodShare}`}
            {deliveryMethod === 'download' && `✓ ${tr.takvim.deliveryMethodDownload}`}
            {deliveryMethod === 'text' && `✓ ${tr.takvim.deliveryMethodText}`}
          </div>
        )}

        {deliveryMethod === 'text' && icsContent && (
          <textarea
            value={icsContent}
            readOnly
            style={{
              width: '100%',
              height: '300px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}
          />
        )}

        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
        >
          <p style={{ margin: 0 }}>{tr.takvim.instructions}</p>
        </div>
      </div>
    </Page>
  );
}
