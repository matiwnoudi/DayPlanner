import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function BildirimlerPage() {
  return (
    <Page title={tr.nav.bildirimler}>
      <p>{tr.placeholders.bildirimler}</p>
    </Page>
  )
}
