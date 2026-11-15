import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function TakvimPage() {
  return (
    <Page title={tr.nav.takvim}>
      <p>{tr.placeholders.takvim}</p>
    </Page>
  )
}
