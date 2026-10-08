import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import Dokumente from '../../components/Dokumente'
import styles from '../../styles/ProfilBearbeiten.module.css'

// Eigene Seite pro Raum im Internen Bereich: Maße, Probleme, Notizen, Projekte, Aufgaben und Entscheidungen.
// Nur für Bewohner einer freigeschalteten Gemeinschaft.
const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }
const h2 = { fontSize: 17, margin: '0 0 10px' }
const INTERVALLE = [[0, 'Einmalig'], [7, 'Wöchentlich'], [14, 'Alle 2 Wochen'], [30, 'Monatlich'], [90, 'Vierteljährlich'], [365, 'Jährlich']]

const pad = n => String(n).padStart(2, '0')
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const kurzDatum = s => new Date(s + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
const zahl = v => v === '' || v == null ? null : Number(String(v).replace(',', '.'))

export default function Raum() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const oid = typeof router.query.id === 'string' ? router.query.id : null
  const [state, setState] = useState('lade')
  const [ort, setOrt] = useState(null)
  const [karte, setKarte] = useState(null)
  const [kommune, setKommune] = useState({ id: null, name: '' })
  const [members, setMembers] = useState([])
  const [projekte, setProjekte] = useState([])
  const [aufgaben, setAufgaben] = useState([])
  const [entsch, setEntsch] = useState([])
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ flaeche_m2: '', hoehe_m: '', beschreibung: '', probleme: '', notizen: '' })
  const [np, setNp] = useState({ titel: '', laufend: false })
  const [na, setNa] = useState({ titel: '', projekt_id: '', intervall: 0, faellig: '' })
  const [ne, setNe] = useState({ titel: '', text: '' })
  const heute = dayKey(new Date())

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  async function ladeAlles(pid) {
    const [p, a, e] = await Promise.all([
      supabase.from('kommune_projekte').select('*').eq('ort_id', oid).order('created_at'),
      supabase.from('kommune_aufgaben').select('*').eq('ort_id', oid).order('created_at'),
      supabase.from('kommune_entscheidungen').select('*').eq('ort_id', oid).order('entschieden_am', { ascending: false }).order('created_at', { ascending: false }),
    ])
    if (p.error || a.error || e.error) { setMsg((p.error || a.error || e.error).message); return }
    setProjekte(p.data || []); setAufgaben(a.data || []); setEntsch(e.data || [])
  }

  useEffect(() => {
    if (!user || !oid) return
    ;(async () => {
      const { data: o } = await supabase.from('kommune_orte').select('*').eq('id', oid).maybeSingle()
      if (!o) { setState('nein'); return }
      const [{ data: p }, { data: flag }, { data: k }] = await Promise.all([
        supabase.from('profiles').select('name,owner_id').eq('id', o.kommune_id).eq('typ', 'kommune').maybeSingle(),
        supabase.from('kommune_intern').select('aktiv').eq('kommune_id', o.kommune_id).maybeSingle(),
        supabase.from('kommune_karten').select('titel').eq('id', o.karte_id).maybeSingle(),
      ])
      const { data: list } = await supabase.rpc('kommune_members_roles', { p_kommune: o.kommune_id })
      const isB = p && (p.owner_id === user.id || (list || []).some(m => m.user_id === user.id && m.rolle === 'bewohner'))
      if (!p || !flag?.aktiv || !isB) { setState('nein'); return }
      setOrt(o); setKarte(k); setKommune({ id: o.kommune_id, name: p.name || '' }); setMembers(list || [])
      setForm({ flaeche_m2: o.flaeche_m2 ?? '', hoehe_m: o.hoehe_m ?? '', beschreibung: o.beschreibung || '', probleme: o.probleme || '', notizen: o.notizen || '' })
      setState('ok')
      ladeAlles(o.kommune_id)
    })()
  }, [user, oid])

  async function stammSpeichern(e) {
    e.preventDefault()
    const patch = { flaeche_m2: zahl(form.flaeche_m2), hoehe_m: zahl(form.hoehe_m), beschreibung: form.beschreibung.trim() || null, probleme: form.probleme.trim() || null, notizen: form.notizen.trim() || null }
    if ((patch.flaeche_m2 != null && isNaN(patch.flaeche_m2)) || (patch.hoehe_m != null && isNaN(patch.hoehe_m))) { setMsg('Größe und Höhe bitte als Zahl eintragen.'); return }
    const { error } = await supabase.from('kommune_orte').update(patch).eq('id', oid)
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg(''); setOrt(o => ({ ...o, ...patch })); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function projektAnlegen(e) {
    e.preventDefault()
    if (!np.titel.trim()) return
    const { error } = await supabase.from('kommune_projekte').insert({ kommune_id: kommune.id, ort_id: oid, titel: np.titel.trim(), laufend: np.laufend })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNp({ titel: '', laufend: false }); ladeAlles()
  }
  async function projektLoeschen(p) {
    if (!window.confirm(`Projekt "${p.titel}" löschen? Seine Aufgaben bleiben ohne Projekt erhalten.`)) return
    const { error } = await supabase.from('kommune_projekte').delete().eq('id', p.id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    ladeAlles()
  }

  async function aufgabeAnlegen(e) {
    e.preventDefault()
    if (!na.titel.trim()) return
    const iv = Number(na.intervall) || null
    const faellig = na.faellig || (iv ? dayKey(addDays(new Date(), iv)) : null)
    const { error } = await supabase.from('kommune_aufgaben').insert({ kommune_id: kommune.id, ort_id: oid, titel: na.titel.trim(), projekt_id: na.projekt_id || null, intervall_tage: iv, faellig })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNa({ titel: '', projekt_id: na.projekt_id, intervall: 0, faellig: '' }); ladeAlles()
  }
  async function aendern(a, patch) {
    const { error } = await supabase.from('kommune_aufgaben').update(patch).eq('id', a.id)
    if (error) { setMsg('Ändern fehlgeschlagen: ' + error.message); return }
    setAufgaben(l => l.map(x => x.id === a.id ? { ...x, ...patch } : x))
  }
  const erledigt = a => a.intervall_tage
    ? aendern(a, { status: 'offen', zustaendig: null, zuletzt_erledigt: heute, faellig: dayKey(addDays(new Date(), a.intervall_tage)) })
    : aendern(a, { status: 'fertig' })
  async function aufgabeLoeschen(id) {
    const { error } = await supabase.from('kommune_aufgaben').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setAufgaben(l => l.filter(x => x.id !== id))
  }

  async function entschAnlegen(e) {
    e.preventDefault()
    if (!ne.titel.trim()) return
    const { error } = await supabase.from('kommune_entscheidungen').insert({ kommune_id: kommune.id, ort_id: oid, titel: ne.titel.trim(), text: ne.text.trim() || null })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNe({ titel: '', text: '' }); ladeAlles()
  }
  async function entschLoeschen(id) {
    if (!window.confirm('Diese Entscheidung löschen?')) return
    const { error } = await supabase.from('kommune_entscheidungen').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setEntsch(l => l.filter(x => x.id !== id))
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  const wer = id => id === user.id ? 'Ich' : (members.find(m => m.user_id === id)?.name || (id ? 'Bewohner' : 'frei'))
  const projektName = id => projekte.find(p => p.id === id)?.titel
  const offene = aufgaben.filter(a => a.status !== 'fertig').sort((a, b) => (a.faellig || '9999') < (b.faellig || '9999') ? -1 : 1)
  const fertige = aufgaben.filter(a => a.status === 'fertig')

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container} style={{ maxWidth: 860 }}>
        <div className={styles.header}>
          {kommune.id
            ? (ort?.karte_id
              ? <Link href={`/profil/intern?id=${kommune.id}&tab=karte&ort=${oid}`} className={styles.back}>← Zurück zur Karte</Link>
              : <Link href={`/profil/intern?id=${kommune.id}&tab=raeume`} className={styles.back}>← Zurück zu den Räumen</Link>)
            : <Link href="/profil" className={styles.back}>← Profil</Link>}
          <h1 className={styles.title}>{ort ? ort.titel : 'Raum'}</h1>
        </div>

        {state === 'lade' && <p style={{ color: 'var(--muted)' }}>Lädt…</p>}
        {state === 'nein' && <p style={{ color: 'var(--muted)' }}>Diese Seite gibt es nicht, oder du hast keinen Zugriff. Sie ist nur für Bewohner einer freigeschalteten Gemeinschaft.</p>}

        {state === 'ok' && (
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>{kommune.name}{karte?.titel ? ` · ${karte.titel}` : ''}</p>
            {msg && <p style={{ color: '#b3261e', fontSize: 13 }}>{msg}</p>}

            <form onSubmit={stammSpeichern} style={{ ...card, display: 'grid', gap: 10 }}>
              <h2 style={h2}>Raumdaten</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div><label style={label}>Größe in m²</label><input style={input} inputMode="decimal" value={form.flaeche_m2} onChange={e => setForm({ ...form, flaeche_m2: e.target.value })} placeholder="z. B. 18,5"/></div>
                <div><label style={label}>Raumhöhe in m</label><input style={input} inputMode="decimal" value={form.hoehe_m} onChange={e => setForm({ ...form, hoehe_m: e.target.value })} placeholder="z. B. 2,6"/></div>
              </div>
              <div><label style={label}>Beschreibung</label><textarea style={{ ...input, minHeight: 60 }} value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })}/></div>
              <div><label style={label}>Probleme (z. B. Feuchte, Risse, Schimmel)</label><textarea style={{ ...input, minHeight: 70 }} value={form.probleme} onChange={e => setForm({ ...form, probleme: e.target.value })}/></div>
              <div><label style={label}>Notizen</label><textarea style={{ ...input, minHeight: 70 }} value={form.notizen} onChange={e => setForm({ ...form, notizen: e.target.value })}/></div>
              <div><button type="submit" style={btn}>{saved ? 'Gespeichert' : 'Speichern'}</button></div>
            </form>

            <div style={card}>
              <h2 style={h2}>Projekte in diesem Raum ({projekte.length})</h2>
              {projekte.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Noch keine.</p>}
              {projekte.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span><strong>{p.titel}</strong>{p.laufend ? ' ↻ laufend' : ''} <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {aufgaben.filter(a => a.projekt_id === p.id && a.status !== 'fertig').length} offene Aufgaben</span></span>
                  <button type="button" aria-label="Projekt löschen" onClick={() => projektLoeschen(p)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, minHeight: 36, minWidth: 36 }}>×</button>
                </div>
              ))}
              <form onSubmit={projektAnlegen} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                <input style={{ ...input, flex: '1 1 220px', width: 'auto' }} placeholder="Neues Projekt, z. B. Wand trockenlegen" value={np.titel} onChange={e => setNp({ ...np, titel: e.target.value })}/>
                <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', minHeight: 36 }}><input type="checkbox" checked={np.laufend} onChange={e => setNp({ ...np, laufend: e.target.checked })}/> laufend</label>
                <button type="submit" style={btn}>Anlegen</button>
              </form>
            </div>

            <div style={card}>
              <h2 style={h2}>Aufgaben in diesem Raum ({offene.length} offen)</h2>
              {offene.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Keine offenen Aufgaben.</p>}
              {offene.map(a => {
                const ue = a.faellig && a.faellig < heute
                return (
                  <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{a.intervall_tage ? '↻ ' : ''}{a.titel}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{[projektName(a.projekt_id), wer(a.zustaendig), a.status === 'arbeit' ? 'in Arbeit' : null].filter(Boolean).join(' · ')}</div>
                    {a.faellig && <div style={{ fontSize: 13, color: ue ? '#b3261e' : 'var(--muted)', fontWeight: ue ? 600 : 400 }}>{ue ? 'Überfällig seit ' : 'Fällig '}{kurzDatum(a.faellig)}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {!a.zustaendig && <button type="button" style={btnLight} onClick={() => aendern(a, { zustaendig: user.id })}>Übernehmen</button>}
                      {a.status === 'offen' && <button type="button" style={btnLight} onClick={() => aendern(a, { status: 'arbeit' })}>Starten</button>}
                      <button type="button" style={btnLight} onClick={() => erledigt(a)}>{a.intervall_tage ? 'Erledigt, kommt wieder' : 'Erledigt'}</button>
                      <button type="button" aria-label="Aufgabe löschen" onClick={() => aufgabeLoeschen(a.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, minHeight: 36, minWidth: 36 }}>×</button>
                    </div>
                  </div>
                )
              })}
              {fertige.length > 0 && <details style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}><summary style={{ cursor: 'pointer' }}>{fertige.length} erledigt</summary>{fertige.map(a => <div key={a.id} style={{ padding: '4px 0' }}>✓ {a.titel}</div>)}</details>}
              <form onSubmit={aufgabeAnlegen} style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <input style={input} required placeholder="Neue Aufgabe in diesem Raum" value={na.titel} onChange={e => setNa({ ...na, titel: e.target.value })}/>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                  <select style={input} value={na.projekt_id} onChange={e => setNa({ ...na, projekt_id: e.target.value })} aria-label="Projekt"><option value="">Ohne Projekt</option>{projekte.map(p => <option key={p.id} value={p.id}>{p.titel}</option>)}</select>
                  <select style={input} value={na.intervall} onChange={e => setNa({ ...na, intervall: e.target.value })} aria-label="Wiederholung">{INTERVALLE.map(i => <option key={i[0]} value={i[0]}>{i[1]}</option>)}</select>
                  <input style={input} type="date" value={na.faellig} onChange={e => setNa({ ...na, faellig: e.target.value })} aria-label="Fällig am"/>
                </div>
                <div><button type="submit" style={btn}>Aufgabe anlegen</button></div>
              </form>
            </div>

            <div style={card}>
              <h2 style={h2}>Dokumente</h2>
              <Dokumente pid={kommune.id} ortId={oid} setMsg={setMsg}/>
            </div>

            <div style={card}>
              <h2 style={h2}>Entscheidungen ({entsch.length})</h2>
              {entsch.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Noch keine. Halte hier fest, was für diesen Raum beschlossen wurde, damit es nicht in E-Mails verschwindet.</p>}
              {entsch.map(x => (
                <div key={x.id} style={{ borderLeft: '4px solid var(--g)', padding: '4px 0 4px 10px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{x.titel}</strong>
                    <button type="button" aria-label="Entscheidung löschen" onClick={() => entschLoeschen(x.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, minHeight: 32, minWidth: 32 }}>×</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{kurzDatum(x.entschieden_am)}{x.erstellt_von ? ` · eingetragen von ${wer(x.erstellt_von)}` : ''}</div>
                  {x.text && <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{x.text}</div>}
                </div>
              ))}
              <form onSubmit={entschAnlegen} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <input style={input} required placeholder="Was wurde entschieden?" value={ne.titel} onChange={e => setNe({ ...ne, titel: e.target.value })}/>
                <textarea style={{ ...input, minHeight: 60 }} placeholder="Begründung, Beteiligte, Kosten (optional)" value={ne.text} onChange={e => setNe({ ...ne, text: e.target.value })}/>
                <div><button type="submit" style={btn}>Entscheidung festhalten</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
