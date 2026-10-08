import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Dateiablage des Internen Bereichs (Checklisten, Abrechnungen, Verträge, Pläne, Kontakte ...).
// Dateien liegen im privaten Speicher "kommune-dokumente", nur Bewohner haben Zugriff.
// Mit ortId zeigt die Komponente nur die Dokumente eines Raums und legt neue dort ab.
const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }

export const KATEGORIEN = [
  ['checkliste', 'Checklisten (Ankommen, Abreisen)'],
  ['abrechnung', 'Abrechnungen und Finanzen'],
  ['vertrag', 'Verträge und Versicherungen'],
  ['plan', 'Pläne, Gutachten, Fotos'],
  ['kontakt', 'Kontakte und Adressen'],
  ['sonstiges', 'Sonstiges'],
]

function groesse(b) {
  if (!b) return ''
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export default function Dokumente({ pid, ortId = null, setMsg }) {
  const [docs, setDocs] = useState([])
  const [orte, setOrte] = useState([])
  const [filter, setFilter] = useState('alle')
  const [f, setF] = useState({ titel: '', kategorie: 'checkliste', ort_id: '', datei: null, busy: false })

  async function laden() {
    let q = supabase.from('kommune_dokumente').select('*').eq('kommune_id', pid).order('created_at', { ascending: false })
    if (ortId) q = q.eq('ort_id', ortId)
    const { data, error } = await q
    if (error) { setMsg(error.message); return }
    setDocs(data || [])
  }
  useEffect(() => {
    laden()
    if (!ortId) supabase.from('kommune_orte').select('id,titel').eq('kommune_id', pid).order('titel').then(({ data }) => setOrte(data || []))
  }, [pid, ortId])

  async function hochladen(e) {
    e.preventDefault()
    if (!f.datei) return
    setF(x => ({ ...x, busy: true }))
    const ext = (f.datei.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const pfad = `${pid}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from('kommune-dokumente').upload(pfad, f.datei, { contentType: f.datei.type || undefined })
    if (up.error) { setMsg('Hochladen fehlgeschlagen: ' + up.error.message); setF(x => ({ ...x, busy: false })); return }
    const { error } = await supabase.from('kommune_dokumente').insert({
      kommune_id: pid, ort_id: ortId || f.ort_id || null, titel: (f.titel.trim() || f.datei.name.replace(/\.[^.]+$/, '')),
      kategorie: f.kategorie, datei_pfad: pfad, dateiname: f.datei.name, groesse: f.datei.size, mime: f.datei.type || null,
    })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); setF(x => ({ ...x, busy: false })); return }
    setMsg('')
    setF({ titel: '', kategorie: f.kategorie, ort_id: '', datei: null, busy: false })
    e.target.reset()
    laden()
  }

  async function oeffnen(d) {
    const { data, error } = await supabase.storage.from('kommune-dokumente').createSignedUrl(d.datei_pfad, 300, { download: false })
    if (error || !data?.signedUrl) { setMsg('Öffnen fehlgeschlagen: ' + (error?.message || 'kein Link')); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function loeschen(d) {
    if (!window.confirm(`"${d.titel}" löschen? Das kann nicht rückgängig gemacht werden.`)) return
    await supabase.storage.from('kommune-dokumente').remove([d.datei_pfad])
    const { error } = await supabase.from('kommune_dokumente').delete().eq('id', d.id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setDocs(l => l.filter(x => x.id !== d.id))
  }

  const raumName = id => orte.find(o => o.id === id)?.titel
  const sicht = docs.filter(d => filter === 'alle' || d.kategorie === filter)
  const pill = on => ({ ...btn, background: on ? 'var(--text)' : 'var(--card)', color: on ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999 })

  return (
    <div>
      {!ortId && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" style={pill(filter === 'alle')} onClick={() => setFilter('alle')}>Alle ({docs.length})</button>
          {KATEGORIEN.map(([v, l]) => <button key={v} type="button" style={pill(filter === v)} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
      )}

      {sicht.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Noch keine Dokumente{ortId ? ' für diesen Raum' : ''}.</p>}
      {sicht.map(d => (
        <div key={d.id} style={{ ...card, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>📄 {d.titel}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {KATEGORIEN.find(k => k[0] === d.kategorie)?.[1] || d.kategorie} · {new Date(d.created_at).toLocaleDateString('de-DE')}{d.groesse ? ` · ${groesse(d.groesse)}` : ''}{!ortId && d.ort_id && raumName(d.ort_id) ? ` · ${raumName(d.ort_id)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={btn} onClick={() => oeffnen(d)}>Öffnen</button>
            <button type="button" style={btnLight} onClick={() => loeschen(d)}>Löschen</button>
          </div>
        </div>
      ))}

      <form onSubmit={hochladen} style={{ ...card, marginTop: 16, display: 'grid', gap: 10, maxWidth: 560 }}>
        <strong>Dokument ablegen</strong>
        <div><label style={label}>Datei (PDF, Word, Excel, Bild ... bis 50 MB)</label><input type="file" required onChange={e => setF({ ...f, datei: e.target.files?.[0] || null })}/></div>
        <div><label style={label}>Titel (sonst der Dateiname)</label><input style={input} value={f.titel} onChange={e => setF({ ...f, titel: e.target.value })} placeholder="z. B. Checkliste Ankommen"/></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div><label style={label}>Ablage</label>
            <select style={input} value={f.kategorie} onChange={e => setF({ ...f, kategorie: e.target.value })}>{KATEGORIEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          {!ortId && (
            <div><label style={label}>Raum (optional)</label>
              <select style={input} value={f.ort_id} onChange={e => setF({ ...f, ort_id: e.target.value })}><option value="">Kein bestimmter Raum</option>{orte.map(o => <option key={o.id} value={o.id}>{o.titel}</option>)}</select>
            </div>
          )}
        </div>
        <div><button type="submit" style={btn} disabled={f.busy}>{f.busy ? 'Lädt hoch…' : 'Ablegen'}</button></div>
      </form>
    </div>
  )
}
