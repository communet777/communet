import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'
import eventStyles from '../../styles/Events.module.css'

const TYPEN = ['Ökodorf', 'Kommune', 'Kollektiv', 'Spirituelle Gemeinschaft', 'Wohnprojekt']
const SICHTBARKEIT = [
  { value: 'keiner', label: 'Nur gelistet — kein Ort', desc: 'Im Katalog sichtbar, kein Marker auf der Karte' },
  { value: 'region', label: 'Region / Bundesland', desc: 'z.B. NRW — grober Bereich auf der Karte' },
  { value: 'stadt', label: 'Stadtmitte', desc: 'Marker auf Stadtebene' },
  { value: 'genau', label: 'Genaue Adresse', desc: 'Exakter Marker auf der Karte' },
]

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
    const val = e.target.value
    setQuery(val); onChange(val)
    clearTimeout(debounceRef.current)
    if (val.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`, { headers: { 'Accept-Language': 'de', 'User-Agent': 'communet.net' } })
        const data = await res.json()
        setSuggestions(data); setOpen(data.length > 0)
      } catch {}
    }, 400)
  }

  function handleSelect(item) {
    const label = item.display_name
    setQuery(label); onChange(label)
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
  const fileRef = useRef()

  const [profile, setProfile] = useState({ name: '', bio: '', land: '', adresse: '', website: '', instagram: '', avatar_url: '', kommune_typ: 'Ökodorf', gruendungsjahr: '', mitglieder: '', sichtbarkeit: 'stadt' })
  const [coords, setCoords] = useState({ lat: null, lon: null })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [profileStatus, setProfileStatus] = useState('pending')
  const [tab, setTab] = useState('profil')

  // Events
  const [events, setEvents] = useState([])
  const [newEvent, setNewEvent] = useState({ titel: '', beschreibung: '', datum: '', uhrzeit: '', ort: '' })
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventError, setEventError] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfile({ name: data.name||'', bio: data.bio||'', land: data.land||'', adresse: data.adresse||'', website: data.website||'', instagram: data.instagram||'', avatar_url: data.avatar_url||'', kommune_typ: data.kommune_typ||'Ökodorf', gruendungsjahr: data.gruendungsjahr||'', mitglieder: data.mitglieder||'', sichtbarkeit: data.sichtbarkeit||'stadt' })
          setCoords({ lat: data.lat||null, lon: data.lon||null })
          setProfileStatus(data.status||'pending')
        }
      })
    supabase.from('events').select('*').eq('kommune_id', user.id).order('datum')
      .then(({ data }) => { if (data) setEvents(data) })
  }, [user])

  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Upload fehlgeschlagen: ' + upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setProfile(p => ({ ...p, avatar_url: data.publicUrl })); setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: saveErr } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, typ: 'kommune', ...profile, lat: coords.lat, lon: coords.lon, gruendungsjahr: profile.gruendungsjahr ? parseInt(profile.gruendungsjahr) : null, mitglieder: profile.mitglieder ? parseInt(profile.mitglieder) : null })
    setSaving(false)
    if (saveErr) { setError('Speichern fehlgeschlagen: ' + saveErr.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function handleAddEvent(e) {
    e.preventDefault(); setSavingEvent(true); setEventError('')
    if (!newEvent.titel || !newEvent.datum) { setEventError('Titel und Datum sind Pflichtfelder.'); setSavingEvent(false); return }
    const { data, error: evErr } = await supabase.from('events').insert({ kommune_id: user.id, ...newEvent }).select().single()
    setSavingEvent(false)
    if (evErr) { setEventError('Fehler: ' + evErr.message); return }
    setEvents(ev => [...ev, data].sort((a,b) => a.datum.localeCompare(b.datum)))
    setNewEvent({ titel: '', beschreibung: '', datum: '', uhrzeit: '', ort: '' })
  }

  async function handleDeleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(ev => ev.filter(e => e.id !== id))
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>Kommune bearbeiten</h1>
          {profileStatus === 'pending' && <div className={styles.pendingBanner}>⏳ Wartet auf Freischaltung durch Communet.</div>}
          {profileStatus === 'approved' && <div className={styles.approvedBanner}>✅ Deine Kommune ist freigeschaltet.</div>}
        </div>

        {/* Tabs */}
        <div className={eventStyles.tabs}>
          <button className={`${eventStyles.tab} ${tab==='profil'?eventStyles.tabActive:''}`} onClick={()=>setTab('profil')}>Profil</button>
          <button className={`${eventStyles.tab} ${tab==='events'?eventStyles.tabActive:''}`} onClick={()=>setTab('events')}>Veranstaltungen {events.length > 0 && `(${events.length})`}</button>
        </div>

        {tab === 'profil' && (
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap} onClick={() => fileRef.current.click()}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg}/> : <div className={styles.avatarPlaceholder}>🏡</div>}
                <div className={styles.avatarOverlay}>{uploading ? 'Lädt...' : '📷 ändern'}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>
            </div>
            <div className={styles.field}><label>Name der Kommune</label><input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="z.B. Ökodorf Sieben Linden"/></div>
            <div className={styles.field}><label>Typ</label><select value={profile.kommune_typ} onChange={e => setProfile(p => ({...p, kommune_typ: e.target.value}))}>{TYPEN.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className={styles.row}>
              <div className={styles.field}><label>Gegründet</label><input type="number" value={profile.gruendungsjahr} onChange={e => setProfile(p => ({...p, gruendungsjahr: e.target.value}))} placeholder="z.B. 1995" min="1800" max="2030"/></div>
              <div className={styles.field}><label>Mitglieder</label><input type="number" value={profile.mitglieder} onChange={e => setProfile(p => ({...p, mitglieder: e.target.value}))} placeholder="z.B. 30"/></div>
            </div>
            <div className={styles.field}><label>Beschreibung</label><textarea rows={4} value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} placeholder="Was macht eure Gemeinschaft aus?"/></div>
            <div className={styles.field}>
              <label>Sichtbarkeit auf der Karte</label>
              <div className={styles.sichtbarkeitGrid}>
                {SICHTBARKEIT.map(s => (<div key={s.value} className={`${styles.sichtbarkeitOption} ${profile.sichtbarkeit===s.value?styles.sichtbarkeitActive:''}`} onClick={()=>{setProfile(p=>({...p,sichtbarkeit:s.value}));setCoords({lat:null,lon:null})}}><div className={styles.sichtbarkeitLabel}>{s.label}</div><div className={styles.sichtbarkeitDesc}>{s.desc}</div></div>))}
              </div>
            </div>
            {(profile.sichtbarkeit==='stadt'||profile.sichtbarkeit==='region') && (
              <div className={styles.field}><label>Ort / Region</label><OrtAutocomplete value={profile.land} onChange={val=>setProfile(p=>({...p,land:val}))} onSelect={({label,lat,lon})=>{setProfile(p=>({...p,land:label}));setCoords({lat,lon})}} placeholder={profile.sichtbarkeit==='region'?'z.B. Nordrhein-Westfalen':'z.B. Köln'} hint={coords.lat?`✅ Verortet (${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)})`:'Tipp: Ort aus Dropdown wählen'}/></div>
            )}
            {profile.sichtbarkeit==='genau' && (
              <div className={styles.field}><label>Genaue Adresse</label><OrtAutocomplete value={profile.adresse} onChange={val=>setProfile(p=>({...p,adresse:val}))} onSelect={({label,lat,lon})=>{setProfile(p=>({...p,adresse:label}));setCoords({lat,lon})}} placeholder="Straße, Hausnummer, Ort" hint={coords.lat?`✅ Verortet`:'Intern für die Karte — nicht öffentlich'}/></div>
            )}
            <div className={styles.field}><label>Website</label><input type="url" value={profile.website} onChange={e=>setProfile(p=>({...p,website:e.target.value}))} placeholder="https://eure-website.de"/></div>
            <div className={styles.field}><label>Instagram</label><div className={styles.inputPrefix}><span>@</span><input type="text" value={profile.instagram} onChange={e=>setProfile(p=>({...p,instagram:e.target.value}))} placeholder="euerhandle"/></div></div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={saving||uploading}>{saving?'Wird gespeichert...':saved?'✓ Gespeichert':'Speichern'}</button>
          </form>
        )}

        {tab === 'events' && (
          <div className={eventStyles.eventSection}>
            <h2 className={eventStyles.sectionTitle}>Neue Veranstaltung</h2>
            <form onSubmit={handleAddEvent} className={eventStyles.eventForm}>
              <div className={styles.field}><label>Titel *</label><input type="text" value={newEvent.titel} onChange={e=>setNewEvent(n=>({...n,titel:e.target.value}))} placeholder="z.B. Hühnerstall bauen"/></div>
              <div className={styles.row}>
                <div className={styles.field}><label>Datum *</label><input type="date" value={newEvent.datum} onChange={e=>setNewEvent(n=>({...n,datum:e.target.value}))}/></div>
                <div className={styles.field}><label>Uhrzeit</label><input type="time" value={newEvent.uhrzeit} onChange={e=>setNewEvent(n=>({...n,uhrzeit:e.target.value}))}/></div>
              </div>
              <div className={styles.field}><label>Ort</label><input type="text" value={newEvent.ort} onChange={e=>setNewEvent(n=>({...n,ort:e.target.value}))} placeholder="z.B. Gemeinschaftsgarten"/></div>
              <div className={styles.field}><label>Beschreibung</label><textarea rows={3} value={newEvent.beschreibung} onChange={e=>setNewEvent(n=>({...n,beschreibung:e.target.value}))} placeholder="Was passiert bei dieser Veranstaltung?"/></div>
              {eventError && <p className={styles.error}>{eventError}</p>}
              <button type="submit" className={styles.btn} disabled={savingEvent}>{savingEvent?'Speichert...':'Veranstaltung hinzufügen'}</button>
            </form>

            <h2 className={eventStyles.sectionTitle} style={{marginTop:32}}>Eure Veranstaltungen ({events.length})</h2>
            {events.length === 0 && <p style={{color:'var(--muted)',fontSize:14}}>Noch keine Veranstaltungen eingetragen.</p>}
            {events.map(ev => (
              <div key={ev.id} className={eventStyles.eventCard}>
                <div className={eventStyles.eventDate}>{new Date(ev.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}{ev.uhrzeit?' · '+ev.uhrzeit.slice(0,5):''}</div>
                <div className={eventStyles.eventTitle}>{ev.titel}</div>
                {ev.ort && <div className={eventStyles.eventMeta}>📍 {ev.ort}</div>}
                {ev.beschreibung && <div className={eventStyles.eventDesc}>{ev.beschreibung}</div>}
                <button className={eventStyles.deleteBtn} onClick={()=>handleDeleteEvent(ev.id)}>× Löschen</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
