import{useState,useEffect}from'react'
import dynamic from'next/dynamic'
import Link from'next/link'
import Nav from'../components/Nav'
import WaterPopup from'../components/WaterPopup'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{supabase}from'../lib/supabase'
import{useWaterSources,WATER_MIN_ZOOM,WATER_LIMIT,WATER_COLORS,FARM_MIN_ZOOM,inView}from'../lib/water'
import styles from'../styles/Karte.module.css'
const MapComponent=dynamic(()=>import('../components/Map'),{ssr:false,loading:()=><div className={styles.mapLoading}>🗺️</div>})

export default function Versorgung(){
const{t}=useLang()
const{user}=useAuth()
const[farmShops,setFarmShops]=useState([])
const[selectedFarm,setSelectedFarm]=useState(null)
const[showFarm,setShowFarm]=useState(true)
const[showWater,setShowWater]=useState(true)
const[onlyRoad,setOnlyRoad]=useState(false)
const[view,setView]=useState(null)
const[selectedWater,setSelectedWater]=useState(null)
const water=useWaterSources(!!user&&showWater,view)
const visibleWater=onlyRoad?water.items.filter(w=>w.road_distance_m!=null):water.items
const farmZoomOk=!!view&&view.zoom>=FARM_MIN_ZOOM
const visibleFarms=showFarm&&farmZoomOk?farmShops.filter(f=>inView(f,view)):[]

useEffect(()=>{
  if(!user)return
  supabase.from('farm_shops')
    .select('id,name,strasse,plz,ort,bundesland,bio_verband,lat,lon,website')
    .not('lat','is',null)
    .then(({data})=>{ if(data) setFarmShops(data) })
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
  if(!view||view.zoom<WATER_MIN_ZOOM) waterInfo='🔍 Zum Anzeigen der Wasserquellen weiter in die Karte hineinzoomen'
  else if(water.error) waterInfo='⚠️ Wasserquellen konnten nicht geladen werden'
  else if(water.loading&&water.items.length===0) waterInfo='Wasserquellen werden geladen …'
  else waterInfo=`💧 ${visibleWater.length}${water.items.length>=WATER_LIMIT?'+':''} Wasserquellen im Kartenausschnitt`
}

return(
<div className={styles.page}>
<Nav/>
<div className={styles.layout}>
<div className={styles.sidebar}>
<div className={styles.sideHeader}>
<h1 className={styles.title}>{t('supply_title')}</h1>
<p className={styles.sub}>{showFarm?(farmZoomOk?`🧺 ${visibleFarms.length} ${t('supply_farmshops')} im Kartenausschnitt`:'🔍 Zum Anzeigen der Bio-Hofläden und Wasserquellen in die Karte hineinzoomen'):`${farmShops.length} ${t('supply_farmshops')}`}</p>
</div>
<div className={styles.memberPanel}>
<span className={styles.memberLabel}>🔒 Nur mit Konto sichtbar</span>
<div className={styles.pills}>
<button className={`${styles.pill}${showFarm?' '+styles.active:''}`}onClick={()=>setShowFarm(v=>!v)}>🧺 {t('supply_farmshops')}</button>
<button className={`${styles.pill}${showWater?' '+styles.active:''}`}onClick={()=>setShowWater(v=>!v)}>💧 Wasserquellen</button>
</div>
{showWater&&(
<>
<label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)',cursor:'pointer'}}>
<input type="checkbox"checked={onlyRoad}onChange={e=>setOnlyRoad(e.target.checked)}/>
Nur an befahrbarer Straße (ohne reine Feldweg-Quellen)
</label>
<div style={{display:'flex',flexWrap:'wrap',gap:10,fontSize:11,color:'var(--muted)'}}>
{Object.entries(WATER_COLORS).map(([typ,c])=>(
<span key={typ}style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:'50%',background:c,display:'inline-block'}}/>{typ==='Wasserquelle zur Versorgung'?'Wasserquelle':typ}</span>
))}
</div>
<div style={{fontSize:12,color:'var(--text)'}}>{waterInfo}</div>
</>
)}
</div>
<div className={styles.list}>
{visibleFarms.map(f=>(
<div key={f.id}className={`${styles.listItem}${selectedFarm?.id===f.id?' '+styles.listActive:''}`}onClick={()=>selectFarm(f)}>
<span className={styles.listIcon}>🧺</span>
<div className={styles.listBody}>
<div className={styles.listName}>{f.name}</div>
<div className={styles.listLoc}>{f.ort}{f.ort&&f.bundesland?' · ':''}{f.bundesland}</div>
</div>
</div>
))}
</div>
</div>
<div className={styles.mapWrap}>
{user&&(showFarm||showWater)&&view&&view.zoom<FARM_MIN_ZOOM&&(
<div className={styles.zoomHint}>🔍 Zum Anzeigen weiter hineinzoomen</div>
)}
<MapComponent communities={[]}selected={null}onSelect={()=>{}}farmShops={visibleFarms}selectedFarm={selectedFarm}onSelectFarm={selectFarm}waterSources={showWater?visibleWater:[]}onSelectWater={selectWater}onViewChange={setView}/>
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
{selectedWater&&<WaterPopup w={selectedWater}onClose={()=>setSelectedWater(null)}/>}
</div>
</div>
</div>
)
}
