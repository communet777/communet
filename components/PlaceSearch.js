import { useState, useRef, useEffect } from 'react'
import Icon from './Icon'
import { geocodeCandidates } from '../lib/water'
import styles from '../styles/Karte.module.css'

// Freitext-Ortssuche: Ort/Adresse eintippen, Enter drücken. Gibt es mehrere Orte mit
// dem Namen (z. B. Bensberg in Deutschland und in Belgien), erscheint eine Auswahlliste.
// `bias` ist der aktuell sichtbare Kartenausschnitt — Treffer dort stehen oben.
export default function PlaceSearch({ onFound, bias, placeholder = 'Ort oder Adresse suchen …' }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [results, setResults] = useState([])
  const wrapRef = useRef(null)

  // Liste schließen, wenn außerhalb geklickt wird
  useEffect(() => {
    if (!results.length) return
    const close = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults([]) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [results.length])

  function pick(r) {
    setResults([])
    setQ(r.title)
    onFound(r)
  }

  async function submit(e) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setNotFound(false)
    setResults([])
    try {
      const list = await geocodeCandidates(q.trim(), bias)
      if (!list.length) setNotFound(true)
      else if (list.length === 1) pick(list[0])
      else setResults(list)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className={styles.searchWrap} ref={wrapRef}>
      <span className={styles.searchIcon}>{loading ? '…' : <Icon name="standort"/>}</span>
      <input
        type="text"
        className={styles.search}
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); setNotFound(false); setResults([]) }}
        onKeyDown={e => { if (e.key === 'Escape') setResults([]) }}
      />
      {notFound && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>Ort nicht gefunden</div>}
      {results.length > 0 && (
        <ul className={styles.searchResults} role="listbox">
          <li className={styles.searchResultsHead}>Welchen Ort meinst du?</li>
          {results.map((r, i) => (
            <li key={i} role="option" className={styles.searchResult} onClick={() => pick(r)}>
              <span className={styles.searchResultTitle}>{r.title}</span>
              {r.detail && <span className={styles.searchResultDetail}>{r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
