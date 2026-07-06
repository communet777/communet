import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'
import Link from 'next/link'

export default function Angebote() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page}>
      <div className={styles.icon}>✨</div>
      <div className={styles.badge}>{t('coming_soon')}</div>
      <h1 className={styles.title}>{t('coming_soon_offers_title')}</h1>
      <p className={styles.desc}>{t('coming_soon_offers_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>{t('coming_soon_offers_f1')}</div>
        <div className={styles.feature}>{t('coming_soon_offers_f2')}</div>
        <div className={styles.feature}>{t('coming_soon_offers_f3')}</div>
        <div className={styles.feature}>{t('coming_soon_offers_f4')}</div>
      </div>
      <Link href="/kommunen" className={styles.btn}>{t('coming_soon_back')}</Link>
    </div></div>
  )
}
