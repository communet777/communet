import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'
import Link from 'next/link'

export default function Angebote() {
  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <div className={styles.icon}>✨</div>
        <div className={styles.badge}>Bald verfügbar</div>
        <h1 className={styles.title}>Angebote & Gesuche</h1>
        <p className={styles.desc}>
          Hier findest du bald alle aktiven Angebote und Gesuche von Kommunen — Workshops, Mithilfe, Skill-Tausch und Ressourcentausch aus ganz Europa.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>🔨 Workshops & Kurse</div>
          <div className={styles.feature}>🤝 Mithilfe gesucht</div>
          <div className={styles.feature}>🔄 Skill-Tausch</div>
          <div className={styles.feature}>🌾 Ressourcentausch</div>
        </div>
        <Link href="/kommunen" className={styles.btn}>Kommunen entdecken →</Link>
      </div>
    </div>
  )
}
