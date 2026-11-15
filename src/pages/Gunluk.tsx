import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function GunlukPage() {
  return (
    <Page title={tr.nav.gunluk}>
      <p>{tr.placeholders.gunluk}</p>
    </Page>
  )
}
