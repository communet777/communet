import{useRouter}from'next/router'
import{useState,useEffect}from'react'
import Link from'next/link'
import dynamic from'next/dynamic'
import Nav from'../../components/Nav'
import{useAuth}from'../../lib/AuthContext'
import{supabase}from'../../lib/supabase'
import{WATER_COLORS,bestDistance,roadLabel,formatCoords,reverseGeocode}from'../../lib/water'
import styles from'../../styles/KommuneProfil.module.css'
import supplyStyles from'../../styles/Karte.module.css'
const MiniMap=dynamic(()=>import('../../components/MiniMap'),{ssr:false,loading:()=><div className={styles.mapPlaceholder}>🗺️</div>})

export default function WasserquellenProfil(){
const router=useRouter()
const{user}=useAuth()
const{id}=router.query // osm_id, z.B. "node%2F123456" -> wird unten decodiert
const[w,setW]=useState(null)
const[loading,setLoading]=useState(true)
const[address,setAddress]=useState(null)
const[addressLoading,setAddressLoading]=useState(false)
const[imgFailed,setImgFailed]=useState(false)

useEffect(()=>{
if(!user||!id)return
supabase.from('water_sources').select('*').eq('osm_id',decodeURIComponent(id)).single()
.then(({data})=>{ setW(data); setLoading(false) })
},[user,id])

useEffect(()=>{
if(!w||!w.lat||!w.lon)return
setAddressLoading(true)
reverseGeocode(w.lat,w.lon).then(setAddress).catch(()=>setAddress(null)).finally(()=>setAddressLoading(false))
},[w])

useEffect(()=>{ setImgFailed(false) },[w?.wiki_image_url])

if(!user){
return(
<div className={supplyStyles.page}>
<Nav/>
<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,padding:24,textAlign:'center'}}>
<div style={{fontSize:40}}>🔒</div>
<h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:22,margin:0}}>Nur für Mitglieder</h1>
<p style={{color:'var(--muted)',maxWidth:420,margin:0}}>Melde dich an, um Wasserquellen zu sehen.</p>
<Link href="/auth/login"className={supplyStyles.popupBtn}style={{padding:'10px 28px',display:'inline-block'}}>Anmelden</Link>
</div>
</div>
)
}

if(!loading&&!w){
return(
<div>
<Nav/>
<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Wasserquelle nicht gefunden — <Link href="/versorgung"style={{color:'var(--g)'}}>Zurück zur Versorgung</Link></div>
</div>
)
}

if(loading){
return(
<div>
<Nav/>
<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>…</div>
</div>
)
}

const color=WATER_COLORS[w.typ]||'#2b7bb9'
const dist=bestDistance(w)
const route=`https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lon}`
const osm=`https://www.openstreetmap.org/${w.osm_id}`
const dw=w.drinking_water
const showWikiImg=!!w.wiki_image_url&&!imgFailed

return(
<div>
<Nav/>
<div className={styles.banner}>
<div className={styles.avatar}>{w.typ==='Thermalquelle'?'♨️':'💧'}</div>
</div>
<div className={styles.profileHeader}>
<div>
<h1 className={styles.name}>{w.name||w.typ}</h1>
<div className={styles.meta}>
<span className="badge"style={{background:color+'1f',color}}>{w.typ}</span>
{w.region&&<span className={styles.loc}>📍 {w.region}</span>}
</div>
</div>
<Link href="/versorgung"className={styles.inviteBtn}>Zurück zur Versorgung</Link>
</div>

<div className={styles.content}>
<div className={styles.main}>
<div className={styles.section}>
<div className={styles.sectionTitle}>Zufahrt</div>
<p className={styles.desc}>
{dist
?(dist.viaTrack
?`${dist.m} m bis zum nächsten Feld-/Waldweg.`
:`${dist.m} m bis zur Straße (${roadLabel(dist.roadType)}).`)
:'Keine Straße oder Weg im Umkreis von 250 m erfasst.'}
</p>
{dist?.viaTrack&&<p style={{fontSize:12,color:'#c0392b',background:'rgba(231,76,60,.08)',borderRadius:6,padding:'6px 10px'}}>⚠️ Nur über unbefestigten Weg — Zufahrt vor Ort prüfen, teils gesperrt oder privat</p>}
{w.access&&(w.access==='private'||w.access==='no')&&<p style={{fontSize:12,color:'#c0392b',background:'rgba(231,76,60,.08)',borderRadius:6,padding:'6px 10px'}}>⚠️ Als privat/gesperrt markiert (OSM: access={w.access})</p>}
</div>
<div className={styles.section}>
<div className={styles.sectionTitle}>Trinkbarkeit</div>
<p className={styles.desc}>
{dw==='yes'?'✅ Als Trinkwasser gekennzeichnet.'
:dw==='no'?'⚠️ Laut OpenStreetMap kein Trinkwasser.'
:'❔ Trinkbarkeit ungeprüft — vor dem Trinken abkochen oder filtern.'}
</p>
</div>
{w.wiki_url&&(
<div className={styles.section}>
<div className={styles.sectionTitle}>Wikipedia</div>
{w.wiki_extract&&<p className={styles.desc}>{w.wiki_extract}</p>}
<a href={w.wiki_url}target="_blank"rel="noopener noreferrer"style={{fontSize:13,color:'var(--g)'}}>{w.wiki_title||'Artikel lesen'} ↗</a>
</div>
)}
<div className={styles.section}>
<div className={styles.sectionTitle}>Lage</div>
<p className={styles.desc}>
{addressLoading?'Adresse wird ermittelt…':address||'Adresse nicht ermittelbar'}
<br/>
<span style={{fontSize:12,color:'var(--muted)'}}>{formatCoords(w.lat,w.lon)}</span>
</p>
</div>
<div className={styles.section}>
<a href={osm}target="_blank"rel="noopener noreferrer"style={{fontSize:11,color:'var(--muted)'}}>Quelle: OpenStreetMap ↗</a>
</div>
</div>
<div className={styles.sidebar}>
{showWikiImg&&(
<div className={styles.sideCard}style={{padding:0,overflow:'hidden'}}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={w.wiki_image_url}alt=""onError={()=>setImgFailed(true)}
style={{display:'block',width:'100%',height:140,objectFit:'cover'}}/>
</div>
)}
<div className={styles.sideCard}>
<a href={route}target="_blank"rel="noopener noreferrer"className={styles.inviteBtn}style={{width:'100%',textAlign:'center',display:'block',background:color}}>🧭 Route planen</a>
<a href={osm}target="_blank"rel="noopener noreferrer"style={{display:'block',textAlign:'center',marginTop:8,fontSize:12,color:'var(--g)'}}>Quelle öffnen ↗</a>
</div>
<div className={styles.sideCard}>
<div className={styles.sideTitle}>📍 Lage</div>
{w.lat&&w.lon
?<MiniMap lat={w.lat} lon={w.lon} name={w.name||w.typ}/>
:<div className={styles.mapPlaceholder}style={{fontSize:13,color:'var(--muted)',padding:'16px 0'}}>📍</div>
}
</div>
</div>
</div>
</div>
)
}
