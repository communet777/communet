import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './Nav.module.css'

export default function Nav() {
  const router = useRouter()

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>communet</Link>
      <div className={styles.links}>
        <Link href="/karte" className={`${styles.link} ${router.pathname === '/karte' ? styles.active : ''}`}>Karte</Link>
        <Link href="/kommunen" className={`${styles.link} ${router.pathname === '/kommunen' ? styles.active : ''}`}>Kommunen</Link>
        <Link href="/angebote" className={`${styles.link} ${router.pathname === '/angebote' ? styles.active : ''}`}>Angebote</Link>
        <Link href="/registrieren" className={styles.cta}>Mitmachen</Link>
      </div>
    </nav>
  )
}
