import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'

const TYPEN = ['Ökodorf', 'Kommune', 'Kollektiv', 'Spirituelle Gemeinschaft', 'Wohnprojekt']

const SICHTBARKEIT = [
  { value: 'keiner', label: 'Nur gelistet — kein Ort', desc: 'Im Katalog sichtbar, kein Marker auf der Karte' },
  { value: 'region', label: 'Region / Bundesland', desc: 'z.B. NRW — grober Bereich auf der Karte' },
  { value: 'stadt', label: 'Stadtmitte', desc: 'Marker auf Stadtebene' },
  { value: 'genau', label: 'Genaue Adresse', desc: 'Exakter Marker auf der Karte' },
]

async function geocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'de', 'User-Agent': 'communet.net' } }
    )
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    }
  } catch (e) {}
  return null
}

export default function KommuneBearbeiten() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileRef = useRef()

  const [profile, setProfile] = useState({
    name: '', bio: '', land: '', adresse: '', website: '', instagram: '',
    avatar_url: '', kommune_typ: 'Ökodorf', gruendungsjahr: '', mitglieder: '',
    sichtbarkeit: 'stadt'
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [geocodeInfo, setGeocodeInfo] = useState('')
  const [profileStatus, setProfileStatus] = useState('pending')

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            name: data.name || '',
            bio: data.bio || '',
            land: data.land || '',
            adresse: data.adresse || '',
            website: data.website || '',
            instagram: data.instagram || '',
            avatar_url: data.avatar_url || '',
            kommune_typ: data.kommune_typ || 'Ökodorf',
            gruendungsjahr: data.gruendungsjahr || '',
            mitglieder: data.mitglieder || '',
            sichtbarkeit: data.sichtbarkeit || 'stadt'
          })
          setProfileStatus(data.status || 'pending')
        }
      })
  }, [user])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Upload fehlgeschlagen: ' + upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setProfile(p => ({ ...p, avatar_url: data.publicUrl }))
    setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setGeocodeInfo('')

    let lat = null
    let lon = null

    // Geocoding je nach Sichtbarkeit
    if (profile.sichtbarkeit === 'genau' && profile.adresse) {
      setGeocodeInfo('Adresse wird gesucht...')
      const coords = await geocode(profile.adresse)
      if (coords) { lat = coords.lat; lon = coords.lon; setGeocodeInfo('✅ Ort gefunden') }
      else setGeocodeInfo('⚠️ Adresse nicht gefunden — Marker wird nicht gesetzt')
    } else if ((profile.sichtbarkeit === 'stadt' || profile.sichtbarkeit === 'region') && profile.land) {
      setGeocodeInfo('Ort wird gesucht...')
      const coords = await geocode(profile.land)
      if (coords) { lat = coords.lat; lon = coords.lon; setGeocodeInfo('✅ Ort gefunden') }
      else setGeocodeInfo('⚠️ Ort nicht gefunden — Marker wird nicht gesetzt')
    }

    const { error: saveErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      typ: 'kommune',
      ...profile,
      lat,
      lon,
      gruendungsjahr: profile.gruendungsjahr ? parseInt(profile.gruendungsjahr) : null,
      mitglieder: profile.mitglieder ? parseInt(profile.mitglieder) : null,
    })

    setSaving(false)
    if (saveErr) { setError('Speichern fehlgeschlagen: ' + saveErr.message); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); setGeocodeInfo('') }, 3000)
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>Kommune bearbeiten</h1>
          {profileStatus === 'pending' && (
            <div className={styles.pendingBanner}>
              ⏳ Deine Kommune wartet auf Freischaltung durch Communet. Du kannst alles vorbereiten — nach der Freischaltung bist du im Katalog sichtbar.
            </div>
          )}
          {profileStatus === 'approved' && (
            <div className={styles.approvedBanner}>✅ Deine Kommune ist freigeschaltet und im Katalog sichtbar.</div>
          )}
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrap} onClick={() => fileRef.current.click()}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg}/>
                : <div className={styles.avatarPlaceholder}>🏡</div>
              }
              <div className={styles.avatarOverlay}>{uploading ? 'Lädt...' : '📷 ändern'}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>
          </div>

          <div className={styles.field}>
            <label>Name der Kommune</label>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="z.B. Ökodorf Sieben Linden"/>
          </div>

          <div className={styles.field}>
            <label>Typ</label>
            <select value={profile.kommune_typ} onChange={e => setProfile(p => ({...p, kommune_typ: e.target.value}))}>
              {TYPEN.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Gegründet</label>
              <input type="number" value={profile.gruendungsjahr} onChange={e => setProfile(p => ({...p, gruendungsjahr: e.target.value}))} placeholder="z.B. 1995" min="1800" max="2030"/>
            </div>
            <div className={styles.field}>
              <label>Mitglieder</label>
              <input type="number" value={profile.mitglieder} onChange={e => setProfile(p => ({...p, mitglieder: e.target.value}))} placeholder="z.B. 30"/>
            </div>
          </div>

          <div className={styles.field}>
            <label>Beschreibung</label>
            <textarea rows={4} value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} placeholder="Was macht eure Gemeinschaft aus?"/>
          </div>

          <div className={styles.field}>
            <label>Sichtbarkeit auf der Karte</label>
            <div className={styles.sichtbarkeitGrid}>
              {SICHTBARKEIT.map(s => (
                <div key={s.value}
                  className={`${styles.sichtbarkeitOption} ${profile.sichtbarkeit === s.value ? styles.sichtbarkeitActive : ''}`}
                  onClick={() => setProfile(p => ({...p, sichtbarkeit: s.value}))}
                >
                  <div className={styles.sichtbarkeitLabel}>{s.label}</div>
                  <div className={styles.sichtbarkeitDesc}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {(profile.sichtbarkeit === 'stadt' || profile.sichtbarkeit === 'region') && (
            <div className={styles.field}>
              <label>Ort / Region</label>
              <input
                type="text"
                value={profile.land}
                onChange={e => setProfile(p => ({...p, land: e.target.value}))}
                placeholder={profile.sichtbarkeit === 'region' ? 'z.B. Nordrhein-Westfalen, Deutschland' : 'z.B. Köln, Deutschland'}
              />
              <span className={styles.hint}>Wird beim Speichern automatisch auf der Karte verortet</span>
            </div>
          )}

          {profile.sichtbarkeit === 'genau' && (
            <div className={styles.field}>
              <label>Genaue Adresse</label>
              <input
                type="text"
                value={profile.adresse}
                onChange={e => setProfile(p => ({...p, adresse: e.target.value}))}
                placeholder="Straße, Hausnummer, PLZ, Ort"
              />
              <span className={styles.hint}>Intern für die Karte — wird nicht öffentlich angezeigt. Automatisch verortet beim Speichern.</span>
            </div>
          )}

          <div className={styles.field}>
            <label>Website</label>
            <input type="url" value={profile.website} onChange={e => setProfile(p => ({...p, website: e.target.value}))} placeholder="https://eure-website.de"/>
          </div>

          <div className={styles.field}>
            <label>Instagram</label>
            <div className={styles.inputPrefix}>
              <span>@</span>
              <input type="text" value={profile.instagram} onChange={e => setProfile(p => ({...p, instagram: e.target.value}))} placeholder="euerhandle"/>
            </div>
          </div>

          {geocodeInfo && <p className={styles.hint} style={{textAlign:'center'}}>{geocodeInfo}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={saving || uploading}>
            {saving ? 'Speichert & verortet...' : saved ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
