/**
 * Kurulum Sayfası
 *
 * Ana ekrana ekleme talimatları ve cihaz tanılama
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/Page';
import { tr } from '../i18n/tr';
import {
  isIOS,
  isStandalone,
  isSafariLike,
  getDeviceInfo,
  checkStoragePersisted,
  type DeviceInfo,
} from '../lib/install';

// Package.json'dan sürüm
const APP_VERSION = '0.0.0'; // Manuel güncelleme gerekir, build time'da inject edilebilir

type InstallState = 'desktop' | 'ios-safari' | 'ios-non-safari' | 'ios-standalone';

export function KurulumPage() {
  const [installState, setInstallState] = useState<InstallState>('desktop');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Dev mode: durum önizlemesi
  const [devPreview, setDevPreview] = useState<InstallState | null>(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const ios = isIOS(userAgent);
    const standalone = isStandalone(navigator, window);
    const safariLike = isSafariLike(userAgent);

    // Durum belirleme
    let state: InstallState = 'desktop';
    if (ios) {
      if (standalone) {
        state = 'ios-standalone';
      } else if (safariLike) {
        state = 'ios-safari';
      } else {
        state = 'ios-non-safari';
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstallState(state);

    // Cihaz bilgilerini topla
    const info = getDeviceInfo(navigator, window, APP_VERSION);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeviceInfo(info);

    // Storage persisted kontrolü (async)
    checkStoragePersisted(navigator).then((persisted) => {
      setDeviceInfo((prev) => (prev ? { ...prev, isPersisted: persisted } : null));
    });
  }, []);

  // Dev mode override
  const activeState = isDev && devPreview ? devPreview : installState;

  const handleCopyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // Clipboard API başarısız, kullanıcı manuel kopyalayabilir
    }
  };

  const handleCopyDiagnostics = async () => {
    if (!deviceInfo) return;

    const diagnosticsText = `
Cihaz Tanılama - Rutin Test

Ana ekran uygulaması: ${deviceInfo.standalone ? 'Evet' : 'Hayır'}
Service Worker: ${deviceInfo.hasServiceWorker ? 'Evet' : 'Hayır'}
Notification API: ${deviceInfo.hasNotification ? 'Evet' : 'Hayır'}
Push Manager: ${deviceInfo.hasPushManager ? 'Evet' : 'Hayır'}
Depolama kalıcı: ${deviceInfo.isPersisted === null ? 'Kontrol ediliyor...' : deviceInfo.isPersisted ? 'Evet' : 'Hayır'}
Çevrimiçi: ${deviceInfo.isOnline ? 'Evet' : 'Hayır'}
Ekran genişliği: ${deviceInfo.screenWidth}px
Saat dilimi: ${deviceInfo.timeZone}
Notification izni: ${deviceInfo.notificationPermission}
Yayın adresi: ${deviceInfo.appUrl}
Uygulama sürümü: ${deviceInfo.appVersion}
User Agent: ${deviceInfo.userAgent}
`.trim();

    try {
      await navigator.clipboard.writeText(diagnosticsText);
      setDiagnosticsCopied(true);
      setTimeout(() => setDiagnosticsCopied(false), 2000);
    } catch {
      // Clipboard başarısız, textarea göster
      setDiagnosticsCopied(false);
    }
  };

  return (
    <Page title={tr.kurulum.title}>
      {/* Dev mode önizleme seçici */}
      {isDev && (
        <div className="dev-preview">
          <h3>{tr.kurulum.devPreview.title}</h3>
          <div className="dev-preview-buttons">
            <button onClick={() => setDevPreview(null)} disabled={!devPreview}>
              Gerçek durum
            </button>
            <button onClick={() => setDevPreview('desktop')}>
              {tr.kurulum.devPreview.desktop}
            </button>
            <button onClick={() => setDevPreview('ios-safari')}>
              {tr.kurulum.devPreview.iosSafari}
            </button>
            <button onClick={() => setDevPreview('ios-non-safari')}>
              {tr.kurulum.devPreview.iosNonSafari}
            </button>
            <button onClick={() => setDevPreview('ios-standalone')}>
              {tr.kurulum.devPreview.iosStandalone}
            </button>
          </div>
        </div>
      )}

      {/* Durum: Masaüstü / iOS değil */}
      {activeState === 'desktop' && (
        <div className="install-notice">
          <p className="notice-emoji">📱</p>
          <h2>{tr.kurulum.notIPhone}</h2>
          <p>{tr.kurulum.notIPhoneNote}</p>
        </div>
      )}

      {/* Durum: iOS + Safari dışı tarayıcı */}
      {activeState === 'ios-non-safari' && (
        <div className="install-notice">
          <p className="notice-emoji">🧭</p>
          <h2>{tr.kurulum.needSafari}</h2>
          <p>{tr.kurulum.needSafariNote}</p>

          <div className="install-steps">
            <div className="install-step">
              <strong>{tr.kurulum.needSafariStep1}</strong>
              <button onClick={handleCopyUrl} className="btn-primary">
                {urlCopied ? tr.kurulum.urlCopied : tr.kurulum.copyUrl}
              </button>
            </div>
            <div className="install-step">
              <strong>{tr.kurulum.needSafariStep2}</strong>
            </div>
            <div className="install-step">
              <strong>{tr.kurulum.needSafariStep3}</strong>
            </div>
          </div>

          <p className="install-alt-note">{tr.kurulum.needSafariAlt}</p>
        </div>
      )}

      {/* Durum: iOS + Safari + Standalone değil */}
      {activeState === 'ios-safari' && (
        <div className="install-instructions">
          <h2>{tr.kurulum.installInstructions.title}</h2>
          <p>{tr.kurulum.installInstructions.intro}</p>

          <div className="install-steps">
            {/* Adım 1: Paylaş düğmesi */}
            <div className="install-step">
              <div className="step-content">
                <strong>{tr.kurulum.installInstructions.step1}</strong>
                <div className="share-icon-container">
                  <div className="share-icon" aria-label="Paylaş simgesi">
                    <div className="share-arrow"></div>
                  </div>
                </div>
                <p className="step-note">{tr.kurulum.installInstructions.step1Icon}</p>
                <p className="step-warning">{tr.kurulum.installInstructions.step1Note}</p>
              </div>
            </div>

            {/* Adım 2: Ana Ekrana Ekle */}
            <div className="install-step">
              <div className="step-content">
                <strong>{tr.kurulum.installInstructions.step2}</strong>
                <div className="menu-item">
                  <span className="menu-icon">➕</span>
                  <span>Ana Ekrana Ekle</span>
                </div>
                <p className="step-note">{tr.kurulum.installInstructions.step2Note}</p>
              </div>
            </div>

            {/* Adım 3: Ekle */}
            <div className="install-step">
              <div className="step-content">
                <strong>{tr.kurulum.installInstructions.step3}</strong>
                <p className="step-warning">{tr.kurulum.installInstructions.step3Note}</p>
              </div>
            </div>

            {/* Adım 4: Ana ekrandan aç */}
            <div className="install-step">
              <div className="step-content">
                <strong>{tr.kurulum.installInstructions.step4}</strong>
                <p className="step-note">{tr.kurulum.installInstructions.step4Note}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Durum: iOS + Standalone (kurulu) */}
      {activeState === 'ios-standalone' && (
        <div className="install-success">
          <p className="success-emoji">✓</p>
          <h2>{tr.kurulum.installed}</h2>
          <p>{tr.kurulum.installedNote}</p>
          <Link to="/bildirimler" className="btn-primary">
            {tr.kurulum.continueToNotifications}
          </Link>
        </div>
      )}

      {/* Cihaz Tanılama */}
      {deviceInfo && (
        <div className="diagnostics-section">
          <button
            className="diagnostics-toggle"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            {tr.kurulum.diagnostics.title} {showDiagnostics ? '▼' : '▶'}
          </button>

          {showDiagnostics && (
            <div className="diagnostics-content">
              <p className="diagnostics-description">{tr.kurulum.diagnostics.description}</p>

              <dl className="diagnostics-list">
                <dt>{tr.kurulum.diagnostics.standalone}</dt>
                <dd>{deviceInfo.standalone ? tr.kurulum.diagnostics.yes : tr.kurulum.diagnostics.no}</dd>

                <dt>{tr.kurulum.diagnostics.serviceWorker}</dt>
                <dd>{deviceInfo.hasServiceWorker ? tr.kurulum.diagnostics.yes : tr.kurulum.diagnostics.no}</dd>

                <dt>{tr.kurulum.diagnostics.notification}</dt>
                <dd>{deviceInfo.hasNotification ? tr.kurulum.diagnostics.yes : tr.kurulum.diagnostics.no}</dd>

                <dt>{tr.kurulum.diagnostics.pushManager}</dt>
                <dd>{deviceInfo.hasPushManager ? tr.kurulum.diagnostics.yes : tr.kurulum.diagnostics.no}</dd>

                <dt>{tr.kurulum.diagnostics.persisted}</dt>
                <dd>
                  {deviceInfo.isPersisted === null
                    ? tr.kurulum.diagnostics.checking
                    : deviceInfo.isPersisted
                      ? tr.kurulum.diagnostics.yes
                      : tr.kurulum.diagnostics.no}
                </dd>

                <dt>{tr.kurulum.diagnostics.online}</dt>
                <dd>{deviceInfo.isOnline ? tr.kurulum.diagnostics.yes : tr.kurulum.diagnostics.no}</dd>

                <dt>{tr.kurulum.diagnostics.notificationPermission}</dt>
                <dd>{deviceInfo.notificationPermission}</dd>

                <dt>{tr.kurulum.diagnostics.screenWidth}</dt>
                <dd>{deviceInfo.screenWidth}px</dd>

                <dt>{tr.kurulum.diagnostics.timeZone}</dt>
                <dd>{deviceInfo.timeZone}</dd>

                <dt>{tr.kurulum.diagnostics.appUrl}</dt>
                <dd style={{ wordBreak: 'break-all' }}>{deviceInfo.appUrl}</dd>

                <dt>{tr.kurulum.diagnostics.appVersion}</dt>
                <dd>{deviceInfo.appVersion}</dd>

                <dt>{tr.kurulum.diagnostics.iosVersion}</dt>
                <dd>{tr.kurulum.diagnostics.iosVersionNote}</dd>

                <dt>{tr.kurulum.diagnostics.userAgent}</dt>
                <dd style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
                  {deviceInfo.userAgent}
                </dd>
              </dl>

              <button onClick={handleCopyDiagnostics} className="btn-secondary">
                {diagnosticsCopied
                  ? tr.kurulum.diagnostics.copied
                  : tr.kurulum.diagnostics.copy}
              </button>

              {!diagnosticsCopied && diagnosticsCopied === false && (
                <p className="copy-failed-note">{tr.kurulum.diagnostics.copyFailed}</p>
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
