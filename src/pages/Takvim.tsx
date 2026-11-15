import { tr } from '../i18n/index.ts'

export function TakvimPage() {
  return (
    <section>
      <h1>{tr.nav.takvim}</h1>
      <p>{tr.placeholders.takvim}</p>
    </section>
  )
}
