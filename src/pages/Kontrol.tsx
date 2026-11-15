import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function KontrolPage() {
  return (
    <Page title={tr.nav.kontrol}>
      <p>{tr.placeholders.kontrol}</p>
    </Page>
  )
}
