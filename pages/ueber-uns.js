import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'
import Link from 'next/link'

export default function UeberUns() {
  return (
    <div>
      <Nav />
      <div className={styles.page} style={{maxWidth:600}}>
        <div className={styles.icon}>🌍</div>
        <h1 className={styles.title}>Über Communet</h1>
        <p className={styles.desc}>
          Communet ist eine Plattform die alternative Lebensgemeinschaften, Ökodörfer und Kollektive in Europa vernetzt — und die Menschen die mit ihnen in Kontakt kommen wollen.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>🗺️ 88 Gemeinschaften in 23 Ländern</div>
          <div className={styles.feature}>🤝 Direkter Kontakt ohne Mittelsmänner</div>
          <div className={styles.feature}>🌱 Kostenlos und werbefrei</div>
          <div className={styles.feature}>💚 Open Source und gemeinschaftlich</div>
        </div>
        <Link href="/kommunen" className={styles.btn}>Gemeinschaften entdecken →</Link>
      </div>
    </div>
  )
}
