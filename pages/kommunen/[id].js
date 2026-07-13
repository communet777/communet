import Link from'next/link'
import{useRouter}from'next/router'
import Nav from'../../components/Nav'
import{useLang}from'../../lib/LanguageContext'
import{COMMUNITIES,getTypBadge,getStatusInfo,getBesucher}from'../../data/communities'
import styles from'../../styles/KommuneProfil.module.css'

export default function KommuneProfil(){
const router=useRouter()
const{t,lang}=useLang()
const{id}=router.query
const k=COMMUNITIES.find(c=>c.id===parseInt(id))
if(!k)return<div><Nav/><div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>— <Link href="/kommunen"style={{color:'var(--g)'}}>{t('profile_back')}</Link></div></div>
const status=getStatusInfo(k.status)
const besucher=getBesucher(k.besucher||'unbekannt')
const isActive=k.status==='aktiv'
const isSetup=k.status==='einrichtung'
const isInactive=k.status==='nicht-registriert'
return(
<div>
<Nav/>
<div className={styles.banner}style={{opacity:isInactive?0.7:1}}>
<div className={styles.bannerPattern}/>
<div className={styles.avatar}>{k.icon}</div>
<div className={styles.statusBadge}style={{background:status.bg,color:status.color}}>
{isActive?`🟢 ${t('status_active')}`:isSetup?`🟡`:` ⚫ ${t('status_inactive')}`}
</div>
</div>
<div className={styles.profileHeader}>
<div>
<h1 className={styles.name}>{k.name}</h1>
<div className={styles.meta}>
<span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
<span className={styles.loc}>📍 {k.ort}{k.region?`, ${k.region}`:''} · {k.land}</span>
<span className={styles.founded}>{t('profile_since')} {k.jahr}</span>
</div>
</div>
<div className={styles.actions}>
{isActive&&<><button className="btn-secondary">✉️ {t('profile_contact')}</button><button className="btn-primary">{t('profile_contact')}</button></>}
{isSetup&&<div className={styles.setupNotice}>🟡 {t('profile_setup')}</div>}
{isInactive&&<button className={styles.inviteBtn}>✉️ {t('profile_invite')}</button>}
</div>
</div>

{isInactive&&<div className={styles.inactiveBanner}><span>⚫</span><div>{t('profile_inactive_banner')}</div><button className={styles.inviteBtn}>{t('profile_invite')}</button></div>}

<div className={styles.statsRow}>
<div className={styles.statCell}><div className={styles.statN}>{k.members}</div><div className={styles.statL}>{t('profile_members')}</div></div>
<div className={styles.statCell}><div className={styles.statN}>{k.jahr}</div><div className={styles.statL}>{t('profile_since')}</div></div>
<div className={styles.statCell}><div className={styles.statN}>{isActive?k.angebote:'—'}</div><div className={styles.statL}>{t('nav_offers')}</div></div>
<div className={styles.statCell}>
<div className={styles.statN} style={{fontSize:18}}>{besucher.icon}</div>
<div className={styles.statL}>{lang==='en'?'Visitors':t('profile_visitors')||'Besucher'}</div>
</div>
</div>

<div className={styles.content}>
<div className={styles.main}>
<div className={styles.section}>
<div className={styles.sectionTitle}>{t('profile_about')}</div>
<p className={styles.desc}>{lang==='en'?(k.beschreibung_en||k.beschreibung):k.beschreibung}</p>
</div>

{/* Besucher-Info */}
<div className={styles.section}>
<div className={styles.sectionTitle}>{lang==='en'?'Visitors':'Besucher'}</div>
<div className={styles.besucherBadge}style={{background:besucher.bg,borderColor:besucher.color}}>
<span style={{fontSize:20}}>{besucher.icon}</span>
<div>
<div style={{fontSize:13,fontWeight:500,color:besucher.color}}>{lang==='en'?besucher.label_en:besucher.label}</div>
{isInactive&&<div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{lang==='en'?'Register on Communet to update this information':'Registriere dich auf Communet um diese Info zu aktualisieren'}</div>}
</div>
</div>
</div>

<div className={styles.section}>
<div className={styles.sectionTitle}>{t('profile_values')}</div>
<div className={styles.tags}>{k.tags.map(tag=><span key={tag}className={styles.tag}>{tag}</span>)}</div>
</div>

{isInactive&&<div className={styles.section}>
<div className={styles.sectionTitle}>{t('profile_offers')}</div>
<div className={styles.lockedBox}><div className={styles.lockedIcon}>🔒</div><div className={styles.lockedText}>{t('profile_locked')}<br/><button className={styles.inviteBtn}style={{marginTop:10}}>{t('profile_invite')}</button></div></div>
</div>}
</div>

<div className={styles.sidebar}>
<div className={styles.sideCard}>
{isActive&&<><div className={styles.sideTitle}>✉️ {t('profile_contact')}</div><button className="btn-primary"style={{width:'100%'}}>{t('profile_contact')}</button></>}
{isSetup&&<div className={styles.sideTitle}>🟡 {t('profile_setup')}</div>}
{isInactive&&<>
<div className={styles.sideTitle}>⚫ {t('status_inactive')}</div>
<p style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.6}}>{t('profile_inactive_banner')}</p>
<button className={styles.inviteBtn}style={{width:'100%'}}>✉️ {t('profile_invite')}</button>
{k.website&&<a href={k.website}target="_blank"rel="noopener noreferrer"style={{display:'block',textAlign:'center',marginTop:10,fontSize:12,color:'var(--g)'}}>🔗 {t('profile_direct')}</a>}
</>}
</div>

{/* Besucher Sidebar Card */}
<div className={styles.sideCard}>
<div className={styles.sideTitle}>{lang==='en'?'🧳 Visitors':'🧳 Besucher'}</div>
<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:besucher.bg,border:`0.5px solid ${besucher.color}22`}}>
<span style={{fontSize:18}}>{besucher.icon}</span>
<span style={{fontSize:12,color:besucher.color,fontWeight:500}}>{lang==='en'?besucher.label_en:besucher.label}</span>
</div>
{k.website&&<a href={k.website}target="_blank"rel="noopener noreferrer"style={{display:'block',textAlign:'center',marginTop:8,fontSize:12,color:'var(--g)'}}>🔗 {lang==='en'?'Visit website':'Zur Website'}</a>}
</div>

<div className={styles.sideCard}>
<div className={styles.sideTitle}>📍 {t('profile_location')}</div>
<div className={styles.mapPlaceholder}>🗺️</div>
<div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>{k.ort}{k.region?`, ${k.region}`:''}<br/>{k.land}</div>
</div>
</div>
</div>
</div>
)
}
