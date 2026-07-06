import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'

export default function Kontakt() {
  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <div className={styles.icon}>✉️</div>
        <h1 className={styles.title}>Kontakt</h1>
        <p className={styles.desc}>
          Fragen, Feedback oder du möchtest deine Kommune eintragen? Schreib uns direkt.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>📧 communet@outlook.de</div>
          <div className={styles.feature}>📍 Europa</div>
        </div>
        <a href="mailto:communet@outlook.de" className={styles.btn}>E-Mail schreiben →</a>
      </div>
    </div>
  )
}
