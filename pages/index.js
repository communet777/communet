import{useEffect,useState}from'react'
import dynamic from'next/dynamic'
import Link from'next/link'
import Nav from'../components/Nav'
import{useLang}from'../lib/LanguageContext'
import{COMMUNITIES,getTypBadge,getStatusInfo}from'../data/communities'
import styles from'../styles/Home.module.css'
const Globe=dynamic(()=>import('../components/Globe'),{ssr:false})
export default function Home(){
const[mounted,setMounted]=useState(false)
const{t}=useLang()
useEffect(()=>setMounted(true),[])
const aktive=COMMUNITIES.filter(k=>k.status==='aktiv').slice(0,4)
return(
<div className={styles.page}>
<Nav/>
<section className={styles.hero}>
<div className={styles.heroLeft}>{mounted&&<Globe size={360}/>}</div>
<div className={styles.heroRight}>
<div className={styles.eyebrow}>{t('home_eyebrow')}</div>
<h1 className={styles.title}>{t('home_title1')}<br/>{t('home_title2')}<br/>{t('home_title3')}</h1>
<p className={styles.sub}>{t('home_sub')}</p>
<div className={styles.actions}>
<Link href="/registrieren"className={styles.btnPrimary}>{t('home_cta_profile')}</Link>
<Link href="/kommunen"className={styles.btnSecondary}>{t('home_cta_commune')}</Link>
</div>
<div className={styles.statsRow}>
<div className={styles.stat}><div className={styles.statN}>{COMMUNITIES.length}+</div><div className={styles.statL}>{t('home_stat_communities')}</div></div>
<div className={styles.stat}><div className={styles.statN}>30+</div><div className={styles.statL}>{t('home_stat_countries')}</div></div>
<div className={styles.stat}><div className={styles.statN}>🌍</div><div className={styles.statL}>{t('home_stat_offers')}</div></div>
</div>
</div>
</section>
<section className={styles.section}>
<div className={styles.sectionHeader}>
<div><div className={styles.sectionLabel}>{t('home_section_active')}</div><h2 className={styles.sectionTitle}>{t('home_section_title')}</h2></div>
<Link href="/kommunen"className={styles.sectionLink}>{t('home_see_all')}</Link>
</div>
<div className={styles.grid}>
{aktive.length===0?COMMUNITIES.slice(0,4).map(k=>(
<Link href={`/kommunen/${k.id}`}key={k.id}className={styles.card}>
<div className={styles.cardImg}>{k.icon}</div>
<div className={styles.cardBody}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
<span style={{fontSize:10,color:'#6b6b63',background:'#f0f0ee',padding:'2px 6px',borderRadius:10}}>⚫ {t('status_inactive')}</span>
</div>
<div className={styles.cardName}>{k.name}</div>
<div className={styles.cardLoc}>📍 {k.ort} · {k.land}</div>
<div className={styles.cardFooter}><span>~{k.members}</span><span style={{color:'var(--muted)',fontSize:11}}>✉️ {t('communities_invite')}</span></div>
</div>
</Link>
)):aktive.map(k=>{
const status=getStatusInfo(k.status)
return(
<Link href={`/kommunen/${k.id}`}key={k.id}className={styles.card}>
<div className={styles.cardImg}>{k.icon}</div>
<div className={styles.cardBody}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
<span style={{fontSize:10,color:status.color,background:status.bg,padding:'2px 6px',borderRadius:10}}>{status.icon} {t('status_active')}</span>
</div>
<div className={styles.cardName}>{k.name}</div>
<div className={styles.cardLoc}>📍 {k.ort} · {k.land}</div>
<div className={styles.cardFooter}><span>~{k.members}</span><span style={{color:'var(--g)',fontWeight:500,fontSize:11}}>{k.angebote} {t('nav_offers').toLowerCase()}</span></div>
</div>
</Link>
)})}
</div>
</section>
<section className={styles.howSection}>
<div className={styles.sectionLabel}style={{textAlign:'center',marginBottom:8}}>{t('home_eyebrow')}</div>
<h2 className={styles.sectionTitle}style={{textAlign:'center',marginBottom:32}}>{t('home_how_title')}</h2>
<div className={styles.howGrid}>
<div className={styles.howCard}><div className={styles.howIcon}>👤</div><div className={styles.howTitle}>{t('home_how1_title')}</div><div className={styles.howText}>{t('home_how1_text')}</div></div>
<div className={styles.howCard}><div className={styles.howIcon}>🗺️</div><div className={styles.howTitle}>{t('home_how2_title')}</div><div className={styles.howText}>{t('home_how2_text')}</div></div>
<div className={styles.howCard}><div className={styles.howIcon}>✉️</div><div className={styles.howTitle}>{t('home_how3_title')}</div><div className={styles.howText}>{t('home_how3_text')}</div></div>
</div>
</section>
<section className={styles.statusSection}>
<div className={styles.sectionLabel}style={{marginBottom:8}}>Status</div>
<h2 className={styles.sectionTitle}style={{marginBottom:16}}>{t('home_status_title')}</h2>
<div className={styles.statusGrid}>
<div className={styles.statusCard}><span className={styles.statusDot}>🟢</span><div><div className={styles.statusTitle}>{t('home_status_active_title')}</div><div className={styles.statusDesc}>{t('home_status_active_desc')}</div></div></div>
<div className={styles.statusCard}><span className={styles.statusDot}>🟡</span><div><div className={styles.statusTitle}>{t('home_status_setup_title')}</div><div className={styles.statusDesc}>{t('home_status_setup_desc')}</div></div></div>
<div className={styles.statusCard}><span className={styles.statusDot}>⚫</span><div><div className={styles.statusTitle}>{t('home_status_inactive_title')}</div><div className={styles.statusDesc}>{t('home_status_inactive_desc')}</div></div></div>
</div>
</section>
<section className={styles.ctaSection}>
<h2 className={styles.ctaTitle}>{t('home_cta_title')}</h2>
<p className={styles.ctaSub}>{t('home_cta_sub')}</p>
<div className={styles.ctaBtns}>
<Link href="/registrieren?typ=kommune"className={styles.ctaBtnP}>{t('home_cta_btn1')}</Link>
<Link href="/registrieren"className={styles.ctaBtnS}>{t('home_cta_btn2')}</Link>
</div>
</section>
<footer className={styles.footer}>
<span className={styles.footerLogo}>communet · 2025 · Open source</span>
<div className={styles.footerLinks}>
<Link href="/ueber-uns">{t('about')}</Link>
<Link href="/kontakt">{t('contact')}</Link>
<Link href="/datenschutz">{t('privacy')}</Link>
</div>
</footer>
</div>
)
}
