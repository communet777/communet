import OfferExtraFields,{EMPTY_EXTRA,extraFromOffer,extraToFields} from '../../components/OfferExtraFields'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import Icon from '../../components/Icon'
import TypIcon from '../../components/TypIcon'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'

const TYPEN = ['Ökodorf', 'Kommune', 'Kollektiv', 'Spirituelle Gemeinschaft', 'Wohnprojekt']
const OFFER_TYPES = ['Workaway', 'Besuch', 'Langzeitaufenthalt', 'Workshop', 'Volontariat', 'Veranstaltung', 'Sonstiges']
const SICHTBARKEIT = [
  { value: 'keiner', label: 'Nur gelistet — kein Ort', desc: 'Im Katalog sichtbar, kein Marker auf der Karte' },
  { value: 'region', label: 'Region / Bundesland', desc: 'z.B. NRW — grober Bereich auf der Karte' },
  { value: 'stadt', label: 'Stadtmitte', desc: 'Marker auf Stadtebene' },
  { value: 'genau', label: 'Genaue Adresse', desc: 'Exakter Marker auf der Karte' },
]

function parseDate(val) {
  if (!val) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const m = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return null
}

function OrtAutocomplete({ value, onChange, onSelect, placeholder, hint }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)
  useEffect(() => { setQuery(value || '') }, [value])
  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  function handleChange(e) {
    const val = e.target.value; setQuery(val); onChange(val)
    clearTimeout(debounceRef.current)
    if (val.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`, { headers: { 'Accept-Language': 'de', 'User-Agent': 'communet.net' } })
        const data = await res.json(); setSuggestions(data); setOpen(data.length > 0)
      } catch {}
    }, 400)
  }
  function handleSelect(item) {
    const label = item.display_name; setQuery(label); onChange(label)
    onSelect({ label, lat: parseFloat(item.lat), lon: parseFloat(item.lon) })
    setSuggestions([]); setOpen(false)
  }
  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      <input type="text" value={query} onChange={handleChange} onFocus={() => suggestions.length > 0 && setOpen(true)} placeholder={placeholder} autoComplete="off"/>
      {open && suggestions.length > 0 && (
        <div className={styles.autocompleteDropdown}>
          {suggestions.map((s, i) => (
            <div key={i} className={styles.autocompleteItem} onMouseDown={() => handleSelect(s)}>
              <div className={styles.autocompleteMain}>{s.display_name.split(',')[0]}</div>
              <div className={styles.autocompleteSub}>{s.display_name.split(',').slice(1,3).join(',').trim()}</div>
            </div>
          ))}
        </div>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}

export default function KommuneBearbeiten() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { reload: reloadProfiles, setActiveId, profiles: myProfiles, earlyAccess } = useActiveProfile()
  const pid = typeof router.query.id === 'string' ? router.query.id : null
  const isNew = !pid
  const [hidden, setHidden] = useState(false)
  const [members, setMembers] = useState([])
  const [memberQuery, setMemberQuery] = useState('')
  const [memberHits, setMemberHits] = useState([])
  const fileRef = useRef()
  const [profile, setProfile] = useState({ name:'', bio:'', land:'', adresse:'', website:'', instagram:'', avatar_url:'', kommune_typ:'Ökodorf', gruendungsjahr:'', mitglieder:'', sichtbarkeit:'stadt' })
  const [coords, setCoords] = useState({ lat:null, lon:null })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [profileStatus, setProfileStatus] = useState('pending')
  const [tab, setTab] = useState('profil')
  const [memberMsg, setMemberMsg] = useState('')
  const [memberLoaded, setMemberLoaded] = useState(false)
  const [offers, setOffers] = useState([])
  const [newOffer, setNewOffer] = useState({ titel:'', beschreibung:'', typ:'Workaway', ort:'', von:'', bis:'', datum:'', uhrzeit:'', ...EMPTY_EXTRA })
  const [editOfferId, setEditOfferId] = useState(null)
  const [savingOffer, setSavingOffer] = useState(false)
  const [offerError, setOfferError] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])
  useEffect(() => { if (router.isReady && router.query.tab === 'mitglieder') setTab('mitglieder') }, [router.isReady, router.query.tab])
  async function searchMembers(q) {
    const { data, error } = await supabase.rpc('search_people', { p_q: q })
    if (error) { setMemberMsg(error.message); return }
    setMemberMsg('')
    setMemberHits(data || [])
    setMemberLoaded(true)
  }
  async function addMember(h) {
    const { error } = await supabase.from('kommune_members').insert({ kommune_id: pid, user_id: h.id })
    if (error) { setMemberMsg('Hinzufügen fehlgeschlagen: ' + error.message); return }
    setMemberMsg('')
    setMembers(m => [...m, { user_id: h.id, name: h.name, avatar_url: h.avatar_url }])
  }
  useEffect(() => { if (tab === 'mitglieder' && !isNew && pid) searchMembers(memberQuery) }, [tab, pid])

  useEffect(() => {
    if (!user || !router.isReady) return
    if (!pid) {
      // Bisheriges Verhalten: Wer sich als Kommune registriert hat, bearbeitet sein Profil weiter (id = Login-ID)
      if (router.query.neu) return
      router.replace(`/profil/kommune?id=${user.id}`)
      return
    }
    supabase.from('profiles').select('*').eq('id', pid).eq('typ', 'kommune').single().then(({ data }) => {
      if (data) {
        setHidden(!!data.hidden)
        setProfile({ name:data.name||'', bio:data.bio||'', land:data.land||'', adresse:data.adresse||'', website:data.website||'', instagram:data.instagram||'', avatar_url:data.avatar_url||'', kommune_typ:data.kommune_typ||'Ökodorf', gruendungsjahr:data.gruendungsjahr||'', mitglieder:data.mitglieder||'', sichtbarkeit:data.sichtbarkeit||'stadt' })
        setCoords({ lat:data.lat||null, lon:data.lon||null })
        setProfileStatus(data.status||'pending')
      }
    })
    supabase.from('offers').select('*').eq('kommune_id', pid).order('created_at', { ascending:false })
      .then(({ data }) => { if (data) setOffers(data) })
    supabase.rpc('kommune_members_list', { p_kommune: pid }).then(({ data }) => { if (data) setMembers(data) })
  }, [user, router.isReady, pid])

  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const { error: upErr } = await supabase.storage.from('avatars').upload(`${user.id}/${pid || 'neu'}-avatar.${ext}`, file, { upsert:true })
    if (upErr) { setError('Upload fehlgeschlagen'); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/${pid || 'neu'}-avatar.${ext}`)
    setProfile(p => ({ ...p, avatar_url:data.publicUrl })); setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const payload = { ...profile, hidden, lat:coords.lat, lon:coords.lon, gruendungsjahr:profile.gruendungsjahr?parseInt(profile.gruendungsjahr):null, mitglieder:profile.mitglieder?parseInt(profile.mitglieder):null }
    let saveErr
    if (isNew) {
      if (!profile.name.trim()) { setSaving(false); setError('Bitte gib einen Namen ein.'); return }
      const { data: created, error: e1 } = await supabase.from('profiles').insert({ typ:'kommune', email:user.email, ...payload }).select('id').single()
      saveErr = e1
      if (e1 && e1.code === '23505') { setSaving(false); setError('Du hast bereits eine Kommune. Pro Login ist eine Kommune möglich.'); return }
      if (!e1 && created) { await reloadProfiles(); setActiveId(created.id); setSaving(false); router.replace(`/profil/kommune?id=${created.id}`); return }
    } else {
      const { error: e2 } = await supabase.from('profiles').update(payload).eq('id', pid)
      saveErr = e2
    }
    setSaving(false)
    if (saveErr) { setError('Speichern fehlgeschlagen: '+saveErr.message); return }
    reloadProfiles()
    supabase.from('profiles').select('status').eq('id', pid).single().then(({ data }) => { if (data) setProfileStatus(data.status) })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function handleAddOffer(e) {
    e.preventDefault(); setSavingOffer(true); setOfferError('')
    if (!newOffer.titel) { setOfferError('Titel ist Pflicht.'); setSavingOffer(false); return }
    const fields = { titel: newOffer.titel,
      beschreibung: newOffer.beschreibung || null,
      typ: newOffer.typ,
      ort: newOffer.ort || profile.land || null,
      von: parseDate(newOffer.von),
      bis: parseDate(newOffer.bis),
      datum: parseDate(newOffer.datum),
      uhrzeit: newOffer.uhrzeit || null, ...extraToFields(newOffer) }
    const { data, error: err } = editOfferId
      ? await supabase.from('offers').update(fields).eq('id', editOfferId).select().single()
      : await supabase.from('offers').insert({ kommune_id: pid, kommune_name: profile.name || '', ...fields }).select().single()
    setSavingOffer(false)
    if (err) { setOfferError('Fehler: '+err.message); return }
    setOffers(o => editOfferId ? o.map(x => x.id === editOfferId ? data : x) : [data, ...o])
    setEditOfferId(null)
    setNewOffer({ titel:'', beschreibung:'', typ:'Workaway', ort:'', von:'', bis:'', datum:'', uhrzeit:'', ...EMPTY_EXTRA })
  }

  function isoToDe(v) { return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('.') : (v || '') }
  function startEditOffer(o) {
    setNewOffer({ titel:o.titel||'', beschreibung:o.beschreibung||'', typ:o.typ||'Workaway', ort:o.ort||'', von:isoToDe(o.von), bis:isoToDe(o.bis), datum:isoToDe(o.datum), uhrzeit:(o.uhrzeit||'').slice(0,5), ...extraFromOffer(o) })
    setEditOfferId(o.id); setOfferError(''); window.scrollTo({ top:0, behavior:'smooth' })
  }
  function cancelEditOffer() { setEditOfferId(null); setOfferError(''); setNewOffer({ titel:'', beschreibung:'', typ:'Workaway', ort:'', von:'', bis:'', datum:'', uhrzeit:'', ...EMPTY_EXTRA }) }

  async function handleDeleteOffer(id) {
    await supabase.from('offers').delete().eq('id', id)
    setOffers(o => o.filter(x => x.id !== id))
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>{isNew ? 'Neue Kommune anlegen' : 'Kommune bearbeiten'}</h1>
          {!isNew && profileStatus==='pending' && <div className={styles.pendingBanner}>⏳ Wartet auf Freischaltung durch Communet.</div>}
          {!isNew && profileStatus==='approved' && <div className={styles.approvedBanner}>✅ Deine Kommune ist freigeschaltet.</div>}
        </div>

        <div style={{display:'flex',gap:4,marginBottom:24,background:'var(--card)',borderRadius:12,padding:4}}>
          <button onClick={()=>setTab('profil')} style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',background:tab==='profil'?'var(--bg)':'none',color:tab==='profil'?'var(--text)':'var(--muted)',boxShadow:tab==='profil'?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>Profil</button>
          {!isNew&&<button onClick={()=>setTab('angebote')} style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',background:tab==='angebote'?'var(--bg)':'none',color:tab==='angebote'?'var(--text)':'var(--muted)',boxShadow:tab==='angebote'?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>Angebote {offers.length>0&&`(${offers.length})`}</button>}
          {!isNew&&hidden&&<button onClick={()=>setTab('mitglieder')} style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',background:tab==='mitglieder'?'var(--bg)':'none',color:tab==='mitglieder'?'var(--text)':'var(--muted)',boxShadow:tab==='mitglieder'?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>Mitglieder ({members.length})</button>}
        </div>

        {tab==='profil' && (
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap} onClick={()=>fileRef.current.click()}>
                {profile.avatar_url?<img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg}/>:<div className={styles.avatarPlaceholder}><TypIcon typ={profile.kommune_typ} size={40}/></div>}
                <div className={styles.avatarOverlay}>{uploading?'Lädt...':'📷 ändern'}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>
            </div>
            <div className={styles.field}><label>Name der Kommune</label><input type="text" value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} placeholder="z.B. Ökodorf Sieben Linden"/></div>
            <div className={styles.field}><label>Typ</label><select value={profile.kommune_typ} onChange={e=>setProfile(p=>({...p,kommune_typ:e.target.value}))}>{TYPEN.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div className={styles.row}>
              <div className={styles.field}><label>Gegründet</label><input type="number" value={profile.gruendungsjahr} onChange={e=>setProfile(p=>({...p,gruendungsjahr:e.target.value}))} placeholder="z.B. 1995" min="1800" max="2030"/></div>
              <div className={styles.field}><label>Mitglieder</label><input type="number" value={profile.mitglieder} onChange={e=>setProfile(p=>({...p,mitglieder:e.target.value}))} placeholder="z.B. 30"/></div>
            </div>
            <div className={styles.field}><label>Beschreibung</label><textarea rows={4} value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Was macht eure Gemeinschaft aus?"/></div>
            <div className={styles.field}>
              <label>Sichtbarkeit auf der Karte</label>
              <div className={styles.sichtbarkeitGrid}>
                {SICHTBARKEIT.map(s=>(<div key={s.value} className={`${styles.sichtbarkeitOption} ${profile.sichtbarkeit===s.value?styles.sichtbarkeitActive:''}`} onClick={()=>{setProfile(p=>({...p,sichtbarkeit:s.value}));setCoords({lat:null,lon:null})}}><div className={styles.sichtbarkeitLabel}>{s.label}</div><div className={styles.sichtbarkeitDesc}>{s.desc}</div></div>))}
              </div>
            </div>
            {(profile.sichtbarkeit==='stadt'||profile.sichtbarkeit==='region')&&(<div className={styles.field}><label>Ort / Region</label><OrtAutocomplete value={profile.land} onChange={val=>setProfile(p=>({...p,land:val}))} onSelect={({label,lat,lon})=>{setProfile(p=>({...p,land:label}));setCoords({lat,lon})}} placeholder={profile.sichtbarkeit==='region'?'z.B. Nordrhein-Westfalen':'z.B. Köln'} hint={coords.lat?`✅ Verortet`:'Tipp: Ort aus Dropdown wählen'}/></div>)}
            {profile.sichtbarkeit==='genau'&&(<div className={styles.field}><label>Genaue Adresse</label><OrtAutocomplete value={profile.adresse} onChange={val=>setProfile(p=>({...p,adresse:val}))} onSelect={({label,lat,lon})=>{setProfile(p=>({...p,adresse:label}));setCoords({lat,lon})}} placeholder="Straße, Hausnummer, Ort" hint={coords.lat?`✅ Verortet`:'Intern für die Karte'}/></div>)}
            {earlyAccess&&(<div className={styles.field}><label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer'}}><input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} style={{width:'auto',marginTop:3}}/><span><strong>🔒 Versteckte Kommune</strong><br/><span style={{fontSize:12,color:'var(--muted)'}}>Nicht im Katalog, auf der Karte oder in der Suche sichtbar. Nur du und eingeladene Mitglieder sehen sie. Wird sie später öffentlich gemacht, prüft Communet sie zuerst.</span></span></label></div>)}
            <div className={styles.field}><label>Website</label><input type="url" value={profile.website} onChange={e=>setProfile(p=>({...p,website:e.target.value}))} placeholder="https://eure-website.de"/></div>
            <div className={styles.field}><label>Instagram</label><div className={styles.inputPrefix}><span>@</span><input type="text" value={profile.instagram} onChange={e=>setProfile(p=>({...p,instagram:e.target.value}))} placeholder="euerhandle"/></div></div>
            {error&&<p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={saving||uploading}>{saving?'Wird gespeichert...':saved?'✓ Gespeichert':'Speichern'}</button>
          </form>
        )}

        {tab==='mitglieder' && !isNew && (
          <div>
            <p style={{fontSize:13,color:'var(--muted)',marginTop:0}}>Diese Personen sehen die versteckte Kommune und ihre Angebote. Suche nach dem Namen und füge sie hinzu.</p>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input type="text" value={memberQuery} onChange={e=>{setMemberQuery(e.target.value);searchMembers(e.target.value)}} placeholder="Name suchen" style={{flex:1}}/>
            </div>
            {memberMsg&&<p style={{color:'#b3261e',fontSize:13}}>{memberMsg}</p>}
            {memberLoaded&&memberHits.filter(h=>!members.some(m=>m.user_id===h.id)).length===0&&<p style={{color:'var(--muted)',fontSize:13}}>Keine weiteren Personen gefunden. Deine Freunde müssen sich zuerst mit einem Einladungscode bei Communet registrieren, dann erscheinen sie hier.</p>}
            {memberHits.filter(h=>!members.some(m=>m.user_id===h.id)).map(h=>(<div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--card)',borderRadius:10,padding:'10px 14px',marginBottom:8}}><span>{h.name}</span><button type="button" onClick={()=>addMember(h)} style={{border:'none',background:'var(--g)',color:'white',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}>Hinzufügen</button></div>))}
            <div style={{marginTop:16,fontSize:13,fontWeight:600}}>Aktuelle Mitglieder</div>
            {members.length===0&&<p style={{color:'var(--muted)',fontSize:13}}>Noch niemand eingeladen.</p>}
            {members.map(m=>(<div key={m.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--card)',borderRadius:10,padding:'10px 14px',marginTop:8}}><span>{m.name}</span><button type="button" onClick={async()=>{await supabase.from('kommune_members').delete().eq('kommune_id',pid).eq('user_id',m.user_id);setMembers(x=>x.filter(y=>y.user_id!==m.user_id))}} style={{border:'none',background:'none',color:'var(--muted)',cursor:'pointer',fontSize:16}}>×</button></div>))}
          </div>
        )}

        {tab==='angebote' && !isNew && (
          <div>
            <form onSubmit={handleAddOffer} style={{background:'var(--card)',borderRadius:14,padding:24,marginBottom:24,display:'flex',flexDirection:'column',gap:14,border:'1.5px solid var(--border)'}}>              
              <div className={styles.row}>
                <div className={styles.field}><label>Titel *</label><input type="text" value={newOffer.titel} onChange={e=>setNewOffer(n=>({...n,titel:e.target.value}))} placeholder="z.B. Workaway-Platz"/></div>
                <div className={styles.field}><label>Typ</label><select value={newOffer.typ} onChange={e=>setNewOffer(n=>({...n,typ:e.target.value}))}>{OFFER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div className={styles.field}><label>Beschreibung</label><textarea rows={3} value={newOffer.beschreibung} onChange={e=>setNewOffer(n=>({...n,beschreibung:e.target.value}))} placeholder="Was erwartet die Person?"/></div>
              <div className={styles.row}>
                <div className={styles.field}><label>Von (TT.MM.JJJJ)</label><input type="text" value={newOffer.von} onChange={e=>setNewOffer(n=>({...n,von:e.target.value}))} placeholder="z.B. 01.08.2026"/></div>
                <div className={styles.field}><label>Bis (TT.MM.JJJJ)</label><input type="text" value={newOffer.bis} onChange={e=>setNewOffer(n=>({...n,bis:e.target.value}))} placeholder="optional"/></div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}><label>Datum Veranstaltung (TT.MM.JJJJ)</label><input type="text" value={newOffer.datum} onChange={e=>setNewOffer(n=>({...n,datum:e.target.value}))} placeholder="optional, für Veranstaltungen"/></div>
                <div className={styles.field}><label>Uhrzeit</label><input type="text" value={newOffer.uhrzeit} onChange={e=>setNewOffer(n=>({...n,uhrzeit:e.target.value}))} placeholder="z.B. 14:00"/></div>
              </div>
              <OfferExtraFields value={newOffer} onChange={v=>setNewOffer(n=>({...n,...v}))} styles={styles} rowClass={styles.row}/>
              <div className={styles.field}><label>Ort</label><input type="text" value={newOffer.ort} onChange={e=>setNewOffer(n=>({...n,ort:e.target.value}))} placeholder={profile.land||'Wird aus Profil übernommen'}/></div>
              {offerError&&<p className={styles.error}>{offerError}</p>}
              <button type="submit" className={styles.btn} disabled={savingOffer}>{savingOffer?'Speichert...':editOfferId?'Änderungen speichern':'Angebot veröffentlichen'}</button>
              {editOfferId&&<button type="button" onClick={cancelEditOffer} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14}}>Bearbeiten abbrechen</button>}
            </form>

            {offers.length===0&&<p style={{color:'var(--muted)',fontSize:14,textAlign:'center',padding:24}}>Noch keine Angebote.</p>}
            {offers.map(o=>(
              <div key={o.id} style={{background:'var(--card)',borderRadius:12,padding:16,marginBottom:12,borderLeft:'3px solid var(--g)',position:'relative'}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,background:'#E1ECEE',color:'var(--g)',padding:'2px 8px',borderRadius:20}}>{o.typ}</span>
                  {o.datum&&<span style={{fontSize:11,color:'var(--muted)'}}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
                  {!o.datum&&o.von&&<span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{o.titel}</div>
                {o.ort&&<div style={{fontSize:12,color:'var(--muted)',marginTop:2}}><Icon name="standort"/> {o.ort}</div>}
                {o.beschreibung&&<p style={{fontSize:13,color:'var(--muted)',marginTop:6,lineHeight:1.5,margin:'6px 0 0'}}>{o.beschreibung}</p>}
                <button onClick={()=>handleDeleteOffer(o.id)} style={{position:'absolute',top:12,right:12,background:'none',border:'none',color:'var(--muted)',fontSize:16,cursor:'pointer'}}>×</button>
                <button onClick={()=>startEditOffer(o)} style={{position:'absolute',top:12,right:40,background:'none',border:'none',color:'var(--g)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Bearbeiten</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
