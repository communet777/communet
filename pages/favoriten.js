import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../components/Nav'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/Favoriten.module.css'

export default function Favoriten() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [favorites, setFavorites] = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?next=/favoriten')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    loadFavorites()
  }, [user])

  async function loadFavorites() {
    setFetching(true)
    // Favoriten laden
    const { data: favs, error } = await supabase
      .from('favorites')
      .select('id, community_id, created_at')
      .order('created_at', { ascending: false })

    if (error || !favs || favs.length === 0) {
      setFavorites([])
      setFetching(false)
      return
    }

    // Profil-Daten der favorisierten Kommunen laden
    const ids = favs.map(f => f.community_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, bio, land, adresse, avatar_url, lat, lon, kommune_typ, website, mitglieder')
      .in('id', ids)

    const profileMap = {}
    if (profiles) profiles.forEach(p => { profileMap[p.id] = p })

    setFavorites(favs.map(f => ({
      ...f,
      profile: profileMap[f.community_id] || null,
    })))
    setFetching(false)
  }

  async function handleRemove(communityId) {
    // Optimistisch entfernen
    setFavorites(prev => prev.filter(f => f.community_id !== communityId))
    await supabase.from('favorites')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id)
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
            {fetching ? '…' : favorites.length === 0
              ? 'Noch keine Kommunen gespeichert.'
              : `${favorites.length} ${favorites.length === 1 ? 'Kommune' : 'Kommunen'} gespeichert`}
          </p>
        </div>

        {fetching && (
          <div className={styles.loadingInner}><div className={styles.spinner} /></div>
        )}

        {!fetching && favorites.length === 0 && (
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
            {p?.mitglieder && <><span className={styles.dot}>·</span><span>👥 {p.mitglieder}</span></>}
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
