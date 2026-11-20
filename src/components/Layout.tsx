import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { tr } from '../i18n/index.ts'

const links = [
  { to: '/', label: tr.nav.kurulum, end: true },
  { to: '/bildirimler', label: tr.nav.bildirimler, end: false },
  { to: '/hatirlatmalar', label: tr.nav.hatirlatmalar, end: false },
  { to: '/gunluk', label: tr.nav.gunluk, end: false },
  { to: '/takvim', label: tr.nav.takvim, end: false },
  { to: '/kontrol', label: tr.nav.kontrol, end: false },
] as const

export function Layout() {
  const tabbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const tabbar = tabbarRef.current
    if (!tabbar) return

    // İlk ölçüm
    const updateTabbarHeight = () => {
      const height = tabbar.offsetHeight
      document.documentElement.style.setProperty('--tabbar-h', `${height}px`)
    }

    updateTabbarHeight()

    // ResizeObserver ile dinamik ölçüm
    const observer = new ResizeObserver(() => {
      updateTabbarHeight()
    })

    observer.observe(tabbar)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <p className="app-name">{tr.appName}</p>
        <p className="phase-note">{tr.phaseNote}</p>
      </header>
      <main>
        <Outlet />
      </main>
      <nav ref={tabbarRef} className="tabbar" aria-label={tr.navLabel}>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
