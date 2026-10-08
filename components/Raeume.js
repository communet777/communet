import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// Alle Räume und Bereiche der Gemeinschaft als Liste, gruppiert nach Stockwerk. Von hier aus geht es zu den Raumseiten.
const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }

export default function Raeume({ pid, setMsg }) {
  const [karten, setKarten] = useState([])
  const [orte, setOrte] = useState([])
  const [offen, setOffen] = useState({})
  const [neu, setNeu] = useState('')

  async function laden() {
    const [k, o, a] = await Promise.all([
      supabase.from('kommune_karten').select('id,titel,sort').eq('kommune_id', pid).order('sort').order('created_at'),
      supabase.from('kommune_orte').select('id,karte_id,titel,beschreibung,probleme,flaeche_m2,created_at').eq('kommune_id', pid).order('created_at'),
      supabase.from('kommune_aufgaben').select('ort_id').eq('kommune_id', pid).neq('status', 'fertig').not('ort_id', 'is', null),
    ])
    if (k.error || o.error) { setMsg((k.error || o.error).message); return }
    setKarten(k.data || []); setOrte(o.data || [])
    const m = {}
    ;(a.data || []).forEach(x => { m[x.ort_id] = (m[x.ort_id] || 0) + 1 })
    setOffen(m)
  }
  useEffect(() => { laden() }, [pid])

  async function anlegen(e) {
    e.preventDefault()
    if (!neu.trim()) return
    const { error } = await supabase.from('kommune_orte').insert({ kommune_id: pid, titel: neu.trim(), kategorie: 'bereich' })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNeu(''); laden()
  }

  const gruppen = [
    ...karten.map(k => ({ key: k.id, titel: k.titel, liste: orte.filter(o => o.karte_id === k.id) })),
    { key: 'weitere', titel: 'Außenbereich, Dach und weitere Bereiche', liste: orte.filter(o => !o.karte_id || !karten.some(k => k.id === o.karte_id)) },
  ].filter(g => g.liste.length)

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>Jeder Raum hat eine eigene Seite mit Maßen, Problemen, Projekten, Aufgaben, Entscheidungen und Dokumenten.</p>
      {gruppen.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Noch keine Räume. Lade im Reiter Karte die Grundrisse hoch oder lege unten einen Bereich an.</p>}
      {gruppen.map(g => (
        <div key={g.key} style={card}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{g.titel}</div>
          {g.liste.map(o => (
            <Link key={o.id} href={`/profil/raum?id=${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '8px 4px', minHeight: 40, borderTop: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}>
              <span>{o.titel}</span>
              <span style={{ display: 'flex', gap: 8, fontSize: 12, flexShrink: 0 }}>
                {o.probleme && <span style={{ color: '#b3261e', fontWeight: 600 }}>Probleme</span>}
                {offen[o.id] ? <span style={{ color: 'var(--muted)' }}>{offen[o.id]} offen</span> : null}
                <span style={{ color: 'var(--g)' }}>→</span>
              </span>
            </Link>
          ))}
        </div>
      ))}
      <form onSubmit={anlegen} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 520 }}>
        <input style={{ ...input, flex: '1 1 220px', width: 'auto' }} placeholder="Weiteren Bereich anlegen, z. B. Scheune" value={neu} onChange={e => setNeu(e.target.value)}/>
        <button type="submit" style={btn}>Anlegen</button>
      </form>
    </div>
  )
}
