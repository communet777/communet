import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/Angebote.module.css'

const OFFER_TYPES = ['Workaway', 'Besuch', 'Langzeitaufenthalt', 'Workshop', 'Volontariat', 'Veranstaltung', 'Sonstiges']

function parseDate(val) {
  if (!val) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const m = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return null
}

function OfferCard({ o, href }) {
  return (
    <Link href={href} style={{textDecoration:'none'}}>
      <div className={styles.card} style={{cursor:'pointer',transition:'box-shadow 0.15s'}}>
        <div className={styles.cardTop}>
          <span className={styles.typBadge}>{o.typ}</span>
          {o.datum && <span className={styles.dateBadge}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
          {!o.datum && o.von && <span className={styles.dateBadge}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
        </div>
        <div className={styles.cardTitle}>{o.titel}</div>
        {o.kommune_name && <div className={styles.cardKommune}>🏡 {o.kommune_name}</div>}
        {o.ort && <div className={styles.cardOrt}>📍 {o.ort}</div>}
        {o.beschreibung && <p className={styles.cardDesc}>{o.beschreibung.slice(0,100)}{o.beschreibung.length>100?'…':''}</p>}
      </div>
    </Link>
  )
}

function AngeboteGuest() {
  return (
    <div className={styles.guestWrap}>
      <div className={styles.guestIcon}>✨</div>
      <h1 className={styles.guestTitle}>Angebote von Kommunen</h1>
      <p className={styles.guestDesc}>Kommunen bieten Workaway-Plätze, Besuche, Workshops und mehr an.<br/>Melde dich an um alle Angebote zu sehen.</p>
      <Link href="/auth/login" className={styles.btnPrimary}>Jetzt anmelden</Link>
      <Link href="/auth/login" className={styles.btnSecondary}>Noch kein Account? Registrieren</Link>
    </div>
  )
}

function AngebotePerson() {
  const [offers, setOffers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')

  useEffect(() => {
    supabase.from('offers').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setOffers(data); setLoading(false) })
  }, [])

  const filtered = offers.filter(o => {
    const matchTyp = filter === 'alle' || o.typ === filter
    const q = search.toLowerCase()
    if (!q) return matchTyp
    return matchTyp && (o.titel?.toLowerCase().includes(q) || o.ort?.toLowerCase().includes(q) || o.kommune_name?.toLowerCase().includes(q) || o.beschreibung?.toLowerCase().includes(q))
  })

  return (
    <div className={styles.personWrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Angebote</h1>
        <p className={styles.sub}>Was Kommunen anbieten — Workaway, Besuche, Workshops und mehr</p>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span>🔍</span>
          <input type="text" placeholder="Ort, Kommune oder Stichwort..." value={search} onChange={e=>setSearch(e.target.value)} className={styles.search}/>
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${filter==='alle'?styles.active:''}`} onClick={()=>setFilter('alle')}>Alle</button>
          {OFFER_TYPES.map(t=>(<button key={t} className={`${styles.pill} ${filter===t?styles.active:''}`} onClick={()=>setFilter(t)}>{t}</button>))}
        </div>
      </div>
      {loading && <div className={styles.loading}>Lädt...</div>}
      {!loading && filtered.length===0 && <div className={styles.empty}><div style={{fontSize:40,marginBottom:12}}>🌱</div><p>Keine Angebote gefunden.</p></div>}
      <div className={styles.grid}>
        {filtered.map(o => <OfferCard key={o.id} o={o} href={`/angebote/${o.id}`}/>)}
      </div>
    </div>
  )
}

function AngeboteKommune({ user }) {
  const [offers, setOffers] = useState([])
  const [profile, setProfile] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newOffer, setNewOffer] = useState({ titel:'', beschreibung:'', typ:'Workaway', ort:'', von:'', bis:'', datum:'', uhrzeit:'' })

  useEffect(() => {
    supabase.from('profiles').select('name,land').eq('id', user.id).single().then(({ data }) => setProfile(data))
    supabase.from('offers').select('*').eq('kommune_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setOffers(data) })
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newOffer.titel) { setError('Titel ist Pflicht.'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('offers').insert({
      kommune_id: user.id, kommune_name: profile?.name||'',
      titel: newOffer.titel, beschreibung: newOffer.beschreibung||null,
      typ: newOffer.typ, ort: newOffer.ort||profile?.land||null,
      von: parseDate(newOffer.von), bis: parseDate(newOffer.bis),
      datum: parseDate(newOffer.datum), uhrzeit: newOffer.uhrzeit||null,
    }).select().single()
    setSaving(false)
    if (err) { setError('Fehler: '+err.message); return }
    setOffers(o=>[data,...o])
    setNewOffer({ titel:'', beschreibung:'', typ:'Workaway', ort:'', von:'', bis:'', datum:'', uhrzeit:'' })
    setShowForm(false)
  }

  async function handleDelete(id) {
    await supabase.from('offers').delete().eq('id', id)
    setOffers(o=>o.filter(x=>x.id!==id))
  }

  return (
    <div className={styles.personWrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Eure Angebote</h1>
          <p className={styles.sub}>Sichtbar für alle eingeloggten Nutzer</p>
        </div>
        <button className={styles.btnPrimary} onClick={()=>setShowForm(f=>!f)}>{showForm?'Abbrechen':'+ Neues Angebot'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}><label>Titel *</label><input type="text" value={newOffer.titel} onChange={e=>setNewOffer(n=>({...n,titel:e.target.value}))} placeholder="z.B. Workaway-Platz im Sommer"/></div>
            <div className={styles.field}><label>Typ</label><select value={newOffer.typ} onChange={e=>setNewOffer(n=>({...n,typ:e.target.value}))}>{OFFER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div className={styles.field}><label>Beschreibung</label><textarea rows={3} value={newOffer.beschreibung} onChange={e=>setNewOffer(n=>({...n,beschreibung:e.target.value}))} placeholder="Was erwartet die Person?"/></div>
          <div className={styles.formRow}>
            <div className={styles.field}><label>Von (TT.MM.JJJJ)</label><input type="text" value={newOffer.von} onChange={e=>setNewOffer(n=>({...n,von:e.target.value}))} placeholder="optional"/></div>
            <div className={styles.field}><label>Bis (TT.MM.JJJJ)</label><input type="text" value={newOffer.bis} onChange={e=>setNewOffer(n=>({...n,bis:e.target.value}))} placeholder="optional"/></div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}><label>Datum Veranstaltung</label><input type="text" value={newOffer.datum} onChange={e=>setNewOffer(n=>({...n,datum:e.target.value}))} placeholder="TT.MM.JJJJ"/></div>
            <div className={styles.field}><label>Uhrzeit</label><input type="text" value={newOffer.uhrzeit} onChange={e=>setNewOffer(n=>({...n,uhrzeit:e.target.value}))} placeholder="z.B. 14:00"/></div>
          </div>
          <div className={styles.field}><label>Ort</label><input type="text" value={newOffer.ort} onChange={e=>setNewOffer(n=>({...n,ort:e.target.value}))} placeholder={profile?.land||'Wird aus Profil übernommen'}/></div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving?'Speichert...':'Veröffentlichen'}</button>
        </form>
      )}

      {offers.length===0&&!showForm&&(
        <div className={styles.empty}><div style={{fontSize:40,marginBottom:12}}>🌱</div><p>Noch keine Angebote.</p><button className={styles.btnPrimary} onClick={()=>setShowForm(true)}>Erstes Angebot erstellen</button></div>
      )}

      <div className={styles.grid}>
        {offers.map(o => (
          <div key={o.id} style={{position:'relative'}}>
            <OfferCard o={o} href={`/angebote/${o.id}`}/>
            <button className={styles.deleteBtn} style={{position:'absolute',top:12,right:12,zIndex:1}} onClick={()=>handleDelete(o.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Angebote() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('typ').eq('id', user.id).single().then(({ data }) => setProfile(data))
  }, [user])

  if (loading) return <div><Nav/></div>
  const isKommune = profile?.typ === 'kommune'

  return (
    <div>
      <Nav/>
      {!user && <AngeboteGuest/>}
      {user && isKommune && <AngeboteKommune user={user}/>}
      {user && !isKommune && profile && <AngebotePerson/>}
    </div>
  )
}
