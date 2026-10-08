import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'

// Interner Bereich einer Gemeinschaft (nur freigeschaltet, siehe Tabelle kommune_intern).
//  Bewohner: Kalender, Karte (Grundrisse mit Markierungen), Aufgaben und Projekte
//  Gast:     nur Termine, die für Gäste oder öffentlich freigegeben sind
const VIS = [
  { value: 'bewohner', label: 'Nur Bewohner' },
  { value: 'gast', label: 'Bewohner und Gäste' },
  { value: 'oeffentlich', label: 'Öffentlich' },
]
const VIS_STYLE = {
  bewohner: { bg: '#D6E6DB', fg: '#16402D', tag: 'B' },
  gast: { bg: '#D4E2F2', fg: '#143A60', tag: 'G' },
  oeffentlich: { bg: '#F4E0B3', fg: '#5E3F06', tag: 'Ö' },
}
const STATUS = [
  { value: 'offen', label: 'Offen', next: 'Starten' },
  { value: 'arbeit', label: 'In Arbeit', next: 'Als erledigt markieren' },
  { value: 'fertig', label: 'Erledigt', next: 'Wieder öffnen' },
]
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }

function pad(n) { return String(n).padStart(2, '0') }
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function Intern() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pid = typeof router.query.id === 'string' ? router.query.id : null
  const [name, setName] = useState('')
  const [state, setState] = useState('lade') // lade | nein | ok
  const [bewohner, setBewohner] = useState(false)
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('kalender')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  useEffect(() => {
    if (!user || !pid) return
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('name,owner_id').eq('id', pid).eq('typ', 'kommune').maybeSingle()
      const { data: flag } = await supabase.from('kommune_intern').select('aktiv').eq('kommune_id', pid).maybeSingle()
      if (!p || !flag?.aktiv) { setState('nein'); return }
      setName(p.name || '')
      const { data: list } = await supabase.rpc('kommune_members_roles', { p_kommune: pid })
      setMembers(list || [])
      const isB = p.owner_id === user.id || (list || []).some(m => m.user_id === user.id && m.rolle === 'bewohner')
      setBewohner(isB)
      setState('ok')
    })()
  }, [user, pid])

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  const tabs = bewohner ? [['kalender', 'Kalender'], ['karte', 'Karte'], ['aufgaben', 'Aufgaben & Projekte']] : [['kalender', 'Kalender']]
  const tabStyle = on => ({ ...btn, background: on ? 'var(--text)' : 'var(--card)', color: on ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 16px' })

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container} style={{ maxWidth: 980 }}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>Interner Bereich{name ? ` – ${name}` : ''}</h1>
        </div>

        {state === 'lade' && <p style={{ color: 'var(--muted)' }}>Lädt…</p>}
        {state === 'nein' && <p style={{ color: 'var(--muted)' }}>Dieser Bereich ist für diese Gemeinschaft nicht freigeschaltet, oder du hast keinen Zugriff.</p>}

        {state === 'ok' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {tabs.map(([v, l]) => <button key={v} type="button" onClick={() => setTab(v)} aria-pressed={tab === v} style={tabStyle(tab === v)}>{l}</button>)}
            </div>
            {msg && <p style={{ color: '#b3261e', fontSize: 13 }}>{msg}</p>}
            {tab === 'kalender' && <Kalender pid={pid} bewohner={bewohner} setMsg={setMsg}/>}
            {tab === 'karte' && bewohner && <Karte pid={pid} setMsg={setMsg}/>}
            {tab === 'aufgaben' && bewohner && <Aufgaben pid={pid} user={user} members={members} setMsg={setMsg}/>}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Kalender
function Kalender({ pid, bewohner, setMsg }) {
  const [monat, setMonat] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [termine, setTermine] = useState([])
  const [filter, setFilter] = useState('alle')
  const [neu, setNeu] = useState(false)
  const [f, setF] = useState({ titel: '', datum: '', von: '', bis: '', ort: '', beschreibung: '', sichtbarkeit: 'bewohner' })

  async function load() {
    const von = monat.toISOString()
    const bis = new Date(monat.getFullYear(), monat.getMonth() + 1, 1).toISOString()
    const { data, error } = await supabase.from('kommune_termine').select('*').eq('kommune_id', pid).gte('beginn', von).lt('beginn', bis).order('beginn')
    if (error) { setMsg(error.message); return }
    setTermine(data || [])
  }
  useEffect(() => { load() }, [pid, monat])

  async function speichern(e) {
    e.preventDefault()
    if (!f.titel.trim() || !f.datum) return
    const beginn = new Date(`${f.datum}T${f.von || '00:00'}`).toISOString()
    const ende = f.bis ? new Date(`${f.datum}T${f.bis}`).toISOString() : null
    const { error } = await supabase.from('kommune_termine').insert({ kommune_id: pid, titel: f.titel.trim(), beschreibung: f.beschreibung.trim() || null, beginn, ende, ort: f.ort.trim() || null, sichtbarkeit: f.sichtbarkeit })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setF({ titel: '', datum: '', von: '', bis: '', ort: '', beschreibung: '', sichtbarkeit: 'bewohner' })
    setNeu(false)
    load()
  }

  async function loeschen(id) {
    const { error } = await supabase.from('kommune_termine').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setTermine(t => t.filter(x => x.id !== id))
  }

  const sichtbar = termine.filter(t => filter === 'alle' || t.sichtbarkeit === filter)
  const zellen = useMemo(() => {
    const lead = (monat.getDay() + 6) % 7
    const tage = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate()
    const total = Math.ceil((lead + tage) / 7) * 7
    return Array.from({ length: total }, (_, i) => { const d = i - lead + 1; return d >= 1 && d <= tage ? new Date(monat.getFullYear(), monat.getMonth(), d) : null })
  }, [monat])
  const nachTag = {}
  sichtbar.forEach(t => { const k = dayKey(new Date(t.beginn)); (nachTag[k] = nachTag[k] || []).push(t) })
  const heute = dayKey(new Date())
  const zeit = t => new Date(t.beginn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const chip = v => ({ display: 'block', padding: '2px 6px', borderRadius: 6, fontSize: 12, marginTop: 3, background: VIS_STYLE[v].bg, color: VIS_STYLE[v].fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" style={btnLight} aria-label="Vorheriger Monat" onClick={() => setMonat(new Date(monat.getFullYear(), monat.getMonth() - 1, 1))}>‹</button>
          <strong style={{ minWidth: 150, textAlign: 'center' }}>{MONATE[monat.getMonth()]} {monat.getFullYear()}</strong>
          <button type="button" style={btnLight} aria-label="Nächster Monat" onClick={() => setMonat(new Date(monat.getFullYear(), monat.getMonth() + 1, 1))}>›</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Sichtbarkeit filtern" style={{ ...input, width: 'auto' }}>
            <option value="alle">Alle Termine</option>
            {VIS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          {bewohner && <button type="button" style={btn} onClick={() => setNeu(n => !n)}>{neu ? 'Abbrechen' : '+ Termin'}</button>}
        </div>
      </div>

      {neu && bewohner && (
        <form onSubmit={speichern} style={{ ...card, display: 'grid', gap: 10 }}>
          <div><label style={label}>Titel</label><input style={input} required value={f.titel} onChange={e => setF({ ...f, titel: e.target.value })}/></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div><label style={label}>Datum</label><input style={input} type="date" required value={f.datum} onChange={e => setF({ ...f, datum: e.target.value })}/></div>
            <div><label style={label}>Von</label><input style={input} type="time" value={f.von} onChange={e => setF({ ...f, von: e.target.value })}/></div>
            <div><label style={label}>Bis</label><input style={input} type="time" value={f.bis} onChange={e => setF({ ...f, bis: e.target.value })}/></div>
          </div>
          <div><label style={label}>Ort</label><input style={input} value={f.ort} onChange={e => setF({ ...f, ort: e.target.value })}/></div>
          <div><label style={label}>Beschreibung</label><textarea style={{ ...input, minHeight: 70 }} value={f.beschreibung} onChange={e => setF({ ...f, beschreibung: e.target.value })}/></div>
          <div>
            <label style={label}>Wer sieht den Termin?</label>
            <select style={input} value={f.sichtbarkeit} onChange={e => setF({ ...f, sichtbarkeit: e.target.value })}>
              {VIS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            {f.sichtbarkeit === 'oeffentlich' && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>Öffentlich heißt: alle, die diese Gemeinschaft sehen können, sehen den Termin. Bei einer versteckten Gemeinschaft sind das nur eingeladene Personen.</p>}
          </div>
          <div><button type="submit" style={btn}>Termin speichern</button></div>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 4 }}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d} style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: '2px 4px' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {zellen.map((d, i) => (
              <div key={i} style={{ minHeight: 84, borderRadius: 8, padding: 4, background: d ? 'var(--card)' : 'transparent', border: d && dayKey(d) === heute ? '2px solid var(--g)' : '1px solid transparent', boxSizing: 'border-box' }}>
                {d && <div style={{ fontSize: 13, fontWeight: dayKey(d) === heute ? 700 : 500 }}>{d.getDate()}</div>}
                {d && (nachTag[dayKey(d)] || []).map(t => <span key={t.id} style={chip(t.sichtbarkeit)} title={t.titel}><b>{VIS_STYLE[t.sichtbarkeit].tag}</b> {zeit(t)} {t.titel}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, margin: '14px 0', alignItems: 'center' }}>
        <strong>Wer sieht den Termin?</strong>
        {VIS.map(v => <span key={v.value}><span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontWeight: 600, background: VIS_STYLE[v.value].bg, color: VIS_STYLE[v.value].fg }}>{VIS_STYLE[v.value].tag}</span> {v.label}</span>)}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>Termine im {MONATE[monat.getMonth()]} ({sichtbar.length})</div>
      {sichtbar.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Keine Termine in diesem Monat.</p>}
      {sichtbar.map(t => (
        <div key={t.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{t.titel}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{new Date(t.beginn).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long' })} · {zeit(t)} Uhr{t.ort ? ' · ' + t.ort : ''}</div>
            {t.beschreibung && <div style={{ fontSize: 13, marginTop: 4 }}>{t.beschreibung}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: VIS_STYLE[t.sichtbarkeit].bg, color: VIS_STYLE[t.sichtbarkeit].fg }}>{VIS.find(v => v.value === t.sichtbarkeit)?.label}</span>
            {bewohner && <button type="button" onClick={() => loeschen(t.id)} aria-label="Termin löschen" style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Karte
function Karte({ pid, setMsg }) {
  const [karten, setKarten] = useState([])
  const [urls, setUrls] = useState({})
  const [aktiv, setAktiv] = useState(null)
  const [orte, setOrte] = useState([])
  const [sel, setSel] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [setzen, setSetzen] = useState(false)
  const [pin, setPin] = useState(null)
  const [pf, setPf] = useState({ titel: '', beschreibung: '' })
  const [up, setUp] = useState({ titel: '', datei: null, busy: false })

  async function loadKarten(waehle) {
    const { data, error } = await supabase.from('kommune_karten').select('*').eq('kommune_id', pid).order('sort').order('created_at')
    if (error) { setMsg(error.message); return }
    setKarten(data || [])
    const pfade = (data || []).map(k => k.bild_pfad).filter(Boolean)
    if (pfade.length) {
      const { data: signed } = await supabase.storage.from('kommune-karten').createSignedUrls(pfade, 3600)
      const m = {}
      ;(signed || []).forEach(s => { if (s.signedUrl) m[s.path] = s.signedUrl })
      setUrls(m)
    }
    setAktiv(cur => waehle || (data || []).find(k => k.id === cur)?.id || data?.[0]?.id || null)
  }
  useEffect(() => { loadKarten() }, [pid])

  async function loadOrte(kid) {
    if (!kid) { setOrte([]); return }
    const { data, error } = await supabase.from('kommune_orte').select('*').eq('karte_id', kid).order('created_at')
    if (error) { setMsg(error.message); return }
    setOrte(data || [])
  }
  useEffect(() => { loadOrte(aktiv); setSel(null); setPin(null); setSetzen(false) }, [aktiv])

  async function hochladen(e) {
    e.preventDefault()
    if (!up.datei || !up.titel.trim()) return
    setUp(u => ({ ...u, busy: true }))
    const ext = (up.datei.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const pfad = `${pid}/${crypto.randomUUID()}.${ext}`
    const { error: e1 } = await supabase.storage.from('kommune-karten').upload(pfad, up.datei, { contentType: up.datei.type || undefined })
    if (e1) { setMsg('Hochladen fehlgeschlagen: ' + e1.message); setUp(u => ({ ...u, busy: false })); return }
    const { data, error: e2 } = await supabase.from('kommune_karten').insert({ kommune_id: pid, titel: up.titel.trim(), bild_pfad: pfad, sort: karten.length }).select().single()
    if (e2) { setMsg('Speichern fehlgeschlagen: ' + e2.message); setUp(u => ({ ...u, busy: false })); return }
    setMsg('')
    setUp({ titel: '', datei: null, busy: false })
    loadKarten(data.id)
  }

  async function karteLoeschen(k) {
    if (!window.confirm(`Karte "${k.titel}" mit allen Markierungen löschen?`)) return
    if (k.bild_pfad) await supabase.storage.from('kommune-karten').remove([k.bild_pfad])
    const { error } = await supabase.from('kommune_karten').delete().eq('id', k.id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setAktiv(null)
    loadKarten()
  }

  function klick(e) {
    if (!setzen) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10
    setPin({ x, y })
    setSel(null)
  }

  async function pinSpeichern(e) {
    e.preventDefault()
    if (!pin || !pf.titel.trim()) return
    const { error } = await supabase.from('kommune_orte').insert({ karte_id: aktiv, kommune_id: pid, titel: pf.titel.trim(), beschreibung: pf.beschreibung.trim() || null, x: pin.x, y: pin.y })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setPin(null); setSetzen(false); setPf({ titel: '', beschreibung: '' })
    loadOrte(aktiv)
  }

  async function ortLoeschen(id) {
    const { error } = await supabase.from('kommune_orte').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setSel(null)
    setOrte(o => o.filter(x => x.id !== id))
  }

  const k = karten.find(x => x.id === aktiv)
  const bild = k?.bild_pfad ? urls[k.bild_pfad] : null
  const gewaehlt = orte.find(o => o.id === sel)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {karten.map(x => <button key={x.id} type="button" onClick={() => setAktiv(x.id)} aria-pressed={aktiv === x.id} style={{ ...btn, background: aktiv === x.id ? 'var(--text)' : 'var(--card)', color: aktiv === x.id ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999 }}>{x.titel}</button>)}
        {karten.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>Noch keine Karte. Lade unten einen Grundriss hoch.</span>}
      </div>

      {k && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: '3 1 480px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              <button type="button" style={btnLight} onClick={() => setZoom(z => Math.max(100, z - 50))} aria-label="Verkleinern">−</button>
              <span style={{ fontSize: 13, minWidth: 44, textAlign: 'center' }}>{zoom}%</span>
              <button type="button" style={btnLight} onClick={() => setZoom(z => Math.min(400, z + 50))} aria-label="Vergrößern">+</button>
              <button type="button" style={setzen ? btn : btnLight} onClick={() => { setSetzen(s => !s); setPin(null) }}>{setzen ? 'Abbrechen' : '+ Markierung setzen'}</button>
              <button type="button" style={{ ...btnLight, marginLeft: 'auto' }} onClick={() => karteLoeschen(k)}>Karte löschen</button>
            </div>
            {setzen && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Tippe auf die Stelle im Plan, an die die Markierung soll.</p>}
            <div style={{ overflow: 'auto', maxHeight: '75vh', border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
              <div style={{ position: 'relative', width: `${zoom}%`, cursor: setzen ? 'crosshair' : 'default' }} onClick={klick}>
                {bild ? <img src={bild} alt={k.titel} style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }} draggable={false}/> : <div style={{ padding: 40, color: 'var(--muted)' }}>Bild wird geladen…</div>}
                {orte.map((o, i) => (
                  <button key={o.id} type="button" aria-label={o.titel} onClick={ev => { ev.stopPropagation(); setSel(o.id); setPin(null); setSetzen(false) }}
                    style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: '50%', border: sel === o.id ? '3px solid #17251D' : '2px solid #fff', background: '#2F5D46', color: '#fff', fontWeight: 700, fontSize: 13, padding: 0, cursor: 'pointer' }}>{i + 1}</button>
                ))}
                {pin && <span style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)', width: 26, height: 26, borderRadius: '50%', background: '#B7791F', border: '3px solid #fff' }}/>}
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            {pin && (
              <form onSubmit={pinSpeichern} style={{ ...card, display: 'grid', gap: 10 }}>
                <strong>Neue Markierung</strong>
                <div><label style={label}>Name (z. B. Raum IX, Öltankkeller)</label><input style={input} required autoFocus value={pf.titel} onChange={e => setPf({ ...pf, titel: e.target.value })}/></div>
                <div><label style={label}>Notiz</label><textarea style={{ ...input, minHeight: 70 }} value={pf.beschreibung} onChange={e => setPf({ ...pf, beschreibung: e.target.value })}/></div>
                <div><button type="submit" style={btn}>Speichern</button></div>
              </form>
            )}
            {gewaehlt && !pin && (
              <div style={card}>
                <strong>{gewaehlt.titel}</strong>
                {gewaehlt.beschreibung && <p style={{ margin: '6px 0 10px', fontSize: 14 }}>{gewaehlt.beschreibung}</p>}
                <button type="button" style={btnLight} onClick={() => ortLoeschen(gewaehlt.id)}>Markierung löschen</button>
              </div>
            )}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Markierungen ({orte.length})</div>
              {orte.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Noch keine.</span>}
              {orte.map((o, i) => <button key={o.id} type="button" onClick={() => { setSel(o.id); setPin(null) }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: sel === o.id ? 'var(--bg)' : 'none', color: 'var(--text)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 14, minHeight: 36 }}>{i + 1} · {o.titel}</button>)}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={hochladen} style={{ ...card, marginTop: 20, display: 'grid', gap: 10, maxWidth: 520 }}>
        <strong>Neue Karte hochladen</strong>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Grundriss oder Lageplan als Bild (PNG oder JPG). Nur Bewohner sehen die Karten.</p>
        <div><label style={label}>Titel (z. B. Erdgeschoss)</label><input style={input} required value={up.titel} onChange={e => setUp({ ...up, titel: e.target.value })}/></div>
        <div><label style={label}>Bilddatei</label><input type="file" accept="image/png,image/jpeg,image/webp" required onChange={e => setUp({ ...up, datei: e.target.files?.[0] || null })}/></div>
        <div><button type="submit" style={btn} disabled={up.busy}>{up.busy ? 'Lädt hoch…' : 'Hochladen'}</button></div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------- Aufgaben & Projekte
function Aufgaben({ pid, user, members, setMsg }) {
  const [projekte, setProjekte] = useState([])
  const [aufgaben, setAufgaben] = useState([])
  const [pf, setPf] = useState('alle')
  const [neuProjekt, setNeuProjekt] = useState('')
  const [f, setF] = useState({ titel: '', projekt_id: '', zustaendig: '', faellig: '' })

  async function load() {
    const [p, a] = await Promise.all([
      supabase.from('kommune_projekte').select('*').eq('kommune_id', pid).order('created_at'),
      supabase.from('kommune_aufgaben').select('*').eq('kommune_id', pid).order('created_at'),
    ])
    if (p.error || a.error) { setMsg((p.error || a.error).message); return }
    setProjekte(p.data || [])
    setAufgaben(a.data || [])
  }
  useEffect(() => { load() }, [pid])

  const personen = [{ user_id: user.id, name: 'Ich' }, ...members.filter(m => m.rolle === 'bewohner' && m.user_id !== user.id)]
  const wer = id => id === user.id ? 'Ich' : (members.find(m => m.user_id === id)?.name || (id ? 'Bewohner' : 'frei'))
  const projektName = id => projekte.find(p => p.id === id)?.titel || 'Ohne Projekt'

  async function projektAnlegen(e) {
    e.preventDefault()
    if (!neuProjekt.trim()) return
    const { error } = await supabase.from('kommune_projekte').insert({ kommune_id: pid, titel: neuProjekt.trim() })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNeuProjekt('')
    load()
  }

  async function aufgabeAnlegen(e) {
    e.preventDefault()
    if (!f.titel.trim()) return
    const { error } = await supabase.from('kommune_aufgaben').insert({ kommune_id: pid, titel: f.titel.trim(), projekt_id: f.projekt_id || null, zustaendig: f.zustaendig || null, faellig: f.faellig || null })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setF({ titel: '', projekt_id: f.projekt_id, zustaendig: '', faellig: '' })
    load()
  }

  async function aendern(a, patch) {
    const { error } = await supabase.from('kommune_aufgaben').update(patch).eq('id', a.id)
    if (error) { setMsg('Ändern fehlgeschlagen: ' + error.message); return }
    setAufgaben(list => list.map(x => x.id === a.id ? { ...x, ...patch } : x))
  }

  async function aufgabeLoeschen(id) {
    const { error } = await supabase.from('kommune_aufgaben').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setAufgaben(list => list.filter(x => x.id !== id))
  }

  const sicht = aufgaben.filter(a => pf === 'alle' || (pf === 'ohne' ? !a.projekt_id : a.projekt_id === pf))
  const pill = on => ({ ...btn, background: on ? 'var(--text)' : 'var(--card)', color: on ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999 })

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>Aufgaben werden übernommen, nicht zugeteilt. Wer eine übernimmt, trägt sich selbst ein.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" style={pill(pf === 'alle')} onClick={() => setPf('alle')}>Alle Projekte</button>
        {projekte.map(p => <button key={p.id} type="button" style={pill(pf === p.id)} onClick={() => setPf(p.id)}>{p.titel}</button>)}
        <button type="button" style={pill(pf === 'ohne')} onClick={() => setPf('ohne')}>Ohne Projekt</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <form onSubmit={projektAnlegen} style={{ ...card, flex: '1 1 260px', margin: 0, display: 'grid', gap: 8 }}>
          <strong>Neues Projekt</strong>
          <input style={input} placeholder="z. B. Dach Scheune" value={neuProjekt} onChange={e => setNeuProjekt(e.target.value)}/>
          <div><button type="submit" style={btn}>Projekt anlegen</button></div>
        </form>
        <form onSubmit={aufgabeAnlegen} style={{ ...card, flex: '2 1 380px', margin: 0, display: 'grid', gap: 8 }}>
          <strong>Neue Aufgabe</strong>
          <input style={input} required placeholder="Was ist zu tun?" value={f.titel} onChange={e => setF({ ...f, titel: e.target.value })}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <select style={input} value={f.projekt_id} onChange={e => setF({ ...f, projekt_id: e.target.value })} aria-label="Projekt"><option value="">Ohne Projekt</option>{projekte.map(p => <option key={p.id} value={p.id}>{p.titel}</option>)}</select>
            <select style={input} value={f.zustaendig} onChange={e => setF({ ...f, zustaendig: e.target.value })} aria-label="Wer macht es"><option value="">Noch frei</option>{personen.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            <input style={input} type="date" value={f.faellig} onChange={e => setF({ ...f, faellig: e.target.value })} aria-label="Fällig am"/>
          </div>
          <div><button type="submit" style={btn}>Aufgabe anlegen</button></div>
        </form>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        {STATUS.map((s, si) => {
          const liste = sicht.filter(a => a.status === s.value)
          return (
            <div key={s.value} style={{ flex: '1 1 260px', minWidth: 0, background: 'var(--card)', borderRadius: 12, padding: 12, boxSizing: 'border-box' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.label} · {liste.length}</div>
              {liste.map(a => (
                <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{a.titel}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 8px' }}>{projektName(a.projekt_id)} · {wer(a.zustaendig)}{a.faellig ? ' · fällig ' + new Date(a.faellig).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : ''}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!a.zustaendig && <button type="button" style={btnLight} onClick={() => aendern(a, { zustaendig: user.id })}>Übernehmen</button>}
                    <button type="button" style={btnLight} onClick={() => aendern(a, { status: STATUS[(si + 1) % 3].value })}>{s.next}</button>
                    <button type="button" aria-label="Aufgabe löschen" onClick={() => aufgabeLoeschen(a.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
