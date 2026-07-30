import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Profil.module.css'

export default function Profil() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [feedOffers, setFeedOffers] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  useEffect(() => {
    if (!user) return
    async function loadFeed() {
      const { data: favs } = await supabase.from('favorites').select('community_id').eq('user_id', user.id)
      if (!favs || favs.length === 0) { setFeedLoading(false); return }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const uuidIds = favs.map(f => f.community_id).filter(id => uuidRegex.test(id))
      if (uuidIds.length === 0) { setFeedLoading(false); return }
      // Alle Angebote der favorisierten Kommunen laden
      const { data: offs } = await supabase.from('offers').select('*')
        .in('kommune_id', uuidIds)
        .order('created_at', { ascending: false })
      if (!offs || offs.length === 0) { setFeedLoading(false); return }
      // Kommunen-Namen laden
      const { data: kommunen } = await supabase.from('profiles').select('id, name, avatar_url').in('id', uuidIds)
      const kommuneMap = {}
      if (kommunen) kommunen.forEach(k => { kommuneMap[k.id] = k })
      setFeedOffers(offs.map(o => ({ ...o, kommune: kommuneMap[o.kommune_id] || null })))
      setFeedLoading(false)
    }
    loadFeed()
  }, [user])

  if (loading || !user) return (
    <div className={styles.loading}><div className={styles.spinner}/></div>
  )

  const name = profile?.name || user.user_metadata?.name || user.email
  const typ = profile?.typ || user.user_metadata?.typ || 'person'
  const since = new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const isKommune = typ === 'kommune'
  const isPending = profile?.status === 'pending'

  async function handleSignOut() { await signOut(); router.push('/') }

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {isPending && <div className={styles.pendingBanner}>⏳ Wartet auf Freischaltung</div>}
          <div className={styles.card}>
            <div className={styles.avatar}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg}/>
                : <span className={styles.avatarEmoji}>{isKommune ? '🏡' : '👤'}</span>
              }
            </div>
            <h1 className={styles.name}>{name}</h1>
            <div className={styles.badge}>{isKommune ? (profile?.kommune_typ || 'Kommune') : 'Person'}</div>
            {profile?.land && <div className={styles.meta}>📍 {profile.land}</div>}
            <div className={styles.meta}>{user.email}</div>
            {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.since}>Mitglied seit {since}</div>
            <div className={styles.divider}/>
            <Link href={isKommune ? '/profil/kommune' : '/profil/bearbeiten'} className={styles.btnPrimary}>Profil bearbeiten</Link>
            <div className={styles.actions}>
              <Link href="/kommunen" className={styles.btnSecondary}>🌍 Kommunen</Link>
              <Link href="/karte" className={styles.btnSecondary}>🗺️ Karte</Link>
            </div>
            <button className={styles.signOut} onClick={handleSignOut}>Abmelden</button>
          </div>
        </aside>

        <main className={styles.feed}>
          <h2 className={styles.feedTitle}>Dein Feed</h2>
          {feedLoading && <div style={{color:'var(--muted)',fontSize:13,padding:24,textAlign:'center'}}>Lädt...</div>}
          {!feedLoading && feedOffers.length === 0 && (
            <div className={styles.feedPlaceholder}>
              <div className={styles.feedIcon}>🌏</div>
              <p className={styles.feedSub}>
                Hier erscheinen Angebote von Kommunen denen du folgst.<br/>
                Klick auf ♡ auf einer Kommunen-Seite um ihr zu folgen.
              </p>
              <Link href="/kommunen" className={styles.btnPrimary} style={{display:'inline-block',marginTop:16}}>Kommunen entdecken</Link>
            </div>
          )}
          {feedOffers.map(o => (
            <div key={o.id} className={styles.feedCard}>
              <div className={styles.feedCardMeta}>🏡 {o.kommune?.name || 'Kommune'}</div>
              <div style={{display:'flex',gap:8,alignItems:'center',margin:'4px 0'}}>
                <span style={{fontSize:11,fontWeight:600,background:'#e8f5ee',color:'var(--g)',padding:'2px 8px',borderRadius:20}}>{o.typ}</span>
                {o.datum && <span style={{fontSize:11,color:'var(--muted)'}}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
                {!o.datum && o.von && <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
              </div>
              <div className={styles.feedCardTitle}>{o.titel}</div>
              {o.ort && <div className={styles.feedCardOrt}>📍 {o.ort}</div>}
              {o.beschreibung && <p className={styles.feedCardDesc}>{o.beschreibung}</p>}
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
