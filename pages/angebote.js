import{useState,useEffect,useRef}from'react'
import Link from'next/link'
import Nav from'../components/Nav'
import BackToTop from'../components/BackToTop'
import{useAuth}from'../lib/AuthContext'
import{supabase}from'../lib/supabase'
import styles from'../styles/Angebote.module.css'

const OFFER_TYPES=['Workaway','Besuch','Langzeitaufenthalt','Workshop','Volontariat','Veranstaltung','Sonstiges']

function parseDate(val){
if(!val)return null
if(/^\d{4}-\d{2}-\d{2}$/.test(val))return val
const m=val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
return null
}

function haversine(lat1,lon1,lat2,lon2){
const R=6371
const dLat=(lat2-lat1)*Math.PI/180
const dLon=(lon2-lon1)*Math.PI/180
const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
return R*2*Math.asin(Math.sqrt(a))
}

function OfferCard({o,href}){
return(
<Link href={href}style={{textDecoration:'none'}}>
<div className={styles.card}style={{cursor:'pointer'}}>
<div className={styles.cardTop}>
<span className={styles.typBadge}>{o.typ}</span>
{o.datum&&<span className={styles.dateBadge}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
{!o.datum&&o.von&&<span className={styles.dateBadge}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
</div>
<div className={styles.cardTitle}>{o.titel}</div>
{o.kommune_name&&<div className={styles.cardKommune}>🏡 {o.kommune_name}</div>}
{o.ort&&<div className={styles.cardOrt}>📍 {o.ort}</div>}
{o.beschreibung&&<p className={styles.cardDesc}>{o.beschreibung.slice(0,100)}{o.beschreibung.length>100?'…':''}</p>}
</div>
</Link>
)
}

const EXAMPLE_OFFERS=[
{id:'ex1',typ:'Workaway',titel:'Mithelfen auf unserem Permakultur-Hof',kommune_name:'Ökodorf Sieben Linden',ort:'Sachsen-Anhalt',beschreibung:'Wir suchen Menschen die uns bei der Ernte und im Gemüsegarten helfen möchten.'},
{id:'ex2',typ:'Veranstaltung',datum:'2026-09-15',titel:'Gemeinschaftswochenende im Herbst',kommune_name:'ZEGG Gemeinschaft',ort:'Bad Belzig',beschreibung:'Zwei Tage Leben in Gemeinschaft kennenlernen. Offene Türen für Neugierige.'},
{id:'ex3',typ:'Workshop',titel:'Naturbauen Workshop — Lehmputz & Stroh',kommune_name:'Schloss Tempelhof',ort:'Baden-Württemberg',beschreibung:'Lerne traditionelle Bautechniken mit natürlichen Materialien.'},
]

function AngeboteGuest(){
return(
<div>
<div className={styles.guestWrap}>
<div className={styles.guestIcon}>✨</div>
<h1 className={styles.guestTitle}>Angebote von Kommunen</h1>
<p className={styles.guestDesc}>Kommunen bieten Workaway-Plätze, Besuche, Workshops und mehr an.<br/>Melde dich an um alle Angebote zu sehen und direkt Kontakt aufzunehmen.</p>
<Link href="/auth/login"className={styles.btnPrimary}>Jetzt anmelden</Link>
<Link href="/auth/login"className={styles.btnSecondary}>Noch kein Account? Registrieren</Link>
</div>
<div style={{maxWidth:1000,margin:'0 auto',padding:'0 20px 48px'}}>
<h2 style={{fontSize:16,fontWeight:600,marginBottom:16,color:'var(--muted)'}}>Beispiel-Angebote — nach der Anmeldung siehst du alle</h2>
<div className={styles.grid}>
{EXAMPLE_OFFERS.map(o=>(
<div key={o.id}className={styles.card}style={{opacity:0.65,filter:'blur(0.5px)',pointerEvents:'none'}}>
<div className={styles.cardTop}><span className={styles.typBadge}>{o.typ}</span>{o.datum&&<span className={styles.dateBadge}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}</span>}</div>
<div className={styles.cardTitle}>{o.titel}</div>
<div className={styles.cardKommune}>🏡 {o.kommune_name}</div>
<div className={styles.cardOrt}>📍 {o.ort}</div>
<p className={styles.cardDesc}>{o.beschreibung}</p>
</div>
))}
</div>
</div>
</div>
)
}

function AngebotePerson(){
const[offers,setOffers]=useState([])
const[kommuneMap,setKommuneMap]=useState({})
const[search,setSearch]=useState('')
const[loading,setLoading]=useState(true)
const[filter,setFilter]=useState('alle')
const[radius,setRadius]=useState(500)
const[userLoc,setUserLoc]=useState(null)
const[locSearch,setLocSearch]=useState('')
const[locSuggestions,setLocSuggestions]=useState([])
const[locOpen,setLocOpen]=useState(false)
const debounceRef=useRef(null)

useEffect(()=>{
async function load(){
const{data:offs}=await supabase.from('offers').select('*').order('created_at',{ascending:false})
if(offs){
setOffers(offs)
const ids=[...new Set(offs.map(o=>o.kommune_id))]
const{data:profs}=await supabase.from('profiles').select('id,lat,lon').in('id',ids)
const m={}
if(profs)profs.forEach(p=>{m[p.id]=p})
setKommuneMap(m)
}
setLoading(false)
}
load()
},[]) 

function handleLocInput(e){
const val=e.target.value
setLocSearch(val)
clearTimeout(debounceRef.current)
if(val.length<3){setLocSuggestions([]);setLocOpen(false);return}
debounceRef.current=setTimeout(async()=>{
try{
const res=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=4`,{headers:{'Accept-Language':'de','User-Agent':'communet.net'}})
const data=await res.json()
setLocSuggestions(data);setLocOpen(data.length>0)
}catch{}
},400)
}

function selectLoc(item){
setLocSearch(item.display_name.split(',')[0])
setUserLoc({lat:parseFloat(item.lat),lon:parseFloat(item.lon)})
setLocSuggestions([]);setLocOpen(false)
}

const filtered=offers.filter(o=>{
const matchTyp=filter==='alle'||o.typ===filter
const q=search.toLowerCase()
const matchSearch=!q||(o.titel?.toLowerCase().includes(q)||o.ort?.toLowerCase().includes(q)||o.kommune_name?.toLowerCase().includes(q)||o.beschreibung?.toLowerCase().includes(q))
if(!matchTyp||!matchSearch)return false
if(userLoc){
const prof=kommuneMap[o.kommune_id]
if(prof?.lat&&prof?.lon){
const d=haversine(userLoc.lat,userLoc.lon,prof.lat,prof.lon)
if(d>radius)return false
}
}
return true
})

return(
<div className={styles.personWrap}>
<div className={styles.header}>
<h1 className={styles.title}>Angebote</h1>
<p className={styles.sub}>Was Kommunen anbieten — Workaway, Besuche, Workshops und mehr</p>
</div>
<div className={styles.toolbar}>
<div className={styles.searchWrap}><span>🔍</span><input type="text" placeholder="Stichwort, Kommune..." value={search} onChange={e=>setSearch(e.target.value)} className={styles.search}/></div>
<div className={styles.pills}>
<button className={`${styles.pill} ${filter==='alle'?styles.active:''}`}onClick={()=>setFilter('alle')}>Alle</button>
{OFFER_TYPES.map(t=>(<button key={t}className={`${styles.pill} ${filter===t?styles.active:''}`}onClick={()=>setFilter(t)}>{t}</button>))}
</div>
{/* Umkreisfilter */}
<div className={styles.radiusWrap}>
<div style={{position:'relative',flex:1}}>
<input type="text" placeholder="Mein Standort..." value={locSearch} onChange={handleLocInput} className={styles.search} onFocus={()=>locSuggestions.length>0&&setLocOpen(true)}/>
{locOpen&&locSuggestions.length>0&&(
<div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',zIndex:100,marginTop:4}}>
{locSuggestions.map((s,i)=>(
<div key={i}onMouseDown={()=>selectLoc(s)}style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',fontSize:13}}>
<div style={{fontWeight:500}}>{s.display_name.split(',')[0]}</div>
<div style={{fontSize:11,color:'var(--muted)'}}>{s.display_name.split(',').slice(1,3).join(',').trim()}</div>
</div>
))}
</div>
)}
</div>
<div className={styles.radiusSlider}>
<label style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap'}}>📍 {radius===500?'Alle':radius+' km'}</label>
<input type="range" min="10" max="500" step="10" value={radius} onChange={e=>setRadius(Number(e.target.value))} style={{width:160,accentColor:'var(--g)'}}/>
{userLoc&&<button onClick={()=>{setUserLoc(null);setLocSearch('');setRadius(500)}}style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',cursor:'pointer'}}>zurücksetzen</button>}
</div>
</div>
</div>
{loading&&<div className={styles.loading}>Lädt...</div>}
{!loading&&filtered.length===0&&<div className={styles.empty}><div style={{fontSize:40,marginBottom:12}}>🌱</div><p>Keine Angebote gefunden.</p></div>}
<div className={styles.grid}>{filtered.map(o=><OfferCard key={o.id}o={o}href={`/angebote/${o.id}`}/>)}</div>
<BackToTop/>
</div>
)
}

function AngeboteKommune({user}){
const[offers,setOffers]=useState([])
const[profile,setProfile]=useState(null)
const[showForm,setShowForm]=useState(false)
const[saving,setSaving]=useState(false)
const[error,setError]=useState('')
const[newOffer,setNewOffer]=useState({titel:'',beschreibung:'',typ:'Workaway',ort:'',von:'',bis:'',datum:'',uhrzeit:''})

useEffect(()=>{
supabase.from('profiles').select('name,land').eq('id',user.id).single().then(({data})=>setProfile(data))
supabase.from('offers').select('*').eq('kommune_id',user.id).order('created_at',{ascending:false}).then(({data})=>{if(data)setOffers(data)})
},[user])

async function handleAdd(e){
e.preventDefault()
if(!newOffer.titel){setError('Titel ist Pflicht.');return}
setSaving(true);setError('')
const{data,error:err}=await supabase.from('offers').insert({kommune_id:user.id,kommune_name:profile?.name||'',titel:newOffer.titel,beschreibung:newOffer.beschreibung||null,typ:newOffer.typ,ort:newOffer.ort||profile?.land||null,von:parseDate(newOffer.von),bis:parseDate(newOffer.bis),datum:parseDate(newOffer.datum),uhrzeit:newOffer.uhrzeit||null}).select().single()
setSaving(false)
if(err){setError('Fehler: '+err.message);return}
setOffers(o=>[data,...o])
setNewOffer({titel:'',beschreibung:'',typ:'Workaway',ort:'',von:'',bis:'',datum:'',uhrzeit:''})
setShowForm(false)
}

async function handleDelete(id){await supabase.from('offers').delete().eq('id',id);setOffers(o=>o.filter(x=>x.id!==id))}

return(
<div className={styles.personWrap}>
<div className={styles.header}>
<div><h1 className={styles.title}>Eure Angebote</h1><p className={styles.sub}>Sichtbar für alle eingeloggten Nutzer</p></div>
<button className={styles.btnPrimary}onClick={()=>setShowForm(f=>!f)}>{showForm?'Abbrechen':'+ Neues Angebot'}</button>
</div>
{showForm&&(
<form onSubmit={handleAdd}className={styles.form}>
<div className={styles.formRow}><div className={styles.field}><label>Titel *</label><input type="text"value={newOffer.titel}onChange={e=>setNewOffer(n=>({...n,titel:e.target.value}))}placeholder="z.B. Workaway-Platz im Sommer"/></div><div className={styles.field}><label>Typ</label><select value={newOffer.typ}onChange={e=>setNewOffer(n=>({...n,typ:e.target.value}))}>{OFFER_TYPES.map(t=><option key={t}value={t}>{t}</option>)}</select></div></div>
<div className={styles.field}><label>Beschreibung</label><textarea rows={3}value={newOffer.beschreibung}onChange={e=>setNewOffer(n=>({...n,beschreibung:e.target.value}))}placeholder="Was erwartet die Person?"/></div>
<div className={styles.formRow}><div className={styles.field}><label>Von (TT.MM.JJJJ)</label><input type="text"value={newOffer.von}onChange={e=>setNewOffer(n=>({...n,von:e.target.value}))}placeholder="optional"/></div><div className={styles.field}><label>Bis (TT.MM.JJJJ)</label><input type="text"value={newOffer.bis}onChange={e=>setNewOffer(n=>({...n,bis:e.target.value}))}placeholder="optional"/></div></div>
<div className={styles.formRow}><div className={styles.field}><label>Datum Veranstaltung</label><input type="text"value={newOffer.datum}onChange={e=>setNewOffer(n=>({...n,datum:e.target.value}))}placeholder="TT.MM.JJJJ"/></div><div className={styles.field}><label>Uhrzeit</label><input type="text"value={newOffer.uhrzeit}onChange={e=>setNewOffer(n=>({...n,uhrzeit:e.target.value}))}placeholder="z.B. 14:00"/></div></div>
<div className={styles.field}><label>Ort</label><input type="text"value={newOffer.ort}onChange={e=>setNewOffer(n=>({...n,ort:e.target.value}))}placeholder={profile?.land||'Wird aus Profil übernommen'}/></div>
{error&&<p className={styles.error}>{error}</p>}
<button type="submit"className={styles.btnPrimary}disabled={saving}>{saving?'Speichert...':'Veröffentlichen'}</button>
</form>
)}
{offers.length===0&&!showForm&&(
<div className={styles.empty}><div style={{fontSize:40,marginBottom:12}}>🌱</div><p>Noch keine Angebote.</p><button className={styles.btnPrimary}onClick={()=>setShowForm(true)}>Erstes Angebot erstellen</button></div>
)}
<div className={styles.grid}>
{offers.map(o=>(
<div key={o.id}style={{position:'relative'}}>
<OfferCard o={o}href={`/angebote/${o.id}`}/>
<button className={styles.deleteBtn}style={{position:'absolute',top:12,right:12,zIndex:1}}onClick={()=>handleDelete(o.id)}>×</button>
</div>
))}
</div>
<BackToTop/>
</div>
)
}

export default function Angebote(){
const{user,loading}=useAuth()
const[profile,setProfile]=useState(null)
useEffect(()=>{
if(!user)return
supabase.from('profiles').select('typ').eq('id',user.id).single().then(({data})=>setProfile(data))
},[user])
if(loading)return<div><Nav/></div>
const isKommune=profile?.typ==='kommune'
return(
<div><Nav/>
{!user&&<AngeboteGuest/>}
{user&&isKommune&&<AngeboteKommune user={user}/>}
{user&&!isKommune&&profile&&<AngebotePerson/>}
</div>
)
}
