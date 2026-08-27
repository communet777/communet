import{useState,useEffect}from'react'
import dynamic from'next/dynamic'
import Link from'next/link'
import Nav from'../components/Nav'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{supabase}from'../lib/supabase'
import styles from'../styles/Karte.module.css'
const MapComponent=dynamic(()=>import('../components/Map'),{ssr:false,loading:()=><div className={styles.mapLoading}>🗺️</div>})

export default function Versorgung(){
const{t}=useLang()
const{user}=useAuth()
const[farmShops,setFarmShops]=useState([])
const[selectedFarm,setSelectedFarm]=useState(null)

useEffect(()=>{
  if(!user)return
  supabase.from('farm_shops')
    .select('id,name,strasse,plz,ort,bundesland,bio_verband,lat,lon,website')
    .not('lat','is',null)
    .then(({data})=>{ if(data) setFarmShops(data) })
},[user])

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

return(
<div className={styles.page}>
<Nav/>
<div className={styles.layout}>
<div className={styles.sidebar}>
<div className={styles.sideHeader}>
<h1 className={styles.title}>{t('supply_title')}</h1>
<p className={styles.sub}>{farmShops.length} {t('supply_farmshops')}</p>
</div>
<div className={styles.memberPanel}>
<span className={styles.memberLabel}>🔒 Nur mit Konto sichtbar</span>
<div className={styles.pills}>
<button className={`${styles.pill} ${styles.active}`}>🧺 {t('supply_farmshops')}</button>
<button className={`${styles.pill} ${styles.pillDisabled}`}disabled title={t('supply_water_soon')}>💧 {t('supply_water_soon')}</button>
</div>
</div>
<div className={styles.list}>
{farmShops.map(f=>(
<div key={f.id}className={`${styles.listItem}${selectedFarm?.id===f.id?' '+styles.listActive:''}`}onClick={()=>setSelectedFarm(f)}>
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
<MapComponent communities={[]}selected={null}onSelect={()=>{}}farmShops={farmShops}selectedFarm={selectedFarm}onSelectFarm={setSelectedFarm}/>
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
