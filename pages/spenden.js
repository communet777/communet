import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'

export default function Spenden() {
  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <div className={styles.icon}>💚</div>
        <h1 className={styles.title}>Communet unterstützen</h1>
        <p className={styles.desc}>
          Communet ist und bleibt kostenlos — keine Werbung, keine Algorithmen, kein Verkauf von Daten. Wir finanzieren uns ausschließlich über freiwillige Spenden.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>✅ Keine Werbung</div>
          <div className={styles.feature}>✅ Open Source</div>
          <div className={styles.feature}>✅ Keine Nutzerdaten-Verkauf</div>
          <div className={styles.feature}>✅ Betrieben von Menschen für Menschen</div>
        </div>
        <p style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Spendemöglichkeit wird bald eingerichtet.</p>
      </div>
    </div>
  )
}
