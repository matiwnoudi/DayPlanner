export const tr = {
  appName: 'Rutin Test',
  phaseNote: 'Deneme uygulaması. Sayfa içeriği sonraki adımlarda gelecek.',
  navLabel: 'Sayfalar',
  nav: {
    kurulum: 'Kurulum',
    bildirimler: 'Bildirimler',
    hatirlatmalar: 'Hatırlatmalar',
    gunluk: 'Test günlüğü',
    takvim: 'Takvim',
    kontrol: 'Kontrol listesi',
  },
  placeholders: {
    kurulum: 'Ana ekrana ekleme adımları bu sayfaya gelecek.',
    bildirimler: 'Bildirim izni ve abonelik bu sayfaya gelecek.',
    hatirlatmalar: 'Su, öğün ve vitamin hatırlatmaları bu sayfaya gelecek.',
    gunluk: 'Test kayıtları bu sayfaya gelecek.',
    takvim: 'Takvim dosyası dışa aktarma bu sayfaya gelecek.',
    kontrol: 'Elle doldurulan test listesi bu sayfaya gelecek.',
  },
} as const

export type Dictionary = typeof tr
