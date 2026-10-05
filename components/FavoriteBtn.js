import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from '../styles/FavoriteBtn.module.css'

// Stern aus dem Communet-Icon-Set (Form "Entdecken").
// Nicht favorisiert: nur die Umrisslinie (innen leer). Favorisiert: komplett gefüllt.
const STERN_AUSSEN = 'M238 461 c0 -1 -1 -7 -1 -13 -1 -22 -7 -58 -12 -77 -22 -81 -68 -124 -141 -131 -15 -1 -15 -4 0 -5 87 -6 132 -57 150 -170 2 -9 5 -36 5 -41 0 -3 1 -5 1 -6 2 -2 3 1 3 9 0 10 5 48 7 60 1 3 3 9 4 13 11 51 35 91 67 112 12 8 17 11 36 17 8 3 35 8 46 8 8 1 4 3 -5 5 -88 10 -132 58 -151 165 -3 14 -6 42 -6 49 0 5 -1 7 -3 5z'
const STERN_UMRISS = 'M238 461 c0 -1 -1 -7 -1 -13 -1 -22 -7 -58 -12 -77 -22 -81 -68 -124 -141 -131 -15 -1 -15 -4 0 -5 87 -6 132 -57 150 -170 2 -9 5 -36 5 -41 0 -3 1 -5 1 -6 2 -2 3 1 3 9 0 10 5 48 7 60 1 3 3 9 4 13 11 51 35 91 67 112 12 8 17 11 36 17 8 3 35 8 46 8 8 1 4 3 -5 5 -88 10 -132 58 -151 165 -3 14 -6 42 -6 49 0 5 -1 7 -3 5z m10 -125 c10 -37 28 -65 50 -80 8 -6 22 -14 24 -14 1 0 1 0 1 -1 0 -1 1 -1 3 -1 2 0 3 0 3 -1 0 -1 -1 -1 -2 -1 -4 0 -24 -10 -31 -15 -20 -16 -37 -42 -45 -71 -3 -11 -9 -35 -10 -40 -1 -5 -1 -5 -1 -2 -9 38 -13 51 -24 72 -13 26 -31 43 -53 52 -5 1 -10 3 -11 3 -2 0 -1 2 2 2 27 7 55 36 70 72 7 18 15 46 15 55 0 1 1 -2 3 -8 2 -7 4 -16 6 -22z'

function Stern({ gefuellt }) {
  return (
    <svg viewBox="0 0 480 480" width={20} height={20} aria-hidden="true" style={{display:'block'}}>
      <g transform="translate(0,480) scale(1,-1)" fill="#E9AD55">
        <path d={gefuellt ? STERN_AUSSEN : STERN_UMRISS} fillRule="evenodd"/>
      </g>
    </svg>
  )
}

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
      aria-pressed={liked}
    >
      <Stern gefuellt={liked}/>
    </button>
  )
}
