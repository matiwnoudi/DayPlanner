import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages siteyi /depo-adi/ gibi bir alt yoldan sunar.
 * Cloudflare Pages ise alan adının kökünden sunar.
 * Bu yüzden kök adres .env içindeki VITE_BASE ile değişir.
 * Örnek: VITE_BASE=/DayPlanner/
 */
function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') {
    return '/'
  }
  const withLeading = value.startsWith('/') ? value : `/${value}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBase(env.VITE_BASE);

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: false,

        // Dev sunucusunda service worker kapalı
        devOptions: {
          enabled: false,
        },

        // Manifest içeriği
        manifest: {
          name: 'Rutin Test',
          short_name: 'Rutin Test',
          description: 'Hatırlatma ve rutin asistanı test uygulaması',
          lang: 'tr',
          start_url: base,
          scope: base,
          id: base,
          display: 'standalone',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        // Workbox seçenekleri - injectionPoint varsayılan (self.__WB_MANIFEST) kullanılır
        injectManifest: {
          // Precache patterns: JS/CSS/HTML + favicon.svg
          globPatterns: ['**/*.{js,css,html}'],
          // manifest.webmanifest ve ikonlar manifest.icons'dan otomatik eklenir
          // favicon.svg'yi manuel ekle
          additionalManifestEntries: [
            { url: 'favicon.svg', revision: null },
          ],
        },
      }),
    ],
    define: {
      // Build zamanını uygulamaya enjekte et
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
