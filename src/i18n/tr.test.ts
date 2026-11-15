import { describe, expect, it } from 'vitest'
import { tr } from './tr.ts'

describe('Türkçe metinler', () => {
  it('uygulama adını içerir', () => {
    expect(tr.appName).toBe('Rutin Test')
  })

  it('altı sayfanın başlığı dolu', () => {
    const titles = Object.values(tr.nav)
    expect(titles).toHaveLength(6)
    for (const title of titles) {
      expect(title.trim().length).toBeGreaterThan(0)
    }
  })
})
