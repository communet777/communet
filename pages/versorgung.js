import{useState,useEffect,useMemo}from'react'
import Icon from'../components/Icon'
import dynamic from'next/dynamic'
import Link from'next/link'
import Nav from'../components/Nav'
import WaterPopup from'../components/WaterPopup'
import PlaceSearch from'../components/PlaceSearch'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{supabase}from'../lib/supabase'
import{useWaterSources,useWaterOverview,fetchAllRows,WATER_MIN_ZOOM,WATER_LIMIT,WATER_COLORS,WATER_CATEGORIES,DEFAULT_WATER_CATEGORIES,FARM_MIN_ZOOM,OVERVIEW_TYPES,inView,saveMapView,loadMapView,normalizeFarmShopFr,normalizeFarmShopOsm}from'../lib/water'
import TypIcon from'../components/TypIcon'
import{ICONS}from'../lib/typIcons'
import{getWaterIcon}from'../lib/waterIcons'
import{FARM_COLOR}from'../lib/typColors'
import styles from'../styles/Karte.module.css'
const MapComponent=dynamic(()=>import('../components/Map'),{ssr:false,loading:()=><div className={styles.mapLoading}><Icon name="karte" size={48}/></div>})

export default function Versorgung(){
const{t}=useLang()
const{user}=useAuth()
const[farmShops,setFarmShops]=useState([])
const[selectedFarm,setSelectedFarm]=useState(null)
const[showFarm,setShowFarm]=useState(true)
const[showWater,setShowWater]=useState(true)
const[onlyRoad,setOnlyRoad]=useState(false)
const[showRestricted,setShowRestricted]=useState(false)
const[activeCats,setActiveCats]=useState(DEFAULT_WATER_CATEGORIES)
const[view,setView]=useState(null)
const[initialView]=useState(()=>loadMapView('communet-map-versorgung'))
function handleViewChange(v){setView(v);saveMapView('communet-map-versorgung',v)}
const[selectedWater,setSelectedWater]=useState(null)
const[flyTarget,setFlyTarget]=useState(null)
const water=useWaterSources(!!user&&showWater,view)
let visibleWater=water.items.filter(w=>activeCats.includes(w.typ))
if(onlyRoad)visibleWater=visibleWater.filter(w=>w.road_distance_m!=null)
if(!showRestricted)visibleWater=visibleWater.filter(w=>w.access!=='private'&&w.access!=='no')
const farmZoomOk=!!view&&view.zoom>=FARM_MIN_ZOOM
const visibleFarms=showFarm&&farmZoomOk?farmShops.filter(f=>inView(f,view)):[]
// Weltansicht: unterhalb der Detail-Zoomstufe alle Hofläden und Quellen als kleine Punkte zeigen
const overviewMode=!!view&&view.zoom<FARM_MIN_ZOOM
const waterOverview=useWaterOverview(!!user&&showWater&&overviewMode,activeCats)
const overviewPoints=useMemo(()=>{
  if(!overviewMode)return[]
  const pts=[]
  if(showFarm)for(const f of farmShops){if(f.lat!=null&&f.lon!=null)pts.push({lat:f.lat,lon:f.lon,color:FARM_COLOR})}
  if(showWater)for(const p of waterOverview){
    if(onlyRoad&&!p[3])continue
    if(!showRestricted&&p[4])continue
    const typ=OVERVIEW_TYPES[p[2]]
    pts.push({lat:p[0],lon:p[1],color:WATER_COLORS[typ]})
  }
  return pts
},[overviewMode,showFarm,showWater,farmShops,waterOverview.length,activeCats.join('|'),onlyRoad,showRestricted])

useEffect(()=>{
  if(!user)return
  // Seitenweise laden: Supabase liefert höchstens 1000 Zeilen pro Anfrage (Frankreich hat mehr)
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
},[user])

function selectFarm(f){ setSelectedFarm(f); setSelectedWater(null) }
function selectWater(w){ setSelectedWater(w); setSelectedFarm(null) }

if(!user){
return(
<div className={styles.page}>
<Nav/>
<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,padding:24,textAlign:'center'}}>
<div style={{fontSize:40}}>🔒</div>
<h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:22,margin:0}}>{t('supply_locked_title')}</h1>
<p style={{color:'var(--muted)',maxWidth:420,margin:0}}>{t('supply_locked_desc')}</p>
<Link href="/auth/login"className={styles.popupBtn}style={{padding:'10px 28px',display:'inline-block'}}>{t('supply_login_cta')}</Link>
</div>
</div>
)
}

let waterInfo=null
if(showWater){
  if(!view||view.zoom<WATER_MIN_ZOOM) waterInfo=waterOverview.length?`${waterOverview.length.toLocaleString('de-DE')} Wasserquellen weltweit · zum Öffnen einer Quelle hineinzoomen`:'Wasserquellen werden geladen …'
  else if(water.error) waterInfo='Wasserquellen konnten nicht geladen werden'
  else if(water.loading&&water.items.length===0) waterInfo='Wasserquellen werden geladen …'
  else waterInfo=`${visibleWater.length}${water.items.length>=WATER_LIMIT?'+':''} Wasserquellen im Kartenausschnitt`
}

return(
<div className={styles.page}>
<Nav/>
<div className={styles.layout}>
<div className={styles.sidebar}>
<div className={styles.sideHeader}>
<h1 className={styles.title}>{t('supply_title')}</h1>
<PlaceSearch onFound={r=>setFlyTarget(r)}bias={view||(initialView?{south:initialView.lat-1,west:initialView.lon-1,north:initialView.lat+1,east:initialView.lon+1}:null)}/>
<p className={styles.sub}>{showFarm?(farmZoomOk?`${visibleFarms.length} ${t('supply_farmshops')} im Kartenausschnitt`:`${farmShops.length.toLocaleString('de-DE')} ${t('supply_farmshops')} · zum Öffnen hineinzoomen`):`${farmShops.length} ${t('supply_farmshops')}`}</p>
</div>
<div className={styles.memberPanel}>
<span className={styles.memberLabel}>🔒 Nur mit Konto sichtbar</span>
<div className={styles.pills}>
<button className={`${styles.pill}${showFarm?' '+styles.active:''}`}onClick={()=>setShowFarm(v=>!v)}><TypIcon src={ICONS.korb}size={13}/> {t('supply_farmshops')}</button>
<button className={`${styles.pill}${showWater?' '+styles.active:''}`}onClick={()=>setShowWater(v=>!v)}><TypIcon src={ICONS.tropfen}size={13}/> Wasserquellen</button>
</div>
{showWater&&(
<>
<div style={{display:'flex',flexWrap:'wrap',gap:6}}>
{WATER_CATEGORIES.map(c=>{
const on=activeCats.includes(c.key)
return(
<button key={c.key}type="button"onClick={()=>setActiveCats(prev=>on?prev.filter(k=>k!==c.key):[...prev,c.key])}
style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:14,fontSize:11,cursor:'pointer',
border:`1px solid ${on?WATER_COLORS[c.key]:'var(--border)'}`,background:on?WATER_COLORS[c.key]+'1f':'var(--surface)',color:on?WATER_COLORS[c.key]:'var(--muted)'}}>
<TypIcon src={getWaterIcon(c.key)}size={13}/> {c.label}
</button>
)})}
</div>
<label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)',cursor:'pointer'}}>
<input type="checkbox"checked={onlyRoad}onChange={e=>setOnlyRoad(e.target.checked)}/>
Nur an befahrbarer Straße (ohne reine Feldweg-Quellen)
</label>
<label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)',cursor:'pointer'}}>
<input type="checkbox"checked={showRestricted}onChange={e=>setShowRestricted(e.target.checked)}/>
Auch als privat/gesperrt markierte Quellen zeigen
</label>
<div style={{fontSize:12,color:'var(--text)'}}>{waterInfo}</div>
</>
)}
</div>
<div className={styles.list}>
{visibleFarms.map(f=>(
<div key={f.id}className={`${styles.listItem}${selectedFarm?.id===f.id?' '+styles.listActive:''}`}onClick={()=>selectFarm(f)}>
<span className={styles.listIcon}><TypIcon src={ICONS.korb}size={16}badge bg={FARM_COLOR}/></span>
<div className={styles.listBody}>
<div className={styles.listName}>{f.name}</div>
<div className={styles.listLoc}>{f.ort}{f.ort&&f.bundesland?' · ':''}{f.bundesland}</div>
</div>
</div>
))}
</div>
</div>
<div className={styles.mapWrap}>
<MapComponent communities={[]}selected={null}onSelect={()=>{}}farmShops={visibleFarms}selectedFarm={selectedFarm}onSelectFarm={selectFarm}waterSources={showWater?visibleWater:[]}overviewPoints={overviewPoints}onSelectWater={selectWater}onViewChange={handleViewChange}initialView={initialView}flyTarget={flyTarget}/>
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
