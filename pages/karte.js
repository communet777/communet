import{useState,useEffect}from'react'
import dynamic from'next/dynamic'
import Nav from'../components/Nav'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{COMMUNITIES,getTypBadge,getTypIcon}from'../data/communities'
import{supabase}from'../lib/supabase'
import styles from'../styles/Karte.module.css'
const MapComponent=dynamic(()=>import('../components/Map'),{ssr:false,loading:()=><div className={styles.mapLoading}>🗺️</div>})

const SEARCH_ZOOM=11 // Zoomstufe beim automatischen Reinzoomen auf einen eindeutigen Suchtreffer (0=raus, 18=max. rein)
const DEFAULT_ZOOM=6

function dbToMap(p) {
  return {
    id:'db_'+p.id,
    dbId:p.id,
    name:p.name||'(kein Name)',
    typ:p.kommune_typ||'Kommune',
    ort:p.land?p.land.split(',')[0].trim():'',
    land:p.land?p.land.split(',').slice(-1)[0].trim():'',
    lat:p.lat,
    lon:p.lon,
    status:'aktiv',
    beschreibung:p.bio||'',
    avatar_url:p.avatar_url||null,
  }
}

export default function Karte(){
const{t}=useLang()
const{user}=useAuth()
const[selected,setSelected]=useState(null)
const[selectedFarm,setSelectedFarm]=useState(null)
const[mapZoom,setMapZoom]=useState(DEFAULT_ZOOM)
const[filter,setFilter]=useState('alle')
const[search,setSearch]=useState('')
const[dbKommunen,setDbKommunen]=useState([])
const[showFarmShops,setShowFarmShops]=useState(false)
const[farmShops,setFarmShops]=useState([])

useEffect(()=>{
  supabase.from('profiles')
    .select('id,name,kommune_typ,land,lat,lon,bio,avatar_url')
    .eq('typ','kommune')
    .eq('status','approved')
    .not('lat','is',null)
    .then(({data})=>{ if(data) setDbKommunen(data.map(dbToMap)) })
},[])

useEffect(()=>{
  if(!user||!showFarmShops){ setFarmShops([]); return }
  supabase.from('farm_shops')
    .select('id,name,strasse,plz,ort,bundesland,bio_verband,lat,lon,website')
    .not('lat','is',null)
    .then(({data})=>{ if(data) setFarmShops(data) })
},[user,showFarmShops])

const allKommunen=[...dbKommunen,...COMMUNITIES]
const filtered=allKommunen.filter(k=>{
if(filter!=='alle'&&k.typ!==filter)return false
const q=search.trim().toLowerCase()
if(!q)return true
return(
k.name.toLowerCase().includes(q)||
(k.ort||'').toLowerCase().includes(q)||
(k.land||'').toLowerCase().includes(q)
)
})

// Sobald die Suche auf genau einen Treffer eingrenzt, automatisch dorthin zoomen
useEffect(()=>{
if(!search.trim())return
const q=search.trim().toLowerCase()
const matches=allKommunen.filter(k=>filter==='alle'||k.typ===filter).filter(k=>
k.name.toLowerCase().includes(q)||(k.ort||'').toLowerCase().includes(q)||(k.land||'').toLowerCase().includes(q)
)
if(matches.length===1){
selectFromList(matches[0])
setMapZoom(SEARCH_ZOOM)
}
},[search])

function selectFromList(k){
setSelected(k)
setSelectedFarm(null)
setMapZoom(DEFAULT_ZOOM)
}

function selectFarm(f){
setSelectedFarm(f)
setSelected(null)
}

return(
<div className={styles.page}>
<Nav/>
<div className={styles.layout}>
<div className={styles.sidebar}>
<div className={styles.sideHeader}>
<h1 className={styles.title}>{t('map_title')}</h1>
<p className={styles.sub}>{filtered.length} {t('map_communities')}</p>
</div>
<div className={styles.searchWrap}>
<span className={styles.searchIcon}>🔍</span>
<input type="text"className={styles.search}placeholder={t('communities_search')}value={search}onChange={e=>setSearch(e.target.value)}/>
</div>
<div className={styles.pills}>
{['alle','Ökodorf','Kommune','Kollektiv','Spirituelle Gemeinschaft','Wohnprojekt'].map(typ=>(
<button key={typ}className={`${styles.pill}${filter===typ?' '+styles.active:''}`}onClick={()=>setFilter(typ)}>
{typ==='alle'?t('communities_all').split(' ')[0]:`${getTypIcon(typ)} ${typ==='Spirituelle Gemeinschaft'?'Spirituell':typ}`}
</button>
))}
</div>
<div className={styles.memberPanel}>
<span className={styles.memberLabel}>🔒 Nur mit Konto sichtbar</span>
<div className={styles.pills}>
<button
  className={`${styles.pill}${showFarmShops&&user?' '+styles.active:''}${!user?' '+styles.pillDisabled:''}`}
  onClick={()=>user&&setShowFarmShops(v=>!v)}
  disabled={!user}
  title={user?'Bio-Hofläden ein-/ausblenden':'Mit Konto sichtbar'}
>
🧺 Bio-Hofläden{!user?' 🔒':''}
</button>
</div>
</div>
<div className={styles.list}>
{filtered.map(k=>(
<div key={k.id}className={`${styles.listItem}${selected?.id===k.id?' '+styles.listActive:''}`}onClick={()=>selectFromList(k)}>
<span className={styles.listIcon}>{getTypIcon(k.typ)}</span>
<div className={styles.listBody}>
<div className={styles.listName}>{k.name}</div>
<div className={styles.listLoc}>{k.ort}{k.ort&&k.land?' · ':''}{k.land}</div>
</div>
<div className={`${styles.statusDot}${k.status==='aktiv'?' '+styles.dotGreen:' '+styles.dotGray}`}/>
</div>
))}
</div>
</div>
<div className={styles.mapWrap}>
<MapComponent communities={filtered}selected={selected}selectedZoom={mapZoom}onSelect={selectFromList}farmShops={showFarmShops&&user?farmShops:[]}selectedFarm={selectedFarm}onSelectFarm={selectFarm}/>
{selected&&(
<div className={styles.popup}>
<button className={styles.popupClose}onClick={()=>setSelected(null)}>✕</button>
<div className={styles.popupIcon}>
  {selected.avatar_url
    ?<img src={selected.avatar_url} alt={selected.name} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover'}}/>
    :getTypIcon(selected.typ)
  }
</div>
<div className={styles.popupName}>{selected.name}</div>
<span className={`badge ${getTypBadge(selected.typ)}`}>{selected.typ}</span>
<div className={styles.popupLoc}>📍 {selected.ort}{selected.ort&&selected.land?' · ':''}{selected.land}</div>
<div className={styles.popupDesc}>{selected.beschreibung?.slice(0,100)}…</div>
<div className={styles.popupStatus}style={{color:selected.status==='aktiv'?'var(--g)':'var(--muted)'}}>
{selected.status==='aktiv'?`🟢 ${t('map_active')}`:`⚫ ${t('map_inactive')}`}
</div>
<a href={selected.dbId?`/profil/p/${selected.dbId}`:`/kommunen/${selected.id}`}className={styles.popupBtn}>{t('map_view_profile')}</a>
</div>
)}
{selectedFarm&&(
<div className={styles.popup}>
<button className={styles.popupClose}onClick={()=>setSelectedFarm(null)}>✕</button>
<div className={styles.popupIcon}>🧺</div>
<div className={styles.popupName}>{selectedFarm.name}</div>
<span className="badge badge-hof">{t('hof_badge')}</span>
<div className={styles.popupLoc}>📍 {selectedFarm.ort}{selectedFarm.ort&&selectedFarm.bundesland?' · ':''}{selectedFarm.bundesland}</div>
{selectedFarm.bio_verband&&<div className={styles.popupDesc}>{t('hof_verband')}: {selectedFarm.bio_verband}</div>}
<a href={`/hoflaeden/${selectedFarm.id}`}className={`${styles.popupBtn} ${styles.popupBtnFarm}`}>{t('map_view_profile')}</a>
</div>
)}
</div>
</div>
</div>
)
}
