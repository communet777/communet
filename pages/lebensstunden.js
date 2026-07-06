import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'

export default function Lebensstunden() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page} style={{maxWidth:580}}>
      <div className={styles.icon}>⏱</div>
      <div className={styles.badge}>{t('lh_badge')}</div>
      <h1 className={styles.title}>{t('lh_title')}</h1>
      <p className={styles.desc}>{t('lh_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>⚖️ {t('lh_f1')}</div>
        <div className={styles.feature}>🔄 {t('lh_f2')}</div>
        <div className={styles.feature}>🌍 {t('lh_f3')}</div>
        <div className={styles.feature}>🚀 {t('lh_f4')}</div>
      </div>
    </div></div>
  )
}
