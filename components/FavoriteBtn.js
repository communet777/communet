import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from '../styles/FavoriteBtn.module.css'

export default function FavoriteBtn({ communityId }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !communityId) return
    supabase.from('favorites')
      .select('id').eq('user_id', user.id).eq('community_id', communityId).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Favoriten-Status laden fehlgeschlagen:', error)
        setLiked(!!data)
      })
  }, [user, communityId])

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    setLoading(true)
    if (liked) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('community_id', communityId)
      if (error) console.error('Favorit entfernen fehlgeschlagen:', error)
      else setLiked(false)
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, community_id: communityId })
      // 23505 = Eintrag existiert schon, dann ist es trotzdem ein Favorit
      if (error && error.code !== '23505') console.error('Favorit speichern fehlgeschlagen:', error)
      else setLiked(true)
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <button
      className={`${styles.btn} ${liked ? styles.liked : ''}`}
      onClick={toggle}
      disabled={loading}
      title={liked ? 'Aus Favoriten entfernen' : 'Favorisieren'}
    >
      {liked ? '♥' : '♡'}
    </button>
  )
}
