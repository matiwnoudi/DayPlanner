import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

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
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: normalizeBase(env.VITE_BASE),
    plugins: [react()],
  }
})
