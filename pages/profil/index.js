import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { getTypIcon } from '../../data/communities'
import styles from '../../styles/Profil.module.css'

export default function Profil() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading])

  if (loading || !user) return (
    <div className={styles.loading}>
      <div className={styles.spinner}/>
    </div>
  )

  const name = user.user_metadata?.name || user.email
  const typ = user.user_metadata?.typ || 'person'
  const icon = typ === 'kommune' ? getTypIcon('Kommune') : getTypIcon('Ökodorf')
  const since = new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.avatar}>{typ === 'kommune' ? '🏡' : '👤'}</div>
          <h1 className={styles.name}>{name}</h1>
          <div className={styles.badge}>{typ === 'kommune' ? 'Kommune' : 'Person'}</div>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.since}>Mitglied seit {since}</div>

          <div className={styles.divider}/>

          <div className={styles.actions}>
            <Link href="/kommunen" className={styles.btnSecondary}>🌍 Kommunen entdecken</Link>
            <Link href="/karte" className={styles.btnSecondary}>🗺️ Karte</Link>
          </div>

          <button className={styles.signOut} onClick={handleSignOut}>
            Abmelden
          </button>
        </div>
      </div>
    </div>
  )
}
