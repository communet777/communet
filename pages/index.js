import{useEffect,useState,useRef}from'react'
import Link from'next/link'
import{useRouter}from'next/router'
import Nav from'../components/Nav'
import BackToTop from'../components/BackToTop'
import{useLang}from'../lib/LanguageContext'
import{COMMUNITIES,getTypBadge,getTypIcon}from'../data/communities'
import{supabase}from'../lib/supabase'
import styles from'../styles/Home.module.css'

export default function Home(){
const{t,lang}=useLang()
const router=useRouter()
const[dbKommunen,setDbKommunen]=useState([])
const[search,setSearch]=useState('')

useEffect(()=>{
supabase.from('profiles').select('id,name,kommune_typ,land,avatar_url,bio')
.eq('typ','kommune').eq('status','approved')
.then(({data})=>{ if(data) setDbKommunen(data) })
},[])

const totalCount=COMMUNITIES.length+dbKommunen.length
const countrySet=new Set(COMMUNITIES.map(k=>k.land))
dbKommunen.forEach(k=>{ if(k.land) countrySet.add(k.land.split(',').slice(-1)[0].trim()) })
const countryCount=countrySet.size

function handleSearch(e){
e.preventDefault()
if(search.trim()) router.push(`/kommunen?q=${encodeURIComponent(search.trim())}`)
}

return(
<div className={styles.page}>
<Nav/>
<section className={styles.hero}>
<div className={styles.heroLeft}>
<Link href="/karte">
<div style={{width:'min(360px,80vw)',height:'min(360px,80vw)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<img src="/communet_globe.png" alt="Communet — zur Karte" style={{width:'100%',height:'100%',objectFit:'contain',cursor:'pointer'}}/>
</div>
</Link>
</div>
<div className={styles.heroRight}>
<div className={styles.eyebrow}>{t('home_eyebrow')}</div>
<h1 className={styles.title}>{t('home_title1')}<br/>{t('home_title2')}<br/>{t('home_title3')}</h1>
<p className={styles.sub}>{t('home_sub')}</p>
<form onSubmit={handleSearch} className={styles.searchForm}>
<input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suche nach Gemeinschaft, Ort oder Land..." className={styles.searchInput}/>
<button type="submit" className={styles.searchBtn}>🔍</button>
</form>
<div className={styles.actions}>
<Link href="/auth/login"className={styles.btnPrimary}>{t('home_cta_profile')}</Link>
<Link href="/kommunen"className={styles.btnSecondary}>{t('home_cta_commune')}</Link>
</div>
<div className={styles.statsRow}>
<div className={styles.stat}><div className={styles.statN}>{totalCount}+</div><div className={styles.statL}>{t('home_stat_communities')}</div></div>
<div className={styles.stat}><div className={styles.statN}>{countryCount}+</div><div className={styles.statL}>{t('home_stat_countries')}</div></div>
<div className={styles.stat}><div className={styles.statN}>🌍</div><div className={styles.statL}>{t('home_stat_offers')}</div></div>
</div>
</div>
</section>

<section className={styles.visionSection}>
<div className={styles.visionInner}>
{lang==='de'?(
<>
<div className={styles.sectionLabel}>Unsere Vision</div>
<h2 className={styles.visionTitle}>Gemeinschaft neu gedacht</h2>
<p className={styles.visionText}>Communet ist eine offene Plattform für alle, die anders leben wollen — oder es bereits tun.</p>
<p className={styles.visionText}>Wir verbinden Kommunen, Ökodörfer und Kollektive weltweit mit Menschen, die Gemeinschaft suchen. Nicht als Produkt. Nicht als Algorithmus. Sondern als ehrliche, kostenlose Karte des alternativen Lebens.</p>
<p className={styles.visionText}>Ob du eine Gemeinschaft suchst, gründen willst oder einfach wissen möchtest: Wo gibt es das schon? — Communet ist dein Ausgangspunkt.</p>
</>
):(
<>
<div className={styles.sectionLabel}>Our Vision</div>
<h2 className={styles.visionTitle}>Community reimagined</h2>
<p className={styles.visionText}>Communet is an open platform for everyone who wants to live differently — or already does.</p>
<p className={styles.visionText}>We connect communes, ecovillages and collectives worldwide with people seeking community. Not as a product. Not as an algorithm. But as an honest, free map of alternative living.</p>
<p className={styles.visionText}>Whether you're looking for a community, want to start one, or simply want to know: where does this already exist? — Communet is your starting point.</p>
</>
)}
</div>
</section>

{dbKommunen.length>0&&(
<section className={styles.section}>
<div className={styles.sectionHeader}>
<div><div className={styles.sectionLabel}>{t('home_section_active')}</div><h2 className={styles.sectionTitle}>{t('home_section_title')}</h2></div>
<Link href="/kommunen" className={styles.sectionLink}>{t('home_see_all')}</Link>
</div>
<div className={styles.grid}>
{dbKommunen.slice(0,4).map(k=>(
<Link href={`/profil/p/${k.id}`}key={k.id}className={styles.card}>
<div className={styles.cardImg}style={{background:k.kommune_typ==='Kommune'?'#fff3e0':k.kommune_typ==='Kollektiv'?'#e8eaf6':'#e8f5ee'}}>
{k.avatar_url
?<img src={k.avatar_url} alt={k.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
:<span style={{fontSize:32}}>{getTypIcon(k.kommune_typ||'Ökodorf')}</span>}
</div>
<div className={styles.cardBody}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span className={`badge ${getTypBadge(k.kommune_typ||'Ökodorf')}`}>{k.kommune_typ||'Ökodorf'}</span>
<span style={{fontSize:10,color:'#2d6a4f',background:'#e8f5ee',padding:'2px 6px',borderRadius:10}}>🟢 Aktiv</span>
</div>
<div className={styles.cardName}>{k.name}</div>
<div className={styles.cardLoc}>📍 {k.land||'Ort unbekannt'}</div>
</div>
</Link>
))}
</div>
</section>
)}

<section className={styles.howSection}>
<div className={styles.sectionLabel}style={{textAlign:'center',marginBottom:8}}>{t('home_eyebrow')}</div>
<h2 className={styles.sectionTitle}style={{textAlign:'center',marginBottom:32}}>{t('home_how_title')}</h2>
<div className={styles.howGrid}>
<div className={styles.howCard}><div className={styles.howIcon}>👤</div><div className={styles.howTitle}>{t('home_how1_title')}</div><div className={styles.howText}>{t('home_how1_text')}</div></div>
<div className={styles.howCard}><div className={styles.howIcon}>🗺️</div><div className={styles.howTitle}>{t('home_how2_title')}</div><div className={styles.howText}>{t('home_how2_text')}</div></div>
<div className={styles.howCard}><div className={styles.howIcon}>✉️</div><div className={styles.howTitle}>{t('home_how3_title')}</div><div className={styles.howText}>{t('home_how3_text')}</div></div>
</div>
</section>

<section className={styles.ctaSection}>
<h2 className={styles.ctaTitle}>{t('home_cta_title')}</h2>
<p className={styles.ctaSub}>{t('home_cta_sub')}</p>
<div className={styles.ctaBtns}>
<Link href="/auth/login"className={styles.ctaBtnP}>{t('home_cta_btn1')}</Link>
<Link href="/auth/login"className={styles.ctaBtnS}>{t('home_cta_btn2')}</Link>
</div>
</section>

<footer className={styles.footer}>
<span className={styles.footerLogo}>communet · 2026</span>
<div className={styles.footerLinks}>
<Link href="/ueber-uns">{t('about')}</Link>
<Link href="/kontakt">{t('contact')}</Link>
<Link href="/datenschutz">{t('privacy')}</Link>
</div>
</footer>
<BackToTop/>
</div>
)
}
