import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../components/Nav'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/Favoriten.module.css'

// Bricht eine Abfrage nach ms Millisekunden mit Fehler ab, statt endlos zu warten
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Zeitüberschreitung bei ${label} (${ms / 1000} s)`)), ms)
    ),
  ])
}

export default function Favoriten() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [favorites, setFavorites] = useState([])
  const [fetching, setFetching] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?next=/favoriten')
  }, [user, loading])

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadFavorites() {
      setFetching(true)
      setLoadError(null)
      try {
        const { data: favs, error } = await withTimeout(
          supabase
            .from('favorites')
            .select('id, community_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          10000,
          'Favoriten'
        )
        if (error) throw error

        if (!favs || favs.length === 0) {
          if (!cancelled) setFavorites([])
          return
        }

        const ids = favs.map(f => f.community_id)
        const { data: profiles, error: profError } = await withTimeout(
          supabase
            .from('profiles')
            .select('id, name, bio, land, avatar_url, kommune_typ, website, mitglieder')
            .in('id', ids),
          10000,
          'Kommunen-Profilen'
        )
        if (profError) throw profError

        const profileMap = {}
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p })

        if (!cancelled) {
          setFavorites(favs.map(f => ({ ...f, profile: profileMap[f.community_id] || null })))
        }
      } catch (e) {
        console.error('Favoriten laden fehlgeschlagen:', e)
        if (!cancelled) {
          setLoadError(e?.message || String(e))
          setFavorites([])
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    loadFavorites()
    return () => { cancelled = true }
  }, [userId])

  async function handleRemove(communityId) {
    const before = favorites
    // Optimistisch entfernen
    setFavorites(prev => prev.filter(f => f.community_id !== communityId))
    const { error } = await supabase.from('favorites')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId)
    if (error) {
      console.error('Favorit entfernen fehlgeschlagen:', error)
      setFavorites(before)
      setLoadError('Entfernen fehlgeschlagen: ' + error.message)
    }
  }

  if (loading || !user) {
    return <div className={styles.loading}><div className={styles.spinner} /></div>
  }

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Meine Favoriten</h1>
          <p className={styles.sub}>
            {fetching ? '…' : loadError ? '' : favorites.length === 0
              ? 'Noch keine Kommunen gespeichert.'
              : `${favorites.length} ${favorites.length === 1 ? 'Kommune' : 'Kommunen'} gespeichert`}
          </p>
        </div>

        {fetching && (
          <div className={styles.loadingInner}><div className={styles.spinner} /></div>
        )}

        {!fetching && loadError && (
          <div className={styles.error}>
            <strong>Favoriten konnten nicht geladen werden.</strong>
            <div className={styles.errorMsg}>{loadError}</div>
          </div>
        )}

        {!fetching && !loadError && favorites.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyHeart}>♡</div>
            <p className={styles.emptySub}>
              Klick auf ♡ auf einer Kommunen-Seite, um sie hier zu speichern.
            </p>
            <Link href="/kommunen" className={styles.btnPrimary}>
              Kommunen entdecken
            </Link>
          </div>
        )}

        {!fetching && favorites.length > 0 && (
          <ul className={styles.list}>
            {favorites.map(fav => (
              <FavCard key={fav.id} fav={fav} onRemove={() => handleRemove(fav.community_id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FavCard({ fav, onRemove }) {
  const p = fav.profile
  const name = p?.name || '(Unbekannte Kommune)'
  const initial = name.charAt(0).toUpperCase()
  const href = `/profil/p/${fav.community_id}`

  return (
    <li className={styles.card}>
      <Link href={href} className={styles.cardInner}>
        <div className={styles.avatar}>
          {p?.avatar_url
            ? <img src={p.avatar_url} alt={name} className={styles.avatarImg} />
            : <span className={styles.avatarInitial}>{initial}</span>
          }
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardName}>{name}</div>
          <div className={styles.cardMeta}>
            {p?.kommune_typ && <span>{p.kommune_typ}</span>}
            {p?.kommune_typ && p?.land && <span className={styles.dot}>·</span>}
            {p?.land && <span>{p.land}</span>}
            {p?.mitglieder > 0 && <><span className={styles.dot}>·</span><span>👥 {p.mitglieder}</span></>}
          </div>
          {p?.bio && <p className={styles.cardBio}>{p.bio}</p>}
        </div>
      </Link>
      <button
        className={styles.removeBtn}
        onClick={onRemove}
        title="Aus Favoriten entfernen"
        aria-label={`${name} aus Favoriten entfernen`}
      >
        ♥
      </button>
    </li>
  )
}
