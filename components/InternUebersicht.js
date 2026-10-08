import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// Startansicht des Profils einer Gemeinschaft mit Internem Bereich:
// wer heute da ist, was ansteht und was fällig ist.
const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }
const h3 = { fontSize: 15, margin: '0 0 8px' }
const pad = n => String(n).padStart(2, '0')
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const kurz = s => new Date(s).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })

export default function InternUebersicht({ pid, userId }) {
  const [da, setDa] = useState(null)
  const [bald, setBald] = useState(null)
  const [termine, setTermine] = useState(null)
  const [aufg, setAufg] = useState(null)

  useEffect(() => {
    const von = new Date(); von.setHours(0, 0, 0, 0)
    const bis = new Date(von); bis.setHours(23, 59, 59, 999)
    const in14 = new Date(von); in14.setDate(in14.getDate() + 14)
    ;(async () => {
      const [a, b, t, f] = await Promise.all([
        supabase.from('kommune_termine').select('gruppe,titel,beginn,ende').eq('kommune_id', pid).eq('art', 'anwesenheit').lte('beginn', bis.toISOString()).gte('ende', von.toISOString()),
        supabase.from('kommune_termine').select('gruppe,titel,beginn,ende').eq('kommune_id', pid).eq('art', 'anwesenheit').gt('beginn', bis.toISOString()).lte('beginn', in14.toISOString()).order('beginn'),
        supabase.from('kommune_termine').select('id,titel,beginn,ort').eq('kommune_id', pid).eq('art', 'termin').gte('beginn', von.toISOString()).order('beginn').limit(5),
        supabase.from('kommune_aufgaben').select('id,titel,faellig,zustaendig,status,intervall_tage').eq('kommune_id', pid).neq('status', 'fertig').order('faellig', { nullsFirst: false }).limit(40),
      ])
      setDa(a.data || []); setBald(b.data || []); setTermine(t.data || []); setAufg(f.data || [])
    })()
  }, [pid])

  const heute = dayKey(new Date())
  const faellig = (aufg || []).filter(x => x.faellig && x.faellig <= dayKey(new Date(Date.now() + 7 * 86400000)))
  const meine = (aufg || []).filter(x => x.zustaendig === userId)
  const href = tab => `/profil/intern?id=${pid}&tab=${tab}`
  const link = { color: 'var(--g)', fontSize: 13 }

  return (
    <div>
      <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>Interner Bereich</h2>

      <div style={card}>
        <h3 style={h3}>👥 Heute da</h3>
        {da === null ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Lädt…</span>
          : da.length === 0 ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Niemand eingetragen.</span>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{da.map((x, i) => <span key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', fontSize: 14 }}>{x.gruppe || x.titel}</span>)}</div>}
        {bald && bald.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
            Als Nächstes: {bald.slice(0, 4).map(x => `${x.gruppe || x.titel} ab ${kurz(x.beginn)}`).join(' · ')}
          </div>
        )}
        <div style={{ marginTop: 10 }}><Link href={href('kalender')} style={link}>Zum Kalender →</Link></div>
      </div>

      <div style={card}>
        <h3 style={h3}>📅 Nächste Termine</h3>
        {termine === null ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Lädt…</span>
          : termine.length === 0 ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Keine anstehenden Termine.</span>
          : termine.map(x => <div key={x.id} style={{ padding: '4px 0', fontSize: 14 }}><strong>{kurz(x.beginn)}</strong> · {x.titel}{x.ort ? ` · ${x.ort}` : ''}</div>)}
      </div>

      <div style={card}>
        <h3 style={h3}>✅ Aufgaben</h3>
        {aufg === null ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Lädt…</span> : (
          <>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{aufg.length} offen · {meine.length} bei dir · {faellig.length} in den nächsten 7 Tagen fällig</div>
            {faellig.slice(0, 6).map(x => (
              <div key={x.id} style={{ padding: '3px 0', fontSize: 14, color: x.faellig < heute ? '#b3261e' : 'var(--text)' }}>
                {x.intervall_tage ? '↻ ' : ''}{x.titel} <span style={{ color: x.faellig < heute ? '#b3261e' : 'var(--muted)', fontSize: 13 }}>· {x.faellig < heute ? 'überfällig seit ' : 'fällig '}{kurz(x.faellig)}</span>
              </div>
            ))}
          </>
        )}
        <div style={{ marginTop: 10 }}><Link href={href('aufgaben')} style={link}>Alle Aufgaben und Projekte →</Link></div>
      </div>

      <Link href={href('karte')} style={{ ...card, display: 'block', textDecoration: 'none', color: 'var(--text)' }}>
        <h3 style={h3}>🗺️ Karte des Hauses</h3>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>Grundrisse mit allen Räumen, Raumseiten mit Problemen, Projekten und Entscheidungen →</span>
      </Link>
    </div>
  )
}
