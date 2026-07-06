import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'

export default function Datenschutz() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page} style={{maxWidth:600}}>
      <h1 className={styles.title}>{t('privacy_title')}</h1>
      <p className={styles.desc}>{t('privacy_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>✅ {t('privacy_f1')}</div>
        <div className={styles.feature}>✅ {t('privacy_f2')}</div>
        <div className={styles.feature}>✅ {t('privacy_f3')}</div>
        <div className={styles.feature}>✅ {t('privacy_f4')}</div>
      </div>
      <p style={{fontSize:12,color:'var(--muted)',marginTop:8}}>{t('privacy_contact')}</p>
    </div></div>
  )
}
