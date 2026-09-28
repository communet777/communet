import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLang } from '../lib/LanguageContext'

const LINKS = [
  { href: '/impressum', de: 'Impressum', en: 'Imprint' },
  { href: '/datenschutz', de: 'Datenschutz', en: 'Privacy' },
  { href: '/kontakt', de: 'Kontakt', en: 'Contact' },
  { href: '/ueber-uns', de: 'Über uns', en: 'About' },
]

// Fußbereich mit Rechtstexten auf jeder Seite. Die Startseite hat einen eigenen Fußbereich.
export default function Footer() {
  const { lang } = useLang()
  const { pathname } = useRouter()
  if (pathname === '/') return null
  const en = lang === 'en'
  return (
    <footer style={{ padding: '20px 16px 28px', textAlign: 'center', fontSize: 12, color: 'var(--muted)', borderTop: '.5px solid var(--border)', background: 'var(--sand)' }}>
      <nav style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        {LINKS.map(l => <Link key={l.href} href={l.href} style={{ color: 'var(--muted)' }}>{en ? l.en : l.de}</Link>)}
      </nav>
      <div>© Communet · {en ? 'Map data © OpenStreetMap contributors' : 'Kartendaten © OpenStreetMap-Mitwirkende'}</div>
    </footer>
  )
}
