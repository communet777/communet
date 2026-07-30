import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/Angebote.module.css'

const OFFER_TYPES = ['Workaway', 'Besuch', 'Langzeitaufenthalt', 'Workshop', 'Volontariat', 'Sonstiges']

function AngeboteGuest() {
  return (
    <div className={styles.guestWrap}>
      <div className={styles.guestIcon}>✨</div>
      <h1 className={styles.guestTitle}>Angebote von Kommunen</h1>
      <p className={styles.guestDesc}>
        Kommunen bieten Workaway-Plätze, Besuche, Workshops und mehr an.<br/>
        Melde dich an um alle Angebote in deiner Nähe zu sehen.
      </p>
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
    return matchTyp && (
      o.titel?.toLowerCase().includes(q) ||
      o.ort?.toLowerCase().includes(q) ||
      o.kommune_name?.toLowerCase().includes(q) ||
      o.beschreibung?.toLowerCase().includes(q)
    )
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
          <input type="text" placeholder="Ort, Kommune oder Stichwort..." value={search} onChange={e => setSearch(e.target.value)} className={styles.search}/>
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${filter==='alle'?styles.active:''}`} onClick={()=>setFilter('alle')}>Alle</button>
          {OFFER_TYPES.map(t => (<button key={t} className={`${styles.pill} ${filter===t?styles.active:''}`} onClick={()=>setFilter(t)}>{t}</button>))}
        </div>
      </div>
      {loading && <div className={styles.loading}>Lädt...</div>}
      {!loading && filtered.length === 0 && (
        <div className={styles.empty}>
          <div style={{fontSize:40,marginBottom:12}}>🌱</div>
          <p>Noch keine Angebote{search ? ` für "${search}"` : ''} gefunden.</p>
        </div>
      )}
      <div className={styles.grid}>
        {filtered.map(o => (
          <div key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.typBadge}>{o.typ}</span>
              {o.von && <span className={styles.dateBadge}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
            </div>
            <div className={styles.cardTitle}>{o.titel}</div>
            <div className={styles.cardKommune}>🏡 {o.kommune_name || 'Kommune'}</div>
            {o.ort && <div className={styles.cardOrt}>📍 {o.ort}</div>}
            {o.beschreibung && <p className={styles.cardDesc}>{o.beschreibung.slice(0, 120)}{o.beschreibung.length > 120 ? '…' : ''}</p>}
          </div>
        ))}
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
  const [newOffer, setNewOffer] = useState({ titel: '', beschreibung: '', typ: 'Workaway', ort: '', von: '', bis: '' })

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
      kommune_id: user.id,
      kommune_name: profile?.name || '',
      titel: newOffer.titel,
      beschreibung: newOffer.beschreibung || null,
      typ: newOffer.typ,
      ort: newOffer.ort || profile?.land || null,
      von: newOffer.von || null,
      bis: newOffer.bis || null,
    }).select().single()
    setSaving(false)
    if (err) { setError('Fehler: ' + err.message); return }
    setOffers(o => [data, ...o])
    setNewOffer({ titel: '', beschreibung: '', typ: 'Workaway', ort: '', von: '', bis: '' })
    setShowForm(false)
  }

  async function handleDelete(id) {
    await supabase.from('offers').delete().eq('id', id)
    setOffers(o => o.filter(x => x.id !== id))
  }

  return (
    <div className={styles.personWrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Eure Angebote</h1>
          <p className={styles.sub}>Was ihr anderen anbietet — sichtbar für alle eingeloggten Nutzer</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Abbrechen' : '+ Neues Angebot'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Titel *</label>
              <input type="text" value={newOffer.titel} onChange={e=>setNewOffer(n=>({...n,titel:e.target.value}))} placeholder="z.B. Workaway-Platz im Sommer"/>
            </div>
            <div className={styles.field}>
              <label>Typ</label>
              <select value={newOffer.typ} onChange={e=>setNewOffer(n=>({...n,typ:e.target.value}))}>
                {OFFER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Beschreibung</label>
            <textarea rows={3} value={newOffer.beschreibung} onChange={e=>setNewOffer(n=>({...n,beschreibung:e.target.value}))} placeholder="Was erwartet die Person? Was bietet ihr an?"/>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}><label>Von (optional)</label><input type="date" value={newOffer.von} onChange={e=>setNewOffer(n=>({...n,von:e.target.value}))}/></div>
            <div className={styles.field}><label>Bis (optional)</label><input type="date" value={newOffer.bis} onChange={e=>setNewOffer(n=>({...n,bis:e.target.value}))}/></div>
          </div>
          <div className={styles.field}>
            <label>Ort (optional)</label>
            <input type="text" value={newOffer.ort} onChange={e=>setNewOffer(n=>({...n,ort:e.target.value}))} placeholder={profile?.land || 'Wird aus eurem Profil übernommen'}/>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? 'Speichert...' : 'Angebot veröffentlichen'}</button>
        </form>
      )}

      {offers.length === 0 && !showForm && (
        <div className={styles.empty}>
          <div style={{fontSize:40,marginBottom:12}}>🌱</div>
          <p>Noch keine Angebote erstellt.</p>
          <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>Erstes Angebot erstellen</button>
        </div>
      )}

      <div className={styles.grid}>
        {offers.map(o => (
          <div key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.typBadge}>{o.typ}</span>
              {o.von && <span className={styles.dateBadge}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
              <button className={styles.deleteBtn} onClick={() => handleDelete(o.id)}>×</button>
            </div>
            <div className={styles.cardTitle}>{o.titel}</div>
            {o.ort && <div className={styles.cardOrt}>📍 {o.ort}</div>}
            {o.beschreibung && <p className={styles.cardDesc}>{o.beschreibung}</p>}
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
    supabase.from('profiles').select('typ').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
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
