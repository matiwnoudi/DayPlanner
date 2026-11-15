import { Page } from '../components/Page.tsx'
import { tr } from '../i18n/index.ts'

export function HatirlatmalarPage() {
  return (
    <Page title={tr.nav.hatirlatmalar}>
      <p>{tr.placeholders.hatirlatmalar}</p>
    </Page>
  )
}
