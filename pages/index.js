import{useEffect,useState}from'react'
import Link from'next/link'
import{useRouter}from'next/router'
import Nav from'../components/Nav'
import BackToTop from'../components/BackToTop'
import{useLang}from'../lib/LanguageContext'
import{getTypBadge}from'../data/communities'
import TypIcon from'../components/TypIcon'
import Icon from'../components/Icon'
import CountUp from'../components/CountUp'
import Reveal from'../components/Reveal'
import{getTypBg}from'../lib/typColors'
import{getCommunityImage}from'../lib/communityImages'
import{useCatalog}from'../lib/catalog'
import{supabase}from'../lib/supabase'
import styles from'../styles/Home.module.css'

// Gepinselte Goldlinie aus Annas Design-System (unter Überschriften)
function GoldLine({width=160}){
return(
<svg className={styles.goldLine} width={width} height="14" viewBox="0 0 180 14" aria-hidden="true">
<path d="M3 9 C40 4, 95 11, 177 6" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none"/>
</svg>
)
}

export default function Home(){
const[COMMUNITIES]=useCatalog()
const{t,lang}=useLang()
const router=useRouter()
const[dbKommunen,setDbKommunen]=useState([])
const[search,setSearch]=useState('')

useEffect(()=>{
supabase.from('profiles').select('id,name,kommune_typ,land,avatar_url')
.eq('typ','kommune').eq('status','approved')
.then(({data})=>{ if(data) setDbKommunen(data) })
},[])

const HIGHLIGHT_IDS=[2,3] // ZEGG, Schloss Tempelhof
const highlights=HIGHLIGHT_IDS.map(id=>COMMUNITIES.find(k=>k.id===id)).filter(Boolean)
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

{/* Hero: Text links, Weltkugel rechts */}
<section className={styles.hero}>
<div className={styles.heroText}>
<h1 className={styles.title}>
{t('home_title1')}<br/>
{t('home_title2')}<br/>
{t('home_title3')}
</h1>
<GoldLine/>
<p className={styles.lead}>{t('home_sub')}</p>
<div className={styles.stats}>
<div className={styles.stat}><span className={styles.statN}><CountUp to={totalCount}/>+</span><span className={styles.statL}>{t('home_stat_communities')}</span></div>
<div className={styles.stat}><span className={styles.statN}><CountUp to={countryCount}/>+</span><span className={styles.statL}>{t('home_stat_countries')}</span></div>
<div className={styles.stat}><span className={styles.statN}><Icon name="globus" size={30}/></span><span className={styles.statL}>{t('home_stat_offers')}</span></div>
</div>
<form onSubmit={handleSearch} className={styles.searchForm} role="search">
<label htmlFor="home-search" className={styles.srOnly}>Suche</label>
<input id="home-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Gemeinschaft, Ort oder Land..." className={styles.searchInput}/>
<button type="submit" className={styles.searchBtn} aria-label="Suchen"><Icon name="standort" size={18}/></button>
</form>
<div className={styles.actions}>
<Link href="/auth/login" className={styles.btnGold}>{t('home_cta_profile')}</Link>
</div>
</div>
<div className={styles.heroGlobe}>
<Link href="/karte" className={styles.globeLink}>
<img src="/communet_globe.png" alt="Zur Karte" className={styles.globe}/>
<span className={styles.globeHint}>Zur Karte →</span>
</Link>
</div>
</section>

{/* Vision */}
<section className={styles.vision}>
<Reveal className={styles.visionInner}>
{lang==='de'?(
<>
<span className={styles.kicker}><span className={styles.kickerLine}/>Unsere Vision<span className={styles.kickerLine}/></span>
<h2 className={styles.h2}>Gemeinschaft neu gedacht</h2>
<GoldLine width={120}/>
<p className={styles.visionText}>Communet ist eine offene Plattform für alle, die anders leben wollen — oder es bereits tun.</p>
<p className={styles.visionText}>Wir verbinden Kommunen, Ökodörfer und Kollektive weltweit mit Menschen, die Gemeinschaft suchen. Nicht als Produkt. Nicht als Algorithmus. Sondern als ehrliche, kostenlose Karte des alternativen Lebens.</p>
<Link href="/ueber-uns" className={styles.textLink}>Mehr über Communet →</Link>
</>
):(
<>
<span className={styles.kicker}><span className={styles.kickerLine}/>Our Vision<span className={styles.kickerLine}/></span>
<h2 className={styles.h2}>Community reimagined</h2>
<GoldLine width={120}/>
<p className={styles.visionText}>Communet is an open platform for everyone who wants to live differently — or already does.</p>
<p className={styles.visionText}>We connect communes, ecovillages and collectives worldwide with people seeking community. Not as a product. Not as an algorithm. But as an honest, free map of alternative living.</p>
<Link href="/ueber-uns" className={styles.textLink}>About Communet →</Link>
</>
)}
</Reveal>
</section>

{/* Aktive Gemeinschaften */}
{dbKommunen.length>0&&(
<section className={styles.active}>
<div className={styles.sectionHead}>
<div>
<span className={styles.kicker}><span className={styles.kickerLine}/>{t('home_section_active')}</span>
<h2 className={styles.h2Small}>{t('home_section_title')}</h2>
</div>
<Link href="/kommunen" className={styles.textLink}>{t('home_see_all')}</Link>
</div>
<Reveal as="ul" className={styles.activeList}>
{dbKommunen.slice(0,4).map(k=>(
<li key={k.id}>
<Link href={`/profil/p/${k.id}`} className={styles.activeItem}>
<span className={styles.activeAvatar} style={{background:getTypBg(k.kommune_typ||'Ökodorf')}}>
{k.avatar_url?<img src={k.avatar_url} alt={k.name}/>:<TypIcon typ={k.kommune_typ||'Ökodorf'} size={28}/>}
</span>
<span className={styles.activeText}>
<strong>{k.name}</strong>
<span><span className={`badge ${getTypBadge(k.kommune_typ||'Ökodorf')}`}>{k.kommune_typ||'Ökodorf'}</span> <Icon name="standort" size={12}/> {k.land||'Ort unbekannt'}</span>
</span>
<span className={styles.activeStatus}><span className={styles.activeDot}/>Aktiv</span>
</Link>
</li>
))}
</Reveal>
</section>
)}

{/* Highlight-Communities */}
{highlights.length>0&&(
<section className={styles.hl}>
<div className={styles.sectionHead}>
<div>
<span className={styles.kicker}><span className={styles.kickerLine}/>{t('home_hl_kicker')}</span>
<h2 className={styles.h2Small}>{t('home_hl_title')}</h2>
</div>
<Link href="/kommunen" className={styles.textLink}>{t('home_see_all')}</Link>
</div>
<Reveal className={styles.hlGrid}>
{highlights.map(k=>{
const foto=getCommunityImage(k.id)
const desc=lang==='en'?(k.beschreibung_en||k.beschreibung):k.beschreibung
return(
<Link key={k.id} href={`/kommunen/${k.id}`} className={styles.hlCard}>
<span className={styles.hlImg} style={{background:getTypBg(k.typ)}}>
{foto?<img src={foto.src} alt={k.name} loading="lazy"/>:<TypIcon typ={k.typ} size={64}/>}
</span>
<span className={styles.hlBody}>
<span><span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span></span>
<strong>{k.name}</strong>
<span className={styles.hlLoc}><Icon name="standort" size={13}/> {k.ort}{k.ort&&k.land?' · ':''}{k.land}</span>
<span className={styles.hlDesc}>{desc}</span>
<span className={styles.hlMore}>{t('map_view_profile')}</span>
{foto&&<span className={styles.hlCredit}>Foto: {foto.autor} · {foto.lizenz}</span>}
</span>
</Link>
)})}
</Reveal>
</section>
)}

{/* Einfach und direkt */}
<section className={styles.how}>
<div className={styles.howInner}>
<h2 className={styles.h2Light}>{t('home_how_title')}</h2>
<GoldLine width={120}/>
<Reveal className={styles.howGrid}>
<Link href="/auth/login" className={styles.howItem}>
<span className={styles.howIcon}><Icon name="person" size={28}/></span>
<strong>{t('home_how1_title')}</strong>
<span>{t('home_how1_text')}</span>
</Link>
<Link href="/kommunen" className={styles.howItem}>
<span className={styles.howIcon}><Icon name="karte" size={28}/></span>
<strong>{t('home_how2_title')}</strong>
<span>{t('home_how2_text')}</span>
</Link>
<Link href="/angebote" className={styles.howItem}>
<span className={styles.howIcon}><Icon name="brief" size={28}/></span>
<strong>{t('home_how3_title')}</strong>
<span>{t('home_how3_text')}</span>
</Link>
</Reveal>
</div>
</section>

{/* Deine Kommune noch nicht dabei? (Spirale im Hintergrund) */}
<section className={styles.cta}>
<Reveal className={styles.ctaInner}>
<Icon name="globus" size={56}/>
<h2 className={styles.h2}>{t('home_cta_title')}</h2>
<GoldLine width={120}/>
<p className={styles.ctaSub}>{t('home_cta_sub')}</p>
<div className={styles.ctaBtns}>
<Link href="/auth/login" className={styles.btnPrimary}>{t('home_cta_btn1')}</Link>
<Link href="/auth/login" className={styles.textLink}>{t('home_cta_btn2')}</Link>
</div>
</Reveal>
</section>

<footer className={styles.footer}>
<span>communet · 2026</span>
<nav className={styles.footerLinks} aria-label="Footer">
<Link href="/ueber-uns">{t('about')}</Link>
<Link href="/kontakt">{t('contact')}</Link>
<Link href="/datenschutz">{t('privacy')}</Link>
<Link href="/impressum">Impressum</Link>
</nav>
</footer>
<BackToTop/>
</div>
)
}
