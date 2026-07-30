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

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  if (loading || !user) return (
    <div className={styles.loading}><div className={styles.spinner}/></div>
  )

  const name = profile?.name || user.user_metadata?.name || user.email
  const typ = profile?.typ || user.user_metadata?.typ || 'person'
  const since = new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const isKommune = typ === 'kommune'
  const isPending = profile?.status === 'pending'

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.card}>
          {isPending && (
            <div className={styles.pendingBanner}>
              ⏳ Deine Kommune wartet auf Freischaltung
            </div>
          )}
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

          <Link href={isKommune ? '/profil/kommune' : '/profil/bearbeiten'} className={styles.btnPrimary}>
            Profil bearbeiten
          </Link>

          <div className={styles.actions}>
            <Link href="/kommunen" className={styles.btnSecondary}>🌍 Kommunen</Link>
            <Link href="/karte" className={styles.btnSecondary}>🗺️ Karte</Link>
          </div>

          <button className={styles.signOut} onClick={handleSignOut}>Abmelden</button>
        </div>
      </div>
    </div>
  )
}
