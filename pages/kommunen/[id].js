import Link from 'next/link'
import { useRouter } from 'next/router'
import Nav from '../../components/Nav'
import { useLang } from '../../lib/LanguageContext'
import { COMMUNITIES, getTypBadge, getStatusInfo } from '../../data/communities'
import styles from '../../styles/KommuneProfil.module.css'

export default function KommuneProfil() {
  const router = useRouter()
  const { t } = useLang()
  const { id } = router.query
  const k = COMMUNITIES.find(c => c.id === parseInt(id))

  if (!k) return (
    <div><Nav />
    <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>
      — <Link href="/kommunen" style={{color:'var(--g)'}}>{t('profile_back')}</Link>
    </div></div>
  )

  const status = getStatusInfo(k.status)
  const isActive = k.status === 'aktiv'
  const isSetup = k.status === 'einrichtung'
  const isInactive = k.status === 'nicht-registriert'

  return (
    <div>
      <Nav />
      <div className={styles.banner} style={{opacity:isInactive?0.7:1}}>
        <div className={styles.bannerPattern}/>
        <div className={styles.avatar}>{k.icon}</div>
        <div className={styles.statusBadge} style={{background:status.bg,color:status.color}}>
          {status.icon} {isActive?t('status_active'):t('status_inactive')}
        </div>
      </div>

      <div className={styles.profileHeader}>
        <div>
          <h1 className={styles.name}>{k.name}</h1>
          <div className={styles.meta}>
            <span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
            <span className={styles.loc}>📍 {k.ort}, {k.region} · {k.land}</span>
            <span className={styles.founded}>{t('profile_since')} {k.jahr}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {isActive && (<><button className="btn-secondary">✉️ {t('profile_contact')}</button><button className="btn-primary">{t('profile_contact')}</button></>)}
          {isSetup && <div className={styles.setupNotice}>🟡 {t('profile_setup')}</div>}
          {isInactive && <button className={styles.inviteBtn} onClick={()=>alert('!')}> ✉️ {t('profile_invite')}</button>}
        </div>
      </div>

      {isInactive && (
        <div className={styles.inactiveBanner}>
          <span>⚫</span>
          <div><strong>{t('profile_inactive_banner')}</strong></div>
          <button className={styles.inviteBtn} onClick={()=>alert('!')}>{t('profile_invite')}</button>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCell}><div className={styles.statN}>{k.members}</div><div className={styles.statL}>{t('profile_members')}</div></div>
        <div className={styles.statCell}><div className={styles.statN}>{k.jahr}</div><div className={styles.statL}>{t('profile_since')}</div></div>
        <div className={styles.statCell}><div className={styles.statN}>{isActive?k.angebote:'—'}</div><div className={styles.statL}>{t('nav_offers')}</div></div>
        <div className={styles.statCell}><div className={styles.statN}>{isActive?'4.8 ★':'—'}</div><div className={styles.statL}>Rating</div></div>
      </div>

      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('profile_about')}</div>
            <p className={styles.desc}>{k.beschreibung}</p>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('profile_values')}</div>
            <div className={styles.tags}>{k.tags.map(tag=><span key={tag} className={styles.tag}>{tag}</span>)}</div>
          </div>
          {isActive && k.angebote > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t('profile_offers')}</div>
              <div className={styles.offers}>
                <div className={styles.offerCard}>
                  <div className={styles.offerTop}><span className="badge badge-oeko">Workshop</span></div>
                  <div className={styles.offerTitle}>Hühnerstall bauen — 3 Tage inkl. Kost &amp; Logis</div>
                  <div className={styles.offerMeta}>📅 15.–17. Aug 2025</div>
                </div>
              </div>
            </div>
          )}
          {isInactive && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t('profile_offers')}</div>
              <div className={styles.lockedBox}>
                <div className={styles.lockedIcon}>🔒</div>
                <div className={styles.lockedText}>
                  {t('profile_locked')}
                  <br/>
                  <button className={styles.inviteBtn} style={{marginTop:10}} onClick={()=>alert('!')}>{t('profile_invite')}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            {isActive && (<><div className={styles.sideTitle}>✉️ {t('profile_contact')}</div><button className="btn-primary" style={{width:'100%'}}>{t('profile_contact')}</button></>)}
            {isSetup && <><div className={styles.sideTitle}>🟡 {t('profile_setup')}</div></>}
            {isInactive && (
              <>
                <div className={styles.sideTitle}>⚫ {t('status_inactive')}</div>
                <p style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.6}}>{t('profile_inactive_banner')}</p>
                <button className={styles.inviteBtn} style={{width:'100%'}} onClick={()=>alert('!')}>✉️ {t('profile_invite')}</button>
                {k.website && <a href={k.website} target="_blank" rel="noopener noreferrer" style={{display:'block',textAlign:'center',marginTop:10,fontSize:12,color:'var(--g)'}}>🔗 {t('profile_direct')}</a>}
              </>
            )}
          </div>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>📍 {t('profile_location')}</div>
            <div className={styles.mapPlaceholder}>🗺️</div>
            <div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>{k.ort}, {k.region}<br/>{k.land}</div>
          </div>
          {k.website && <div style={{textAlign:'center',padding:'8px 0'}}><a href={k.website} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'var(--g)'}}>🔗 {k.website.replace('https://','')}</a></div>}
        </div>
      </div>
    </div>
  )
}
