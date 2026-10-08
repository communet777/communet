import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import Icon from '../../components/Icon'
import TypIcon from '../../components/TypIcon'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import ProfileSwitcher from '../../components/ProfileSwitcher'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Profil.module.css'

export default function Profil() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { active, earlyAccess, profiles } = useActiveProfile()
  const [profile, setProfile] = useState(null)
  const [feedOffers, setFeedOffers] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [internAktiv, setInternAktiv] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  useEffect(() => {
    if (!user || !active) return
    supabase.from('profiles').select('*').eq('id', active.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user, active?.id])

  // Interner Bereich: nur sichtbar, wenn für diese Gemeinschaft freigeschaltet
  useEffect(() => {
    setInternAktiv(false)
    if (!user || !active || active.typ !== 'kommune') return
    supabase.from('kommune_intern').select('aktiv').eq('kommune_id', active.id).maybeSingle()
      .then(({ data }) => setInternAktiv(!!data?.aktiv))
  }, [user, active?.id])

  useEffect(() => {
    if (!user) return
    async function loadFeed() {
      const { data: favs } = await supabase.from('favorites').select('community_id').eq('user_id', user.id)
      if (!favs || favs.length === 0) { setFeedLoading(false); return }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const uuidIds = favs.map(f => f.community_id).filter(id => uuidRegex.test(id))
      if (uuidIds.length === 0) { setFeedLoading(false); return }
      const { data: offs } = await supabase.from('offers').select('*')
        .in('kommune_id', uuidIds).order('created_at', { ascending: false })
      if (!offs || offs.length === 0) { setFeedLoading(false); return }
      const { data: kommunen } = await supabase.from('profiles').select('id, name, avatar_url, kommune_typ').in('id', uuidIds)
      const kommuneMap = {}
      if (kommunen) kommunen.forEach(k => { kommuneMap[k.id] = k })
      setFeedOffers(offs.map(o => ({ ...o, kommune: kommuneMap[o.kommune_id] || null })))
      setFeedLoading(false)
    }
    loadFeed()
  }, [user])

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  const name = profile?.name || user.user_metadata?.name || user.email
  const typ = profile?.typ || user.user_metadata?.typ || 'person'
  const since = new Date(profile?.created_at || user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
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
                : <span className={styles.avatarEmoji}>{isKommune ? <TypIcon typ={profile?.kommune_typ} size={44}/> : <Icon name="person" size={44}/>}</span>
              }
            </div>
            <h1 className={styles.name}>{name}</h1>
            <div className={styles.badge}>{isKommune ? (profile?.kommune_typ || 'Kommune') : 'Person'}</div>
            {profile?.land && <div className={styles.meta}><Icon name="standort"/> {profile.land}</div>}
            {!isKommune && <div className={styles.meta}>{user.email}</div>}
            {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.since}>Mitglied seit {since}</div>
            <div className={styles.divider}/>
            <ProfileSwitcher style={{width:'100%',maxWidth:'none',marginBottom:10}}/>
            {profile?.hidden && <div className={styles.meta}>🔒 Versteckt – nur für dich und eingeladene Mitglieder</div>}
            <Link href={isKommune ? `/profil/kommune?id=${active?.id}` : '/profil/bearbeiten'} className={styles.btnPrimary}>Profil bearbeiten</Link>
            {isKommune && <Link href={`/profil/mitglieder?id=${active?.id}`} className={styles.btnSecondary} style={{marginTop:8}}>👥 Mitglieder &amp; Rollen</Link>}
            {isKommune && internAktiv && <Link href={`/profil/intern?id=${active?.id}`} className={styles.btnSecondary} style={{marginTop:8}}>🏡 Interner Bereich</Link>}
            <div className={styles.actions}>
              {earlyAccess && <Link href="/nachrichten" className={styles.btnSecondary}>✉️ Nachrichten</Link>}
              {earlyAccess && <Link href="/leute" className={styles.btnSecondary}><Icon name="person"/> Leute finden</Link>}
              {earlyAccess && !profiles.some(p => p.typ === 'kommune' && !p.managed) && <Link href="/profil/kommune?neu=1" className={styles.btnSecondary}><Icon name="globus"/> Neue Kommune</Link>}
              <Link href="/favoriten" className={styles.btnSecondary}><Icon name="stern"/> Favoriten</Link>
              <Link href="/kommunen" className={styles.btnSecondary}><Icon name="globus"/> Gemeinschaften</Link>
              <Link href="/karte" className={styles.btnSecondary}><Icon name="karte"/> Karte</Link>
            </div>
            <button className={styles.signOut} onClick={handleSignOut}>Abmelden</button>
          </div>
        </aside>

        <main className={styles.feed}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:12,flexWrap:'wrap'}}>
<h2 className={styles.feedTitle}>Dein Feed</h2>
<Link href="/feed" style={{fontSize:12,color:'var(--g)'}}>Als eigene Seite öffnen →</Link>
</div>
          {feedLoading && <div style={{color:'var(--muted)',fontSize:13,padding:24,textAlign:'center'}}>Lädt...</div>}
          {!feedLoading && feedOffers.length === 0 && (
            <div className={styles.feedPlaceholder}>
              <div className={styles.feedIcon}><Icon name="globus" size={44}/></div>
              <p className={styles.feedSub}>
                Hier erscheinen Angebote von Kommunen denen du folgst.<br/>
                Klick auf den Stern auf einer Gemeinschafts-Seite, um ihr zu folgen.
              </p>
              <Link href="/kommunen" className={styles.btnPrimary} style={{display:'inline-block',marginTop:16}}>Gemeinschaften entdecken</Link>
            </div>
          )}
          {feedOffers.map(o => (
            <Link key={o.id} href={`/angebote/${o.id}`} style={{textDecoration:'none'}}>
              <div className={styles.feedCard}>
                <div className={styles.feedCardMeta}><TypIcon typ={o.kommune?.kommune_typ} size={13}/> {o.kommune?.name || 'Kommune'}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',margin:'4px 0'}}>
                  <span style={{fontSize:11,fontWeight:600,background:'#E1ECEE',color:'var(--g)',padding:'2px 8px',borderRadius:20}}>{o.typ}</span>
                  {o.datum && <span style={{fontSize:11,color:'var(--muted)'}}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
                  {!o.datum && o.von && <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
                </div>
                <div className={styles.feedCardTitle}>{o.titel}</div>
                {o.ort && <div className={styles.feedCardOrt}><Icon name="standort"/> {o.ort}</div>}
                {o.beschreibung && <p className={styles.feedCardDesc}>{o.beschreibung.slice(0,120)}{o.beschreibung.length>120?'…':''}</p>}
              </div>
            </Link>
          ))}
        </main>
      </div>
    </div>
  )
}
