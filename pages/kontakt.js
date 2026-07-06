import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'

export default function Kontakt() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page}>
      <div className={styles.icon}>✉️</div>
      <h1 className={styles.title}>{t('contact_title')}</h1>
      <p className={styles.desc}>{t('contact_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>📧 {t('contact_f1')}</div>
        <div className={styles.feature}>📍 {t('contact_f2')}</div>
      </div>
      <a href="mailto:communet@outlook.de" className={styles.btn}>{t('contact_btn')}</a>
    </div></div>
  )
}
