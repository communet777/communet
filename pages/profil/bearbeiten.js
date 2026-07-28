import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'

export default function ProfilBearbeiten() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileRef = useRef()

  const [profile, setProfile] = useState({ name: '', bio: '', land: '', website: '', instagram: '', avatar_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile({
          name: data.name || '',
          bio: data.bio || '',
          land: data.land || '',
          website: data.website || '',
          instagram: data.instagram || '',
          avatar_url: data.avatar_url || ''
        })
      })
  }, [user])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
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
    const { error: saveErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: profile.name,
      bio: profile.bio,
      land: profile.land,
      website: profile.website,
      instagram: profile.instagram,
      avatar_url: profile.avatar_url
    })
    setSaving(false)
    if (saveErr) { setError('Speichern fehlgeschlagen: ' + saveErr.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>Profil bearbeiten</h1>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrap} onClick={() => fileRef.current.click()}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg}/>
                : <div className={styles.avatarPlaceholder}>{profile.name?.[0]?.toUpperCase() || '👤'}</div>
              }
              <div className={styles.avatarOverlay}>{uploading ? 'Lädt...' : '📷 ändern'}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>
            <p className={styles.avatarHint}>JPG, PNG oder WEBP · max. 5 MB</p>
          </div>

          <div className={styles.field}>
            <label>Name</label>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="Dein Name"/>
          </div>

          <div className={styles.field}>
            <label>Bio</label>
            <textarea rows={4} value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} placeholder="Erzähl etwas über dich oder deine Kommune..."/>
          </div>

          <div className={styles.field}>
            <label>Ort / Region</label>
            <input type="text" value={profile.land} onChange={e => setProfile(p => ({...p, land: e.target.value}))} placeholder="z.B. Köln, Deutschland"/>
            <span className={styles.hint}>Wird später auch per App automatisch aktualisierbar sein</span>
          </div>

          <div className={styles.field}>
            <label>Website</label>
            <input type="url" value={profile.website} onChange={e => setProfile(p => ({...p, website: e.target.value}))} placeholder="https://deine-website.de"/>
          </div>

          <div className={styles.field}>
            <label>Instagram</label>
            <div className={styles.inputPrefix}>
              <span>@</span>
              <input type="text" value={profile.instagram} onChange={e => setProfile(p => ({...p, instagram: e.target.value}))} placeholder="deinhandle"/>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={saving || uploading}>
            {saving ? 'Wird gespeichert...' : saved ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
