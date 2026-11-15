import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function KurulumPage() {
  return (
    <Page title={tr.nav.kurulum}>
      <p>{tr.placeholders.kurulum}</p>
    </Page>
  )
}
