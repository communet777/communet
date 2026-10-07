import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon'
import { useAuth } from '../lib/AuthContext'
import { useActiveProfile } from '../lib/ActiveProfileContext'
import styles from '../styles/BottomNav.module.css'

// Untere Schnellzugriffs-Leiste (nur Smartphone-Breite, nur eingeloggt), ähnlich wie bei Instagram.
export default function BottomNav() {
  const { user } = useAuth()
  const { earlyAccess, unread } = useActiveProfile()
  const { pathname } = useRouter()
  if (!user || pathname.startsWith('/auth') || pathname === '/offline') return null
  const items = [
    { href: '/angebote', icon: 'stern', label: 'Angebote' },
    { href: '/karte', icon: 'karte', label: 'Karte' },
    earlyAccess
      ? { href: '/nachrichten', icon: 'brief', label: 'Nachrichten', badge: unread }
      : { href: '/kommunen', icon: 'globus', label: 'Gemeinschaften' },
    { href: '/profil', icon: 'person', label: 'Profil' },
  ]
  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <nav className={styles.bar} aria-label="Schnellzugriff">
        {items.map(i => {
          const on = pathname === i.href || pathname.startsWith(i.href + '/')
          return (
            <Link key={i.href} href={i.href} className={`${styles.item} ${on ? styles.active : ''}`}>
              <Icon name={i.icon} size={24} style={{ opacity: on ? 1 : 0.7 }} />
              {i.badge > 0 && <span className={styles.badge}>{i.badge > 9 ? '9+' : i.badge}</span>}
              {i.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
