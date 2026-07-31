import{useState,useEffect}from'react'
import{useRouter}from'next/router'
import Link from'next/link'
import Nav from'../../components/Nav'
import BackToTop from'../../components/BackToTop'
import{useLang}from'../../lib/LanguageContext'
import{COMMUNITIES,TYPEN,getTypBadge,getStatusInfo,LAND_EN,getTypIcon}from'../../data/communities'
import{supabase}from'../../lib/supabase'
import styles from'../../styles/Kommunen.module.css'

const KONTINENTE={
'Europa':['Deutschland','Dänemark','Schottland','England','Wales','Portugal','Italien','Frankreich','Niederlande','Schweden','Norwegen','Island','Irland','Spanien','Schweiz','Österreich','Belgien','Ungarn','Tschechien','Slowenien','Rumänien','Kroatien','Serbien','Polen','Lettland','Litauen','Estland','Ukraine','Russland','Griechenland'],
'Amerika':['USA','Kanada','Mexiko','Nicaragua','Costa Rica','Guatemala','Kolumbien','Ecuador','Peru','Brasilien','Argentinien','Chile'],
'Asien':['Indien','Thailand','Sri Lanka','Japan','China','Indonesien','Taiwan','Südkorea'],
'Afrika':['Senegal','Gambia','Kenia','Tansania','Zimbabwe','Südafrika','Marokko','Burkina Faso'],
'Ozeanien':['Australien','Neuseeland'],
'Naher Osten':['Israel','Palästina']
}

function dbToCard(p){
return{
id:'db_'+p.id,name:p.name||'(kein Name)',typ:p.kommune_typ||'Kommune',
ort:p.land?p.land.split(',')[0].trim():'',
land:p.land?p.land.split(',').slice(-1)[0].trim():'',
lat:p.lat,lon:p.lon,jahr:p.gruendungsjahr,members:p.mitglieder||'?',
angebote:0,besucher:'anmeldung',status:'aktiv',verified:true,
beschreibung:p.bio||'',beschreibung_en:p.bio||'',
website:p.website||'',tags:[],avatar_url:p.avatar_url||null,dbId:p.id,
}
}

export default function Kommunen(){
const{t,lang}=useLang()
const router=useRouter()
const[search,setSearch]=useState('')
const[filter,setFilter]=useState('alle')
const[kontinent,setKontinent]=useState('alle')
const[nurAktive,setNurAktive]=useState(false)
const[dbKommunen,setDbKommunen]=useState([])

useEffect(()=>{
const q=router.query.q
if(q) setSearch(q)
},[router.query.q])

useEffect(()=>{
supabase.from('profiles').select('*').eq('typ','kommune').eq('status','approved')
.then(({data})=>{ if(data) setDbKommunen(data.map(dbToCard)) })
},[])

const allKommunen=[...dbKommunen,...COMMUNITIES]

const filtered=allKommunen.filter(k=>{
if(nurAktive&&k.status!=='aktiv')return false
const matchTyp=filter==='alle'||k.typ===filter
const matchKontinent=kontinent==='alle'||(KONTINENTE[kontinent]?.some(land=>k.land?.includes(land)))
const q=search.toLowerCase()
if(!q)return matchTyp&&matchKontinent
const landEn=(LAND_EN[k.land]||'').toLowerCase()
const desc=lang==='en'?(k.beschreibung_en||k.beschreibung):k.beschreibung
const matchSearch=
k.name.toLowerCase().includes(q)||
(k.ort||'').toLowerCase().includes(q)||
(k.land||'').toLowerCase().includes(q)||
landEn.includes(q)||
(desc||'').toLowerCase().includes(q)||
(k.tags||[]).some(tag=>tag.toLowerCase().includes(q))
return matchTyp&&matchKontinent&&matchSearch
})

return(
<div>
<Nav/>
<div className={styles.header}>
<h1 className={styles.title}>{t('communities_title')}</h1>
<p className={styles.sub}>{t('communities_sub')}</p>
</div>
<div className={styles.toolbar}>
<div className={styles.searchWrap}>
<span className={styles.searchIcon}>🔍</span>
<input type="text"className={styles.search}
placeholder={t('communities_search')}
value={search}onChange={e=>setSearch(e.target.value)}/>
</div>

{/* Typ-Filter */}
<div className={styles.pills}>
<button className={`${styles.pill}${filter==='alle'?' '+styles.active:''}`}onClick={()=>setFilter('alle')}>{t('communities_all')}</button>
{TYPEN.map(typ=>(
<button key={typ}className={`${styles.pill}${filter===typ?' '+styles.active:''}`}onClick={()=>setFilter(typ)}>
{getTypIcon(typ)} {typ==='Spirituelle Gemeinschaft'?'Spirituell':typ}
</button>
))}
</div>

{/* Kontinent-Filter */}
<div className={styles.pills}>
<button className={`${styles.pill}${kontinent==='alle'?' '+styles.active:''}`}onClick={()=>setKontinent('alle')}>Alle Kontinente</button>
{Object.keys(KONTINENTE).map(k=>(
<button key={k}className={`${styles.pill}${kontinent===k?' '+styles.active:''}`}onClick={()=>setKontinent(k)}>{k}</button>
))}
</div>

{/* Status-Filter */}
<div className={styles.pills}>
<button className={`${styles.pill}${!nurAktive?' '+styles.activeStatus:''}`}onClick={()=>setNurAktive(false)}>Alle</button>
<button className={`${styles.pill}${nurAktive?' '+styles.activeStatus:''}`}onClick={()=>setNurAktive(true)}>🟢 Nur aktive</button>
</div>
</div>

<div className={styles.resultsBar}>{filtered.length}+ {t('communities_found')}</div>
<div className={styles.grid}>
{filtered.length===0?<div className={styles.empty}>—</div>:filtered.map(k=>{
const status=getStatusInfo(k.status)
const isInactive=k.status==='nicht-registriert'
const isDb=!!k.dbId
const displayLand=lang==='en'?(LAND_EN[k.land]||k.land):k.land
const href=isDb?`/profil/p/${k.dbId}`:`/kommunen/${k.id}`
const bgColor=k.typ==='Kommune'?'#fff3e0':k.typ==='Kollektiv'?'#e8eaf6':k.typ==='Spirituelle Gemeinschaft'?'#f3e5f5':k.typ==='Wohnprojekt'?'#e0f2f1':'#e8f5ee'
return(
<div key={k.id}style={{position:'relative'}}>
<Link href={href}className={`${styles.card}${isInactive?' '+styles.cardInactive:''}`}>
<div className={styles.cardImg}style={{background:bgColor,opacity:isInactive?0.5:1}}>
{k.avatar_url
?<img src={k.avatar_url} alt={k.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4}}/>
:<span style={{fontSize:32,filter:isInactive?'grayscale(80%)':'none'}}>{getTypIcon(k.typ)}</span>
}
</div>
<div className={styles.cardBody}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:4}}>
<span className={`badge ${getTypBadge(k.typ)}`}style={{opacity:isInactive?0.6:1}}>{k.typ==='Spirituelle Gemeinschaft'?'Spirituell':k.typ}</span>
<span style={{fontSize:10,color:status.color,background:status.bg,padding:'2px 6px',borderRadius:10,whiteSpace:'nowrap',flexShrink:0}}>
{isInactive?`⚫ ${t('status_inactive')}`:`🟢 ${t('status_active')}`}
</span>
</div>
<div className={styles.cardName}style={{color:isInactive?'var(--muted)':'var(--text)'}}>{k.name}</div>
<div className={styles.cardLoc}>📍 {k.ort}{k.ort&&k.land?' · ':''}{displayLand}</div>
<div className={styles.cardFooter}>
<span>👥 ~{k.members}</span>
{isDb&&<span style={{color:'var(--g)',fontWeight:500,fontSize:11}}>Auf Communet</span>}
</div>
</div>
</Link>
</div>
)})}
</div>
<BackToTop/>
</div>
)
}
