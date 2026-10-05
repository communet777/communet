import{useState,useEffect,useRef}from'react'
import Icon from'../components/Icon'
import dynamic from'next/dynamic'
import Nav from'../components/Nav'
import WaterPopup from'../components/WaterPopup'
import PlaceSearch from'../components/PlaceSearch'
import{useWaterSources,fetchAllRows,WATER_MIN_ZOOM,WATER_LIMIT,WATER_COLORS,WATER_CATEGORIES,DEFAULT_WATER_CATEGORIES,FARM_MIN_ZOOM,inView,saveMapView,loadMapView,normalizeFarmShopFr,normalizeFarmShopOsm}from'../lib/water'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{getTypBadge}from'../data/communities'
import TypIcon from'../components/TypIcon'
import{ICONS}from'../lib/typIcons'
import{getWaterIcon}from'../lib/waterIcons'
import{FARM_COLOR}from'../lib/typColors'
import{useCatalog}from'../lib/catalog'
import{supabase}from'../lib/supabase'
import styles from'../styles/Karte.module.css'
const MapComponent=dynamic(()=>import('../components/Map'),{ssr:false,loading:()=><div className={styles.mapLoading}><Icon name="karte" size={48}/></div>})

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
const[COMMUNITIES]=useCatalog()
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
const[showWater,setShowWater]=useState(false)
const[view,setView]=useState(null)
const[initialView]=useState(()=>loadMapView('communet-map-karte'))
function handleViewChange(v){setView(v);saveMapView('communet-map-karte',v)}
const[selectedWater,setSelectedWater]=useState(null)
const[flyTarget,setFlyTarget]=useState(null)
const[placeSearchOpen,setPlaceSearchOpen]=useState(false)
const[showRestricted,setShowRestricted]=useState(false)
const placeSearchRef=useRef(null)
const[activeCats,setActiveCats]=useState(DEFAULT_WATER_CATEGORIES)
const water=useWaterSources(!!user&&showWater,view)
const visibleWaterKarte=water.items.filter(w=>activeCats.includes(w.typ)&&(showRestricted||(w.access!=='private'&&w.access!=='no')))
const farmZoomOk=!!view&&view.zoom>=FARM_MIN_ZOOM
const visibleFarms=showFarmShops&&user&&farmZoomOk?farmShops.filter(f=>inView(f,view)):[]

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
  Promise.all([
    fetchAllRows(()=>supabase.from('farm_shops')
      .select('id,name,strasse,plz,ort,bundesland,bio_verband,lat,lon,website')
      .not('lat','is',null).order('id')),
    fetchAllRows(()=>supabase.from('farm_shops_fr')
      .select('numero_bio,name,adresse,code_postal,ville,departement,organisme_certificateur,lat,lon,site_web,raw,produits_web')
      .eq('location_precision','exact')
      .not('lat','is',null).order('numero_bio')),
    fetchAllRows(()=>supabase.from('farm_shops_osm')
      .select('osm_id,country,name,lat,lon,website,phone,email,addr_street,addr_housenumber,addr_city,addr_postcode,opening_hours')
      .not('lat','is',null).order('osm_id')),
  ]).then(([de,fr,osm])=>{
    const all=[...de, ...fr.map(normalizeFarmShopFr), ...osm.map(normalizeFarmShopOsm)]
    setFarmShops(all)
  })
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
setSelectedWater(null)
setMapZoom(DEFAULT_ZOOM)
}

function selectFarm(f){
setSelectedFarm(f)
setSelected(null)
setSelectedWater(null)
}

function selectWater(w){
setSelectedWater(w)
setSelected(null)
setSelectedFarm(null)
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
<div className={styles.searchWrap}style={{position:'relative'}}>
<span className={styles.searchIcon}>🔍</span>
<input type="text"className={styles.search}style={{paddingRight:34}}placeholder={t('communities_search')}value={search}onChange={e=>setSearch(e.target.value)}/>
<button type="button"onClick={()=>setPlaceSearchOpen(v=>!v)}title="Ort oder Adresse suchen"
style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',background:placeSearchOpen?'var(--g)':'none',border:'none',borderRadius:6,width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:13,filter:placeSearchOpen?'none':'grayscale(1)',opacity:placeSearchOpen?1:.55}}>
<Icon name="standort"/>
</button>
</div>
{placeSearchOpen&&(
<div ref={placeSearchRef}>
<PlaceSearch onFound={r=>{setFlyTarget(r);setPlaceSearchOpen(false)}}bias={view||(initialView?{south:initialView.lat-1,west:initialView.lon-1,north:initialView.lat+1,east:initialView.lon+1}:null)}placeholder="Ort oder Adresse suchen (wie Google Maps) …"/>
</div>
)}
<div className={styles.pills}>
{['alle','Ökodorf','Kommune','Kollektiv','Spirituelle Gemeinschaft','Wohnprojekt'].map(typ=>(
<button key={typ}className={`${styles.pill}${filter===typ?' '+styles.active:''}`}onClick={()=>setFilter(typ)}>
{typ==='alle'?t('communities_all').split(' ')[0]:<><TypIcon typ={typ}size={13}/> {typ==='Spirituelle Gemeinschaft'?'Spirituell':typ}</>}
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
<TypIcon src={ICONS.korb}size={13}/> Bio-Hofläden{!user?' 🔒':''}
</button>
<button
  className={`${styles.pill}${showWater&&user?' '+styles.active:''}${!user?' '+styles.pillDisabled:''}`}
  onClick={()=>user&&setShowWater(v=>!v)}
  disabled={!user}
  title={user?'Wasserquellen ein-/ausblenden':'Mit Konto sichtbar'}
>
<TypIcon src={ICONS.tropfen}size={13}/> Wasserquellen{!user?' 🔒':''}
</button>
</div>
{showFarmShops&&user&&(
<div style={{fontSize:11,color:'var(--muted)'}}>
{farmZoomOk?`${visibleFarms.length} Bio-Hofläden im Kartenausschnitt`:'Zum Anzeigen der Bio-Hofläden weiter hineinzoomen'}
</div>
)}
{showWater&&user&&(
<>
<div style={{display:'flex',flexWrap:'wrap',gap:4}}>
{WATER_CATEGORIES.map(c=>{
const on=activeCats.includes(c.key)
return(
<button key={c.key}type="button"onClick={()=>setActiveCats(prev=>on?prev.filter(k=>k!==c.key):[...prev,c.key])}
style={{display:'flex',alignItems:'center',gap:3,padding:'3px 8px',borderRadius:12,fontSize:10,cursor:'pointer',
border:`1px solid ${on?WATER_COLORS[c.key]:'var(--border)'}`,background:on?WATER_COLORS[c.key]+'1f':'var(--surface)',color:on?WATER_COLORS[c.key]:'var(--muted)'}}>
<TypIcon src={getWaterIcon(c.key)}size={12}/> {c.label}
</button>
)})}
</div>
<label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--muted)',cursor:'pointer'}}>
<input type="checkbox"checked={showRestricted}onChange={e=>setShowRestricted(e.target.checked)}/>
Auch als privat/gesperrt markierte Quellen zeigen
</label>
<div style={{fontSize:11,color:'var(--muted)'}}>
{!view||view.zoom<WATER_MIN_ZOOM?'Zum Anzeigen weiter hineinzoomen':water.error?'Konnten nicht geladen werden':`${visibleWaterKarte.length}${water.items.length>=WATER_LIMIT?'+':''} im Kartenausschnitt`}
</div>
</>
)}
</div>
<div className={styles.list}>
{filtered.map(k=>(
<div key={k.id}className={`${styles.listItem}${selected?.id===k.id?' '+styles.listActive:''}`}onClick={()=>selectFromList(k)}>
<span className={styles.listIcon}><TypIcon typ={k.typ}size={16}badge/></span>
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
{user&&(showFarmShops||showWater)&&view&&view.zoom<FARM_MIN_ZOOM&&(
<div className={styles.zoomHint}>🔍 Zum Anzeigen von {showFarmShops&&showWater?'Hofläden und Wasserquellen':showWater?'Wasserquellen':'Hofläden'} weiter hineinzoomen</div>
)}
<MapComponent communities={filtered}selected={selected}selectedZoom={mapZoom}onSelect={selectFromList}farmShops={visibleFarms}selectedFarm={selectedFarm}onSelectFarm={selectFarm}waterSources={showWater&&user?visibleWaterKarte:[]}onSelectWater={selectWater}onViewChange={handleViewChange}initialView={initialView}flyTarget={flyTarget}/>
{selected&&(
<div className={styles.popup}>
<button className={styles.popupClose}onClick={()=>setSelected(null)}>✕</button>
<div className={styles.popupIcon}>
  {selected.avatar_url
    ?<img src={selected.avatar_url} alt={selected.name} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover'}}/>
    :<TypIcon typ={selected.typ}size={26}badge/>
  }
</div>
<div className={styles.popupName}>{selected.name}</div>
<span className={`badge ${getTypBadge(selected.typ)}`}>{selected.typ}</span>
<div className={styles.popupLoc}><Icon name="standort"/> {selected.ort}{selected.ort&&selected.land?' · ':''}{selected.land}</div>
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
<div className={styles.popupIcon}><TypIcon src={ICONS.korb}size={26}badge bg={FARM_COLOR}/></div>
<div className={styles.popupName}>{selectedFarm.name}</div>
<span className="badge badge-hof">{t('hof_badge')}</span>
<div className={styles.popupLoc}><Icon name="standort"/> {selectedFarm.ort}{selectedFarm.ort&&selectedFarm.bundesland?' · ':''}{selectedFarm.bundesland}</div>
{selectedFarm.bio_verband&&<div className={styles.popupDesc}>{t('hof_verband')}: {selectedFarm.bio_verband}</div>}
{selectedFarm.produits&&selectedFarm.produits.length>0&&<div className={styles.popupDesc}>🛒 {selectedFarm.produits.join(' · ')}</div>}
{selectedFarm.hinweis&&<div className={styles.popupLoc}>ℹ️ {selectedFarm.hinweis}</div>}
<a href={`/hoflaeden/${encodeURIComponent(selectedFarm.id)}`}className={`${styles.popupBtn} ${styles.popupBtnFarm}`}>{t('map_view_profile')}</a>
</div>
)}
{selectedWater&&<WaterPopup w={selectedWater}onClose={()=>setSelectedWater(null)}/>}
</div>
</div>
</div>
)
}
