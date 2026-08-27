import{useRouter}from'next/router'
import{useState,useEffect}from'react'
import Link from'next/link'
import dynamic from'next/dynamic'
import Nav from'../../components/Nav'
import{useLang}from'../../lib/LanguageContext'
import{useAuth}from'../../lib/AuthContext'
import{supabase}from'../../lib/supabase'
import styles from'../../styles/KommuneProfil.module.css'
import supplyStyles from'../../styles/Karte.module.css'
const MiniMap=dynamic(()=>import('../../components/MiniMap'),{ssr:false,loading:()=><div className={styles.mapPlaceholder}>🗺️</div>})

export default function HofladenProfil(){
const router=useRouter()
const{t}=useLang()
const{user}=useAuth()
const{id}=router.query
const[hof,setHof]=useState(null)
const[loading,setLoading]=useState(true)

useEffect(()=>{
if(!user||!id)return
supabase.from('farm_shops').select('*').eq('id',id).single()
.then(({data})=>{ setHof(data); setLoading(false) })
},[user,id])

if(!user){
return(
<div className={supplyStyles.page}>
<Nav/>
<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,padding:24,textAlign:'center'}}>
<div style={{fontSize:40}}>🔒</div>
<h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:22,margin:0}}>{t('supply_locked_title')}</h1>
<p style={{color:'var(--muted)',maxWidth:420,margin:0}}>{t('supply_locked_desc')}</p>
<Link href="/auth/login"className={supplyStyles.popupBtn}style={{padding:'10px 28px',display:'inline-block'}}>{t('supply_login_cta')}</Link>
</div>
</div>
)
}

if(!loading&&!hof){
return(
<div>
<Nav/>
<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>{t('hof_not_found')} — <Link href="/versorgung"style={{color:'var(--g)'}}>{t('hof_back')}</Link></div>
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

const addr=[hof.strasse,[hof.plz,hof.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')

return(
<div>
<Nav/>
<div className={styles.banner}>
<div className={styles.avatar}>🧺</div>
</div>
<div className={styles.profileHeader}>
<div>
<h1 className={styles.name}>{hof.name}</h1>
<div className={styles.meta}>
{hof.bio_verband&&<span className="badge">{hof.bio_verband}</span>}
<span className={styles.loc}>📍 {hof.ort}{hof.ort&&hof.bundesland?' · ':''}{hof.bundesland}</span>
</div>
</div>
<Link href="/versorgung"className={styles.inviteBtn}>{t('hof_back')}</Link>
</div>

<div className={styles.content}>
<div className={styles.main}>
<div className={styles.section}>
<div className={styles.sectionTitle}>{t('hof_address')}</div>
<p className={styles.desc}>{addr||'—'}</p>
</div>
{(hof.telefon||hof.email||hof.website)&&
<div className={styles.section}>
<div className={styles.sectionTitle}>{t('hof_contact')}</div>
<div style={{display:'flex',flexDirection:'column',gap:8,fontSize:13}}>
{hof.telefon&&<a href={`tel:${hof.telefon}`}style={{color:'var(--g)'}}>📞 {hof.telefon}</a>}
{hof.email&&<a href={`mailto:${hof.email}`}style={{color:'var(--g)'}}>✉️ {hof.email}</a>}
{hof.website&&<a href={hof.website}target="_blank"rel="noopener noreferrer"style={{color:'var(--g)'}}>🔗 {hof.website}</a>}
</div>
</div>
}
{hof.quelle_url&&
<div className={styles.section}>
<a href={hof.quelle_url}target="_blank"rel="noopener noreferrer"style={{fontSize:11,color:'var(--muted)'}}>{t('hof_source')} ↗</a>
</div>
}
</div>
<div className={styles.sidebar}>
<div className={styles.sideCard}>
<div className={styles.sideTitle}>📍 {t('profile_location')}</div>
{hof.lat&&hof.lon
?<MiniMap lat={hof.lat} lon={hof.lon} name={hof.name}/>
:<div className={styles.mapPlaceholder}style={{fontSize:13,color:'var(--muted)',padding:'16px 0'}}>📍 {hof.ort}</div>
}
<div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>{addr}</div>
</div>
</div>
</div>
</div>
)
}
