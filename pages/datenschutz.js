import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'

export default function Datenschutz() {
  return (
    <div>
      <Nav />
      <div className={styles.page} style={{maxWidth:600,textAlign:'left'}}>
        <h1 className={styles.title} style={{textAlign:'center'}}>Datenschutz</h1>
        <p className={styles.desc}>
          Communet nimmt den Schutz deiner Daten ernst. Eine vollständige Datenschutzerklärung wird vor dem offiziellen Launch veröffentlicht.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>✅ Keine Weitergabe an Dritte</div>
          <div className={styles.feature}>✅ Keine Werbung</div>
          <div className={styles.feature}>✅ Recht auf Löschung jederzeit</div>
          <div className={styles.feature}>✅ DSGVO-konform</div>
        </div>
        <p style={{fontSize:12,color:'var(--muted)',marginTop:16,textAlign:'center'}}>
          Bei Datenschutzfragen: communet@outlook.de
        </p>
      </div>
    </div>
  )
}
