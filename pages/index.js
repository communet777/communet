import{useEffect,useState}from'react'
import Link from'next/link'
import{useRouter}from'next/router'
import Nav from'../components/Nav'
import BackToTop from'../components/BackToTop'
import{useLang}from'../lib/LanguageContext'
import{getTypBadge}from'../data/communities'
import TypIcon from'../components/TypIcon'
import Icon from'../components/Icon'
import{getTypBg}from'../lib/typColors'
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

// Fotos liegen unter /public/fotos
const FOTO='/fotos'

// Arten von Gemeinschaften (Typ-Icons wie auf der Karte)
const ARTEN=[
{typ:'Ökodorf',de:['Ökodörfer','Ökologisch leben, oft auf dem Land'],en:['Ecovillages','Ecological living, often rural']},
{typ:'Kommune',de:['Kommunen','Gemeinsame Kasse und gemeinsamer Alltag'],en:['Communes','Shared income and daily life']},
{typ:'Kollektiv',de:['Kollektive','Gemeinsam arbeiten und entscheiden'],en:['Collectives','Working and deciding together']},
{typ:'Spirituelle Gemeinschaft',de:['Spirituelle Gemeinschaften','Mit gemeinsamer Praxis'],en:['Spiritual communities','With a shared practice']},
{typ:'Wohnprojekt',de:['Wohnprojekte','Gemeinsam wohnen, oft in der Stadt'],en:['Co-housing','Living together, often in cities']},
]

export default function Home(){
const[COMMUNITIES]=useCatalog()
const{lang}=useLang()
const de=lang==='de'
const router=useRouter()
const[dbKommunen,setDbKommunen]=useState([])
const[search,setSearch]=useState('')

useEffect(()=>{
supabase.from('profiles').select('id,name,kommune_typ,land,avatar_url')
.eq('typ','kommune').eq('status','approved')
.then(({data})=>{ if(data) setDbKommunen(data) })
},[])

const totalCount=COMMUNITIES.length+dbKommunen.length
const countrySet=new Set(COMMUNITIES.map(k=>k.land))
dbKommunen.forEach(k=>{ if(k.land) countrySet.add(k.land.split(',').slice(-1)[0].trim()) })
const countryCount=countrySet.size

function handleSearch(e){
e.preventDefault()
router.push(search.trim()?`/kommunen?q=${encodeURIComponent(search.trim())}`:'/karte')
}

return(
<div className={styles.page}>
<Nav/>

{/* 1 · Hero: Weltkugel im Mittelpunkt */}
<section className={styles.hero}>
<div className={styles.heroText}>
<span className={styles.eyebrow}>{de?'Verzeichnis für gemeinschaftliches Leben':'A directory of community living'}</span>
<h1 className={styles.title}>{de?'Finde Menschen, die schon so leben.':'Find people who already live this way.'}</h1>
<GoldLine/>
<p className={styles.lead}>
{de
?`${totalCount} Ökodörfer, Kommunen und Kollektive in ${countryCount} Ländern. Auf einer Karte, mit Kontakt direkt zur Gemeinschaft.`
:`${totalCount} ecovillages, communes and collectives in ${countryCount} countries. On one map, with direct contact to each community.`}
</p>
<form onSubmit={handleSearch} className={styles.searchForm} role="search">
<label htmlFor="home-search" className={styles.srOnly}>{de?'Suche':'Search'}</label>
<input id="home-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={de?'Ort, Land oder Name':'Place, country or name'} className={styles.searchInput}/>
<button type="submit" className={styles.searchBtn}>{de?'Suchen':'Search'}</button>
</form>
<div className={styles.heroLinks}>
<Link href="/auth/login" className={styles.heroLink}>{de?'Profil erstellen':'Create profile'} →</Link>
<Link href="/auth/login" className={styles.heroLink}>{de?'Gemeinschaft eintragen':'Add your community'} →</Link>
</div>
</div>
<div className={styles.heroGlobe}>
<Link href="/karte" className={styles.globeLink} aria-label={de?'Zur Weltkarte':'Open the world map'}>
<img src="/communet_globe.png" alt="" className={styles.globe}/>
<span className={styles.globeHint}>{de?'Zur Weltkarte':'Open the world map'} →</span>
</Link>
</div>
</section>

{/* 2 · Wie Gemeinschaft aussieht */}
<section className={styles.spotlight}>
<div className={styles.spotText}>
<span className={styles.kicker}><span className={styles.kickerLine}/>{de?'Wie Menschen zusammenleben':'How people live together'}</span>
<h2 className={styles.h2}>{de?'Gemeinschaft ist Alltag.':'Community is everyday life.'}</h2>
<GoldLine width={120}/>
<p className={styles.body}>
{de
?'Zusammen kochen, bauen, entscheiden. Jede Gemeinschaft macht das anders. Auf Communet findest du diese Arten:'
:'Cooking, building and deciding together. Every community does it differently. On Communet you will find these kinds:'}
</p>
<ul className={styles.facts}>
{ARTEN.map(a=>(
<li key={a.typ} className={styles.fact}>
<span className={styles.factIcon}><TypIcon typ={a.typ} size={24}/></span>
<span><strong>{de?a.de[0]:a.en[0]}</strong><span>{de?a.de[1]:a.en[1]}</span></span>
</li>
))}
</ul>
<Link href="/kommunen" className={styles.textLink}>{de?'Alle Gemeinschaften ansehen':'Browse all communities'} →</Link>
</div>
<div className={styles.spotImage}>
<img src={`${FOTO}/gemeinschaft-abend.jpg`} alt={de?'Menschen einer Gemeinschaft sitzen bei Sonnenuntergang zusammen':'Members of a community sitting together at sunset'} className={styles.spotImg} loading="lazy"/>
</div>
</section>

{/* 3 · Aktive Gemeinschaften (nur wenn vorhanden) */}
{dbKommunen.length>0&&(
<section className={styles.active}>
<div className={styles.sectionHead}>
<div>
<span className={styles.kicker}><span className={styles.kickerLine}/>{de?'Aktiv auf Communet':'Active on Communet'}</span>
<h2 className={styles.h2Small}>{de?'Diese Gemeinschaften sind direkt erreichbar':'These communities can be contacted directly'}</h2>
</div>
<Link href="/kommunen" className={styles.textLink}>{de?'Alle Gemeinschaften':'All communities'} →</Link>
</div>
<ul className={styles.activeList}>
{dbKommunen.slice(0,4).map(k=>(
<li key={k.id}>
<Link href={`/profil/p/${k.id}`} className={styles.activeItem}>
<span className={styles.activeAvatar} style={{background:getTypBg(k.kommune_typ||'Ökodorf')}}>
{k.avatar_url?<img src={k.avatar_url} alt=""/>:<TypIcon typ={k.kommune_typ||'Ökodorf'} size={28}/>}
</span>
<span className={styles.activeText}>
<strong>{k.name}</strong>
<span><span className={`badge ${getTypBadge(k.kommune_typ||'Ökodorf')}`}>{k.kommune_typ||'Ökodorf'}</span> <Icon name="standort" size={12}/> {k.land||(de?'Ort unbekannt':'Location unknown')}</span>
</span>
<span className={styles.arrow} aria-hidden="true">→</span>
</Link>
</li>
))}
</ul>
</section>
)}

{/* 4 · So funktioniert es */}
<section className={styles.steps}>
<div className={styles.stepsInner}>
<div className={styles.stepsHead}>
<h2 className={styles.h2Light}>{de?'So findest du deine Gemeinschaft':'How to find your community'}</h2>
<img src={`${FOTO}/tipi.jpg`} alt={de?'Blick von innen in die Spitze eines Tipis':'Looking up into the top of a tipi'} className={styles.stepsImg} loading="lazy"/>
</div>
<ol className={styles.stepGrid}>
<li className={styles.step}>
<span className={styles.stepNo}>01</span>
<strong>{de?'Karte öffnen':'Open the map'}</strong>
<span>{de?'Nach Land, Art oder Ort filtern. Ökodörfer, Kommunen, Kollektive und Wohnprojekte haben eigene Zeichen.':'Filter by country, type or place. Ecovillages, communes, collectives and housing projects each have their own symbol.'}</span>
</li>
<li className={styles.step}>
<span className={styles.stepNo}>02</span>
<strong>{de?'Profil lesen':'Read the profile'}</strong>
<span>{de?'Wie viele Menschen dort leben, seit wann es die Gemeinschaft gibt und ob Besuch willkommen ist.':'How many people live there, when it was founded and whether visitors are welcome.'}</span>
</li>
<li className={styles.step}>
<span className={styles.stepNo}>03</span>
<strong>{de?'Direkt schreiben':'Write directly'}</strong>
<span>{de?'Ohne Vermittlung und ohne Werbung. Deine Nachricht geht an die Gemeinschaft selbst.':'No middlemen, no ads. Your message goes to the community itself.'}</span>
</li>
</ol>
<Link href="/ueber-uns" className={styles.textLinkLight}>{de?'Mehr über Communet':'More about Communet'} →</Link>
</div>
</section>

{/* 5 · Eintragen */}
<section className={styles.cta} style={{backgroundImage:`url(${FOTO}/spirale.jpg)`}}>
<div className={styles.ctaInner}>
<Icon name="globus" size={56}/>
<h2 className={styles.h2}>{de?'Eure Gemeinschaft fehlt noch?':'Your community is not listed yet?'}</h2>
<GoldLine width={120}/>
<p className={styles.body}>{de?'Der Eintrag ist kostenlos und dauert etwa fünf Minuten.':'Listing is free and takes about five minutes.'}</p>
<div className={styles.ctaBtns}>
<Link href="/auth/login" className={styles.btnPrimary}>{de?'Gemeinschaft eintragen':'Add your community'}</Link>
<Link href="/auth/login" className={styles.btnSecondary}>{de?'Als Person registrieren':'Register as a person'}</Link>
</div>
</div>
</section>

<footer className={styles.footer}>
<span>communet.net · {de?'werbefrei und unabhängig':'ad-free and independent'}</span>
<nav className={styles.footerLinks} aria-label="Footer">
<Link href="/ueber-uns">{de?'Über uns':'About'}</Link>
<Link href="/kontakt">{de?'Kontakt':'Contact'}</Link>
<Link href="/datenschutz">{de?'Datenschutz':'Privacy'}</Link>
<Link href="/impressum">Impressum</Link>
</nav>
</footer>
<BackToTop/>
</div>
)
}
