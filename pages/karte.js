import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'
import Link from 'next/link'

export default function Karte() {
  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <div className={styles.icon}>🗺️</div>
        <div className={styles.badge}>Bald verfügbar</div>
        <h1 className={styles.title}>Interaktive Karte</h1>
        <p className={styles.desc}>
          Die Karte zeigt alle Kommunen, Ökodörfer, Bio-Höfe und öffentliche Wasserquellen in Europa — mit Filter, Zoom und direktem Kontakt. Wir arbeiten daran.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>📍 Alle Gemeinschaften auf einen Blick</div>
          <div className={styles.feature}>🌱 Bio- und Demeter-Höfe</div>
          <div className={styles.feature}>💧 Öffentliche Wasserquellen</div>
          <div className={styles.feature}>🔍 Filter nach Typ und Land</div>
        </div>
        <Link href="/kommunen" className={styles.btn}>Zur Kommunen-Liste →</Link>
      </div>
    </div>
  )
}
