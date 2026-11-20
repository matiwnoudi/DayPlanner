/**
 * UpdatePrompt Bileşeni
 *
 * Service Worker güncellemelerini yönetir:
 * 1. Yeni sürüm varsa "Yenile" düğmesi gösterir
 * 2. İlk kez önbelleğe alınınca "Çevrimdışı hazır" mesajı gösterir
 */

import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

type ToastType = 'update' | 'offline-ready' | null;

export function UpdatePrompt() {
  const [toastType, setToastType] = useState<ToastType>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker kayıtlı:', registration);
      
      // Güncelleme kontrolü sadece online ise yap
      if (registration && navigator.onLine) {
        // Periyodik güncelleme kontrolü (1 saatte bir)
        setInterval(() => {
          if (navigator.onLine) {
            registration.update();
          }
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker kayıt hatası:', error);
    },
  });

  // vite-plugin-pwa pattern: needRefresh veya offlineReady değişince toast göster
  // Bu effect sadece UI state senkronizasyonu için kullanılıyor
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (needRefresh) {
      setToastType('update');
    } else if (offlineReady) {
      setToastType('offline-ready');
      // Offline-ready mesajı 6 saniye sonra otomatik kapansın
      const timer = setTimeout(() => {
        setToastType(null);
        setOfflineReady(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, offlineReady, setOfflineReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const close = () => {
    setToastType(null);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    // SKIP_WAITING mesajını service worker'a gönder
    updateServiceWorker(true);
  };

  if (!toastType) {
    return null;
  }

  return (
    <div className="update-prompt">
      <div className="update-prompt-content">
        {toastType === 'update' && (
          <>
            <p>Yeni sürüm var</p>
            <div className="update-prompt-buttons">
              <button onClick={handleUpdate} className="btn-primary">
                Yenile
              </button>
              <button onClick={close} className="btn-secondary">
                Sonra
              </button>
            </div>
          </>
        )}

        {toastType === 'offline-ready' && (
          <>
            <p>✓ Çevrimdışı kullanıma hazır</p>
            <button onClick={close} className="btn-secondary">
              Tamam
            </button>
          </>
        )}
      </div>
    </div>
  );
}
