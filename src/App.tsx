import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { BildirimlerPage } from './pages/Bildirimler.tsx'
import { GunlukPage } from './pages/Gunluk.tsx'
import { HatirlatmalarPage } from './pages/Hatirlatmalar.tsx'
import { KontrolPage } from './pages/Kontrol.tsx'
import { KurulumPage } from './pages/Kurulum.tsx'
import { TakvimPage } from './pages/Takvim.tsx'

/**
 * HashRouter: adres #/sayfa biçimindedir.
 * GitHub Pages gibi düz dosya sunucuları /sayfa isteğini index.html'e
 * yönlendirmez. Kare (#) sonrası sunucuya gitmez, bu yüzden sayfa yenilense de açılır.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<KurulumPage />} />
          <Route path="bildirimler" element={<BildirimlerPage />} />
          <Route path="hatirlatmalar" element={<HatirlatmalarPage />} />
          <Route path="gunluk" element={<GunlukPage />} />
          <Route path="takvim" element={<TakvimPage />} />
          <Route path="kontrol" element={<KontrolPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
