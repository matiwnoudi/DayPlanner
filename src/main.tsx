import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { bootstrap } from './db'
import './styles.css'

// Veritabanını başlat (arka planda, render'ı bloklamaz)
bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error)
})

const root = document.getElementById('root')
if (!root) {
  throw new Error('root elementi yok')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
