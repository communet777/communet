import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'

export default function Lebensstunden() {
  return (
    <div>
      <Nav />
      <div className={styles.page} style={{maxWidth:580}}>
        <div className={styles.icon}>⏱</div>
        <div className={styles.badge}>Phase 2</div>
        <h1 className={styles.title}>Lebensstunden</h1>
        <p className={styles.desc}>
          Lebensstunden sind das Tauschsystem von Communet — inspiriert von globalen Zeitbank-Bewegungen. 1 Stunde = 1 Stunde, egal was du tust oder kannst.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>⚖️ 1 Stunde = 1 Stunde — immer fair</div>
          <div className={styles.feature}>🔄 Zwischen Personen und Kommunen</div>
          <div className={styles.feature}>🌍 Europaweit gültig</div>
          <div className={styles.feature}>🚀 Kommt in Phase 2</div>
        </div>
      </div>
    </div>
  )
}
