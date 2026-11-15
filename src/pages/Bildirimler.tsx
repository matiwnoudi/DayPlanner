import { tr } from '../i18n/index.ts'

export function BildirimlerPage() {
  return (
    <section>
      <h1>{tr.nav.bildirimler}</h1>
      <p>{tr.placeholders.bildirimler}</p>
    </section>
  )
}
