import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'
import Link from 'next/link'

export default function UeberUns() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page} style={{maxWidth:600}}>
      <div className={styles.icon}>🌍</div>
      <h1 className={styles.title}>{t('about_title')}</h1>
      <p className={styles.desc}>{t('about_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>🗺️ {t('about_f1')}</div>
        <div className={styles.feature}>🤝 {t('about_f2')}</div>
        <div className={styles.feature}>🌱 {t('about_f3')}</div>
        <div className={styles.feature}>💚 {t('about_f4')}</div>
      </div>
      <Link href="/kommunen" className={styles.btn}>{t('about_btn')}</Link>
    </div></div>
  )
}
