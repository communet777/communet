import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/ComingSoon.module.css'

export default function Spenden() {
  const { t } = useLang()
  return (
    <div><Nav />
    <div className={styles.page}>
      <div className={styles.icon}>💚</div>
      <h1 className={styles.title}>{t('support_title')}</h1>
      <p className={styles.desc}>{t('support_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>✅ {t('support_f1')}</div>
        <div className={styles.feature}>✅ {t('support_f2')}</div>
        <div className={styles.feature}>✅ {t('support_f3')}</div>
        <div className={styles.feature}>✅ {t('support_f4')}</div>
      </div>
      <p style={{fontSize:13,color:'var(--muted)',marginTop:8}}>{t('support_coming')}</p>
    </div></div>
  )
}
