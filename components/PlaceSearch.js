import { useState } from 'react'
import { geocodeSearch } from '../lib/water'
import styles from '../styles/Karte.module.css'

// Freitext-Ortssuche wie bei Google Maps: Ort/Adresse eintippen, Enter drücken,
// Karte fliegt dorthin (mit passendem Zoom statt fester Stufe). `bias` ist der
// aktuell sichtbare Kartenausschnitt (south/west/north/east) — Treffer dort in
// der Nähe werden bevorzugt, damit z.B. "Bensberg" nicht ein gleichnamiges Bensberg
// in einem anderen Land trifft.
export default function PlaceSearch({ onFound, bias, placeholder = 'Ort oder Adresse suchen …' }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setNotFound(false)
    try {
      const result = await geocodeSearch(q.trim(), bias)
      if (result) onFound(result)
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className={styles.searchWrap}>
      <span className={styles.searchIcon}>{loading ? '…' : '📍'}</span>
      <input
        type="text"
        className={styles.search}
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); setNotFound(false) }}
      />
      {notFound && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>Ort nicht gefunden</div>}
    </form>
  )
}
