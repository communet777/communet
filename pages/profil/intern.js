import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import IcalPanel from '../../components/IcalPanel'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/ProfilBearbeiten.module.css'

// Interner Bereich einer Gemeinschaft (nur freigeschaltet, siehe Tabelle kommune_intern).
//  Bewohner: Kalender (Termine und Anwesenheit), Karte (Grundrisse mit Räumen), Aufgaben und Projekte
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
// Farben für Gruppen (z. B. Familien oder Haushalte), die im Anwesenheitskalender gemeinsam erscheinen
const PALETTE = [
  ['#C9E3D2', '#16402D'], ['#CADBF1', '#143A60'], ['#F2DCA6', '#5E3F06'], ['#EBCDE4', '#5A1F4E'],
  ['#F2CFC6', '#6B2415'], ['#C6E6EA', '#0E4A52'], ['#E2DFB8', '#4A4310'], ['#DCD0F2', '#3A2466'],
]
const STATUS = [
  { value: 'offen', label: 'Offen', next: 'Starten' },
  { value: 'arbeit', label: 'In Arbeit', next: 'Als erledigt markieren' },
  { value: 'fertig', label: 'Erledigt', next: 'Wieder öffnen' },
]
const INTERVALLE = [
  [0, 'Einmalig'], [1, 'Täglich'], [7, 'Wöchentlich'], [14, 'Alle 2 Wochen'], [30, 'Monatlich'], [90, 'Vierteljährlich'], [365, 'Jährlich'],
]
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Räume aus der Bachelorarbeit (Landhaus Arnaville), Position in Prozent auf dem zugeschnittenen Grundriss
const RAUM_VORLAGEN = {
  ug: { label: 'Untergeschoss', raeume: [
    { t: 'UG I · Untere Küche', x: 23, y: 70, b: 'Unteres Haus' },
    { t: 'UG II · Kaminzimmer', x: 47, y: 70, b: 'Unteres Haus' },
    { t: 'UG III · Eingangsbereich', x: 73, y: 79, b: 'Unteres Haus' },
    { t: 'UG IV · Treppenhaus', x: 71, y: 62, b: 'Unteres Haus' },
    { t: 'UG V · Flur', x: 47, y: 59, b: 'Unteres Haus' },
    { t: 'UG VI · Heizungskeller', x: 46, y: 44, b: '3. Haus' },
    { t: 'UG VII · Flur', x: 63, y: 44, b: '3. Haus, Pflaster am Boden' },
    { t: 'UG VIII · Öltankkeller', x: 75, y: 44, b: '3. Haus, Gewölbedecke' },
    { t: 'UG IX · Gewölbekeller', x: 58, y: 22, b: '4. Haus' },
  ] },
  eg: { label: 'Erdgeschoss', raeume: [
    { t: 'EG I · Chambre Christophe', x: 24, y: 73, b: 'Unteres Haus' },
    { t: 'EG II · Salon', x: 45, y: 73, b: 'Unteres Haus' },
    { t: 'EG III · Chambre Bretagne', x: 72, y: 80, b: 'Unteres Haus' },
    { t: 'EG IV · Treppenhaus', x: 72, y: 66, b: 'Unteres Haus' },
    { t: 'EG V · Flur', x: 65, y: 54, b: '3. Haus' },
    { t: 'EG VI · Badezimmer', x: 45, y: 54, b: '3. Haus' },
    { t: 'EG VII · Büro de Bon Papa', x: 40, y: 45, b: '3. Haus' },
    { t: 'EG VIII · Chambre de Omamin', x: 71, y: 45, b: '3. Haus' },
    { t: 'EG IX · Treppenflur', x: 45, y: 32, b: '4. Haus' },
    { t: 'EG X · Küche', x: 45, y: 26, b: '4. Haus' },
    { t: 'EG XI · Esszimmer', x: 71, y: 29, b: '4. Haus' },
    { t: 'EG XII · Cave', x: 79, y: 13, b: '5. Haus' },
  ] },
  og: { label: 'Obergeschoss', raeume: [
    { t: 'OG I · Speicher 1', x: 25, y: 74, b: 'Unteres Haus, über dem Chambre Christophe' },
    { t: 'OG II · Speicher 2', x: 48, y: 74, b: 'Unteres Haus, über dem Salon' },
    { t: 'OG III · Speicher 3', x: 70, y: 81, b: 'Unteres Haus, über dem Chambre Bretagne' },
    { t: 'OG IV · Treppenhaus', x: 72, y: 71, b: 'Unteres Haus, mit Lichtschacht' },
    { t: 'OG V · Flur', x: 57, y: 62, b: '3. Haus' },
    { t: 'OG VI · Oberes Bad', x: 41, y: 62, b: '3. Haus' },
    { t: 'OG VII · Chambre Ruelle', x: 42, y: 54, b: '3. Haus' },
    { t: 'OG VIII · Chambre Jaune', x: 71, y: 54, b: '3. Haus' },
    { t: 'OG IX · Flur mit Treppe', x: 53, y: 46, b: '4. Haus' },
    { t: 'OG X · Chambre de Bebe', x: 41, y: 38, b: '4. Haus' },
    { t: 'OG XI · Grande Chambre', x: 72, y: 38, b: '4. Haus' },
    { t: 'OG XII · Salon d\'été', x: 76, y: 24, b: '5. Haus' },
    { t: 'OG XIII · Gartenkabuff', x: 79, y: 12, b: '5. Haus' },
  ] },
  og2: { label: '2. Obergeschoss', raeume: [
    { t: '2.OG I · Speicher 4', x: 35, y: 77, b: '3. Haus, keine Stehhöhe' },
    { t: '2.OG II · Treppenflur', x: 49, y: 85, b: '3. Haus' },
    { t: '2.OG III · Chambre des Garçons', x: 66, y: 77, b: '3. Haus, bewohnbar' },
    { t: '2.OG IV · Großer Speicher', x: 37, y: 57, b: '4. Haus' },
    { t: '2.OG V · Speicher 6', x: 67, y: 36, b: '5. Haus' },
    { t: '2.OG VI · Dachboden über dem Salon d\'été', x: 73, y: 20, b: '5. Haus' },
  ] },
}

const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }

function pad(n) { return String(n).padStart(2, '0') }
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function diffDays(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000) }
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
function farbeFuer(t) {
  if (t.gruppe) return PALETTE[hash(t.gruppe.toLowerCase()) % PALETTE.length]
  return [VIS_STYLE[t.sichtbarkeit].bg, VIS_STYLE[t.sichtbarkeit].fg]
}
function intervallLabel(n) { return INTERVALLE.find(i => i[0] === n)?.[1] || `Alle ${n} Tage` }

export default function Intern() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pid = typeof router.query.id === 'string' ? router.query.id : null
  const [name, setName] = useState('')
  const [versteckt, setVersteckt] = useState(false)
  const [state, setState] = useState('lade') // lade | nein | ok
  const [bewohner, setBewohner] = useState(false)
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('kalender')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])
  useEffect(() => { const t = router.query.tab; if (t === 'karte' || t === 'aufgaben' || t === 'kalender') setTab(t) }, [router.query.tab])

  useEffect(() => {
    if (!user || !pid) return
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('name,owner_id,hidden').eq('id', pid).eq('typ', 'kommune').maybeSingle()
      const { data: flag } = await supabase.from('kommune_intern').select('aktiv').eq('kommune_id', pid).maybeSingle()
      if (!p || !flag?.aktiv) { setState('nein'); return }
      setName(p.name || '')
      setVersteckt(!!p.hidden)
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
      <div className={styles.container} style={{ maxWidth: 1080 }}>
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
            {tab === 'kalender' && <Kalender pid={pid} bewohner={bewohner} versteckt={versteckt} setMsg={setMsg}/>}
            {tab === 'karte' && bewohner && <Karte pid={pid} setMsg={setMsg} startOrt={typeof router.query.ort === 'string' ? router.query.ort : null}/>}
            {tab === 'aufgaben' && bewohner && <Aufgaben pid={pid} user={user} members={members} setMsg={setMsg}/>}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Kalender
const LEER = { art: 'anwesenheit', titel: '', gruppe: '', datum: '', datumBis: '', von: '', bis: '', ort: '', beschreibung: '', sichtbarkeit: 'bewohner' }

function Kalender({ pid, bewohner, versteckt, setMsg }) {
  const [monat, setMonat] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [termine, setTermine] = useState([])
  const [artFilter, setArtFilter] = useState('alle')
  const [visFilter, setVisFilter] = useState('alle')
  const [ausgeblendet, setAusgeblendet] = useState([])
  const [sel, setSel] = useState(null)
  const [neu, setNeu] = useState(false)
  const [f, setF] = useState(LEER)
  const visOptionen = versteckt ? VIS.filter(v => v.value !== 'oeffentlich') : VIS

  // Sichtbarer Bereich: ganze Wochen von Montag bis Sonntag
  const lead = (monat.getDay() + 6) % 7
  const tageImMonat = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate()
  const wochen = Math.ceil((lead + tageImMonat) / 7)
  const rasterStart = addDays(monat, -lead)
  const rasterEnde = addDays(rasterStart, wochen * 7)

  async function load() {
    const a = rasterStart.toISOString()
    const b = rasterEnde.toISOString()
    const { data, error } = await supabase.from('kommune_termine').select('*').eq('kommune_id', pid)
      .lt('beginn', b).or(`ende.gte.${a},beginn.gte.${a}`).order('beginn')
    if (error) { setMsg(error.message); return }
    setTermine(data || [])
  }
  useEffect(() => { load() }, [pid, monat])

  async function speichern(e) {
    e.preventDefault()
    if (!f.titel.trim() || !f.datum) return
    const istAnw = f.art === 'anwesenheit'
    const bisDatum = f.datumBis || f.datum
    const beginn = new Date(`${f.datum}T${istAnw ? '00:00' : (f.von || '00:00')}`).toISOString()
    let ende = null
    if (istAnw) ende = new Date(`${bisDatum}T23:59`).toISOString()
    else if (f.datumBis || f.bis) ende = new Date(`${bisDatum}T${f.bis || '23:59'}`).toISOString()
    const { error } = await supabase.from('kommune_termine').insert({
      kommune_id: pid, art: f.art, titel: f.titel.trim(), gruppe: f.gruppe.trim() || null,
      beschreibung: f.beschreibung.trim() || null, beginn, ende, ort: f.ort.trim() || null,
      sichtbarkeit: versteckt && f.sichtbarkeit === 'oeffentlich' ? 'gast' : f.sichtbarkeit,
    })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setF({ ...LEER, art: f.art, gruppe: f.gruppe })
    setNeu(false)
    load()
  }

  async function loeschen(id) {
    const { error } = await supabase.from('kommune_termine').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setTermine(t => t.filter(x => x.id !== id))
    setSel(null)
  }

  // Termine auf Tage abbilden
  const alle = termine.map(t => {
    const s = startOfDay(new Date(t.beginn))
    let e = t.ende ? startOfDay(new Date(t.ende)) : s
    if (e < s) e = s
    return { ...t, s, e, farbe: farbeFuer(t) }
  })
  const gruppen = [...new Set(alle.map(t => t.gruppe).filter(Boolean))].sort()
  const sichtbar = alle.filter(t =>
    (artFilter === 'alle' || t.art === artFilter) &&
    (visFilter === 'alle' || t.sichtbarkeit === visFilter) &&
    !(t.gruppe && ausgeblendet.includes(t.gruppe)))
  const heute = dayKey(new Date())
  const zeit = t => new Date(t.beginn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const datum = d => d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long' })

  const wochenListe = Array.from({ length: wochen }, (_, w) => {
    const ws = addDays(rasterStart, w * 7)
    const segs = sichtbar
      .filter(t => t.s < addDays(ws, 7) && t.e >= ws)
      .map(t => {
        const c0 = Math.max(0, diffDays(ws, t.s))
        const c1 = Math.min(6, diffDays(ws, t.e))
        return { t, c0, c1, vorher: t.s < ws, nachher: t.e > addDays(ws, 6) }
      })
      .sort((a, b) => a.c0 - b.c0 || (b.c1 - b.c0) - (a.c1 - a.c0))
    const lanes = []
    segs.forEach(sg => {
      let l = lanes.findIndex(row => !row.some(o => sg.c0 <= o.c1 && o.c0 <= sg.c1))
      if (l === -1) { lanes.push([]); l = lanes.length - 1 }
      lanes[l].push(sg)
      sg.lane = l
    })
    return { ws, segs, anzahl: lanes.length }
  })

  const gewaehlt = alle.find(t => t.id === sel)
  const liste = sichtbar.filter(t => t.e >= monat && t.s < new Date(monat.getFullYear(), monat.getMonth() + 1, 1))
  const kopf = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: '2px 4px' }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" style={btnLight} aria-label="Vorheriger Monat" onClick={() => setMonat(new Date(monat.getFullYear(), monat.getMonth() - 1, 1))}>‹</button>
          <strong style={{ minWidth: 150, textAlign: 'center' }}>{MONATE[monat.getMonth()]} {monat.getFullYear()}</strong>
          <button type="button" style={btnLight} aria-label="Nächster Monat" onClick={() => setMonat(new Date(monat.getFullYear(), monat.getMonth() + 1, 1))}>›</button>
          <button type="button" style={btnLight} onClick={() => { const d = new Date(); setMonat(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Heute</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={artFilter} onChange={e => setArtFilter(e.target.value)} aria-label="Art filtern" style={{ ...input, width: 'auto' }}>
            <option value="alle">Termine und Anwesenheit</option>
            <option value="termin">Nur Termine</option>
            <option value="anwesenheit">Nur Anwesenheit</option>
          </select>
          <select value={visFilter} onChange={e => setVisFilter(e.target.value)} aria-label="Sichtbarkeit filtern" style={{ ...input, width: 'auto' }}>
            <option value="alle">Alle Sichtbarkeiten</option>
            {visOptionen.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          {bewohner && <button type="button" style={btn} onClick={() => setNeu(n => !n)}>{neu ? 'Abbrechen' : '+ Eintrag'}</button>}
        </div>
      </div>

      {neu && bewohner && (
        <form onSubmit={speichern} style={{ ...card, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={f.art === 'anwesenheit' ? btn : btnLight} onClick={() => setF({ ...f, art: 'anwesenheit' })}>Anwesenheit: wer ist wann da</button>
            <button type="button" style={f.art === 'termin' ? btn : btnLight} onClick={() => setF({ ...f, art: 'termin' })}>Termin</button>
          </div>
          <div>
            <label style={label}>{f.art === 'anwesenheit' ? 'Wer ist da? (Namen)' : 'Titel'}</label>
            <input style={input} required value={f.titel} onChange={e => setF({ ...f, titel: e.target.value })} placeholder={f.art === 'anwesenheit' ? 'z. B. Jan Lucas, Lola, Anna' : ''}/>
          </div>
          <div>
            <label style={label}>Gruppe oder Haushalt (bestimmt die Farbe, optional)</label>
            <input style={input} list="gruppen-liste" value={f.gruppe} onChange={e => setF({ ...f, gruppe: e.target.value })} placeholder="z. B. Familie Abram"/>
            <datalist id="gruppen-liste">{gruppen.map(g => <option key={g} value={g}/>)}</datalist>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div><label style={label}>{f.art === 'anwesenheit' ? 'Von (Tag)' : 'Datum'}</label><input style={input} type="date" required value={f.datum} onChange={e => setF({ ...f, datum: e.target.value })}/></div>
            <div><label style={label}>{f.art === 'anwesenheit' ? 'Bis (Tag)' : 'Bis Tag (mehrtägig)'}</label><input style={input} type="date" min={f.datum || undefined} value={f.datumBis} onChange={e => setF({ ...f, datumBis: e.target.value })}/></div>
            {f.art === 'termin' && <div><label style={label}>Uhrzeit von</label><input style={input} type="time" value={f.von} onChange={e => setF({ ...f, von: e.target.value })}/></div>}
            {f.art === 'termin' && <div><label style={label}>Uhrzeit bis</label><input style={input} type="time" value={f.bis} onChange={e => setF({ ...f, bis: e.target.value })}/></div>}
          </div>
          {f.art === 'termin' && <div><label style={label}>Ort</label><input style={input} value={f.ort} onChange={e => setF({ ...f, ort: e.target.value })}/></div>}
          <div><label style={label}>Notiz</label><textarea style={{ ...input, minHeight: 60 }} value={f.beschreibung} onChange={e => setF({ ...f, beschreibung: e.target.value })}/></div>
          <div>
            <label style={label}>Wer sieht den Eintrag?</label>
            <select style={input} value={f.sichtbarkeit} onChange={e => setF({ ...f, sichtbarkeit: e.target.value })}>
              {visOptionen.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            {versteckt && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>Diese Gemeinschaft ist versteckt, deshalb gibt es keine öffentlichen Einträge.</p>}
            {!versteckt && f.sichtbarkeit === 'oeffentlich' && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>Öffentlich heißt: alle, die diese Gemeinschaft sehen können, sehen den Eintrag.</p>}
          </div>
          <div><button type="submit" style={btn}>Speichern</button></div>
        </form>
      )}

      {gruppen.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Gruppen:</span>
          {gruppen.map(g => {
            const c = PALETTE[hash(g.toLowerCase()) % PALETTE.length]
            const an = !ausgeblendet.includes(g)
            return (
              <button key={g} type="button" aria-pressed={an} onClick={() => setAusgeblendet(a => an ? [...a, g] : a.filter(x => x !== g))}
                style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px', fontSize: 13, minHeight: 36, cursor: 'pointer', background: an ? c[0] : 'var(--card)', color: an ? c[1] : 'var(--muted)', textDecoration: an ? 'none' : 'line-through' }}>{g}</button>
            )
          })}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 4 }}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d} style={kopf}>{d}</div>)}
          </div>
          {wochenListe.map((w, wi) => {
            const hoehe = Math.max(88, 30 + w.anzahl * 27 + 8)
            return (
              <div key={wi} style={{ position: 'relative', marginBottom: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(w.ws, i)
                    const imMonat = d.getMonth() === monat.getMonth()
                    const istHeute = dayKey(d) === heute
                    return (
                      <div key={i} style={{ height: hoehe, borderRadius: 8, padding: 4, boxSizing: 'border-box', background: imMonat ? 'var(--card)' : 'transparent', border: istHeute ? '2px solid var(--g)' : '1px solid ' + (imMonat ? 'transparent' : 'var(--border)'), opacity: imMonat ? 1 : 0.6 }}>
                        <div style={{ fontSize: 13, fontWeight: istHeute ? 700 : 500, textAlign: 'right' }}>{d.getDate()}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 26, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', columnGap: 4, rowGap: 3, gridAutoRows: 24, pointerEvents: 'none' }}>
                  {w.segs.map(sg => (
                    <button key={sg.t.id + '-' + wi} type="button" onClick={() => setSel(sg.t.id)} title={sg.t.titel}
                      style={{ gridColumn: `${sg.c0 + 1} / ${sg.c1 + 2}`, gridRow: sg.lane + 1, pointerEvents: 'auto', border: sel === sg.t.id ? '2px solid var(--text)' : 'none', background: sg.t.farbe[0], color: sg.t.farbe[1], fontSize: 12, textAlign: 'left', padding: '0 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', minHeight: 24, margin: '0 1px',
                        borderRadius: `${sg.vorher ? 0 : 12}px ${sg.nachher ? 0 : 12}px ${sg.nachher ? 0 : 12}px ${sg.vorher ? 0 : 12}px` }}>
                      {sg.t.art === 'termin' && <b>{VIS_STYLE[sg.t.sichtbarkeit].tag} </b>}{sg.t.art === 'termin' && sg.t.s.getTime() === sg.t.e.getTime() ? zeit(sg.t) + ' ' : ''}{sg.t.titel}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {gewaehlt && (
        <div style={{ ...card, marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{gewaehlt.titel}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {gewaehlt.art === 'anwesenheit' ? 'Anwesenheit' : 'Termin'} · {datum(gewaehlt.s)}{gewaehlt.e > gewaehlt.s ? ' bis ' + datum(gewaehlt.e) : ''}{gewaehlt.art === 'termin' && gewaehlt.s.getTime() === gewaehlt.e.getTime() ? ' · ' + zeit(gewaehlt) + ' Uhr' : ''}{gewaehlt.ort ? ' · ' + gewaehlt.ort : ''}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: VIS_STYLE[gewaehlt.sichtbarkeit].bg, color: VIS_STYLE[gewaehlt.sichtbarkeit].fg }}>{VIS.find(v => v.value === gewaehlt.sichtbarkeit)?.label}</span>
              {gewaehlt.gruppe && <span style={{ marginLeft: 8, color: 'var(--muted)' }}>Gruppe: {gewaehlt.gruppe}</span>}
            </div>
            {gewaehlt.beschreibung && <div style={{ fontSize: 14, marginTop: 6 }}>{gewaehlt.beschreibung}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {bewohner && <button type="button" style={btnLight} onClick={() => loeschen(gewaehlt.id)}>Löschen</button>}
            <button type="button" style={btnLight} onClick={() => setSel(null)}>Schließen</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, margin: '14px 0', alignItems: 'center' }}>
        <strong>Termine:</strong>
        {visOptionen.map(v => <span key={v.value}><span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, fontWeight: 600, background: VIS_STYLE[v.value].bg, color: VIS_STYLE[v.value].fg }}>{VIS_STYLE[v.value].tag}</span> {v.label}</span>)}
        <span style={{ color: 'var(--muted)' }}>Anwesenheit hat die Farbe der Gruppe.</span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>Einträge im {MONATE[monat.getMonth()]} ({liste.length})</div>
      {liste.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Keine Einträge in diesem Monat.</p>}
      {liste.map(t => (
        <button key={t.id} type="button" onClick={() => setSel(t.id)} style={{ ...card, display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', color: 'var(--text)', borderLeft: `6px solid ${t.farbe[1]}` }}>
          <div style={{ fontWeight: 600 }}>{t.titel}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.art === 'anwesenheit' ? 'Anwesend' : 'Termin'} · {datum(t.s)}{t.e > t.s ? ' bis ' + datum(t.e) : ''}{t.art === 'termin' && t.s.getTime() === t.e.getTime() ? ' · ' + zeit(t) + ' Uhr' : ''}</div>
        </button>
      ))}

      {bewohner && <IcalPanel pid={pid} onSynced={load} setMsg={setMsg}/>}
    </div>
  )
}

// ---------------------------------------------------------------- Karte
function Karte({ pid, setMsg, startOrt }) {
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
  const [vorlage, setVorlage] = useState('')
  const [offen, setOffen] = useState({})
  const [startDone, setStartDone] = useState(false)

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
  useEffect(() => { loadOrte(aktiv); setSel(null); setPin(null); setSetzen(false); setVorlage('') }, [aktiv])

  // Rücksprung von der Raumseite: richtige Karte öffnen und den Raum auswählen
  useEffect(() => {
    if (!startOrt || startDone) return
    ;(async () => {
      const { data } = await supabase.from('kommune_orte').select('id,karte_id').eq('id', startOrt).maybeSingle()
      setStartDone(true)
      if (data) { setAktiv(data.karte_id); setTimeout(() => setSel(data.id), 400) }
    })()
  }, [startOrt])

  // Offene Aufgaben je Raum für die Infobox
  useEffect(() => {
    if (!orte.length) { setOffen({}); return }
    supabase.from('kommune_aufgaben').select('ort_id').eq('kommune_id', pid).neq('status', 'fertig').not('ort_id', 'is', null).then(({ data }) => {
      const m = {}
      ;(data || []).forEach(a => { m[a.ort_id] = (m[a.ort_id] || 0) + 1 })
      setOffen(m)
    })
  }, [orte])

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

  // Alle vier Grundrisse auf einmal: Stockwerk wird am Dateinamen erkannt, Karte und Räume werden automatisch angelegt
  const [alle, setAlle] = useState({ busy: false, info: '' })
  function stockwerk(name) {
    const n = name.toLowerCase()
    if (n.includes('roh')) return null
    if (/3-2|2\.\s*ober|2og|og2/.test(n)) return 'og2'
    if (/unter|ug/.test(n)) return 'ug'
    if (/erd|eg/.test(n)) return 'eg'
    if (/ober|og/.test(n)) return 'og'
    return null
  }
  async function alleHochladen(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    const paare = ['ug', 'eg', 'og', 'og2'].map(k => [k, files.find(f => stockwerk(f.name) === k)]).filter(x => x[1])
    if (!paare.length) { setMsg('Keine passenden Dateien erkannt. Die Namen müssen Untergeschoss, Erdgeschoss, Obergeschoss oder 2-Obergeschoss enthalten.'); return }
    setAlle({ busy: true, info: '' })
    let erster = null
    for (let i = 0; i < paare.length; i++) {
      const [key, datei] = paare[i]
      setAlle({ busy: true, info: `${RAUM_VORLAGEN[key].label} (${i + 1} von ${paare.length})…` })
      const ext = (datei.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      const pfad = `${pid}/${crypto.randomUUID()}.${ext}`
      const up1 = await supabase.storage.from('kommune-karten').upload(pfad, datei, { contentType: datei.type || undefined })
      if (up1.error) { setMsg('Hochladen fehlgeschlagen: ' + up1.error.message); setAlle({ busy: false, info: '' }); return }
      const ins = await supabase.from('kommune_karten').insert({ kommune_id: pid, titel: RAUM_VORLAGEN[key].label, bild_pfad: pfad, sort: i }).select().single()
      if (ins.error) { setMsg('Speichern fehlgeschlagen: ' + ins.error.message); setAlle({ busy: false, info: '' }); return }
      const rows = RAUM_VORLAGEN[key].raeume.map(r => ({ karte_id: ins.data.id, kommune_id: pid, titel: r.t, beschreibung: r.b, kategorie: 'raum', x: r.x, y: r.y }))
      const ro = await supabase.from('kommune_orte').insert(rows)
      if (ro.error) { setMsg('Räume anlegen fehlgeschlagen: ' + ro.error.message); setAlle({ busy: false, info: '' }); return }
      if (!erster) erster = ins.data.id
    }
    setMsg('')
    setAlle({ busy: false, info: '' })
    loadKarten(erster)
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

  async function raeumeAnlegen() {
    const v = RAUM_VORLAGEN[vorlage]
    if (!v || !aktiv) return
    const rows = v.raeume.map(r => ({ karte_id: aktiv, kommune_id: pid, titel: r.t, beschreibung: r.b, kategorie: 'raum', x: r.x, y: r.y }))
    const { error } = await supabase.from('kommune_orte').insert(rows)
    if (error) { setMsg('Räume anlegen fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setVorlage('')
    loadOrte(aktiv)
  }

  const k = karten.find(x => x.id === aktiv)
  const bild = k?.bild_pfad ? urls[k.bild_pfad] : null
  const gewaehlt = orte.find(o => o.id === sel)
  const kurz = (o, i) => o.titel.includes(' · ') ? o.titel.split(' · ')[0].replace(/^(UG|EG|OG|2\.OG) /, '') : String(i + 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {karten.map(x => <button key={x.id} type="button" onClick={() => setAktiv(x.id)} aria-pressed={aktiv === x.id} style={{ ...btn, background: aktiv === x.id ? 'var(--text)' : 'var(--card)', color: aktiv === x.id ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999 }}>{x.titel}</button>)}
        {karten.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>Noch keine Karte. Lade unten einen Grundriss hoch.</span>}
      </div>

      {k && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: '3 1 480px', minWidth: 0 }}>
            {gewaehlt && !pin && (
              <div style={{ ...card, border: '2px solid var(--g)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 16 }}>{gewaehlt.titel}</strong>
                  <button type="button" aria-label="Infobox schließen" onClick={() => setSel(null)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, minHeight: 36, minWidth: 36 }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, margin: '8px 0' }}>
                  <div><span style={label}>Größe</span><strong>{gewaehlt.flaeche_m2 ? `${String(gewaehlt.flaeche_m2).replace('.', ',')} m²` : '–'}</strong></div>
                  <div><span style={label}>Höhe</span><strong>{gewaehlt.hoehe_m ? `${String(gewaehlt.hoehe_m).replace('.', ',')} m` : '–'}</strong></div>
                  <div><span style={label}>Offene Aufgaben</span><strong>{offen[gewaehlt.id] || 0}</strong></div>
                </div>
                <div style={{ fontSize: 14, margin: '4px 0 10px', color: gewaehlt.probleme ? '#b3261e' : 'var(--muted)' }}>
                  <span style={label}>Probleme</span>{gewaehlt.probleme || 'Keine eingetragen'}
                </div>
                {gewaehlt.beschreibung && <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>{gewaehlt.beschreibung}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/profil/raum?id=${gewaehlt.id}`} style={{ ...btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Raumseite öffnen →</Link>
                  <button type="button" style={btnLight} onClick={() => ortLoeschen(gewaehlt.id)}>Markierung löschen</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              <button type="button" style={btnLight} onClick={() => setZoom(z => Math.max(100, z - 50))} aria-label="Verkleinern">−</button>
              <span style={{ fontSize: 13, minWidth: 44, textAlign: 'center' }}>{zoom}%</span>
              <button type="button" style={btnLight} onClick={() => setZoom(z => Math.min(400, z + 50))} aria-label="Vergrößern">+</button>
              <button type="button" style={setzen ? btn : btnLight} onClick={() => { setSetzen(s => !s); setPin(null) }}>{setzen ? 'Abbrechen' : '+ Markierung setzen'}</button>
              <button type="button" style={{ ...btnLight, marginLeft: 'auto' }} onClick={() => karteLoeschen(k)}>Karte löschen</button>
            </div>
            {setzen && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Tippe auf die Stelle im Plan, an die die Markierung soll.</p>}
            <div style={{ overflow: 'auto', maxHeight: '78vh', border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
              <div style={{ position: 'relative', width: `${zoom}%`, cursor: setzen ? 'crosshair' : 'default' }} onClick={klick}>
                {bild ? <img src={bild} alt={k.titel} style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }} draggable={false}/> : <div style={{ padding: 40, color: 'var(--muted)' }}>Bild wird geladen…</div>}
                {orte.map((o, i) => (
                  <button key={o.id} type="button" aria-label={o.titel} title={o.titel} onClick={ev => { ev.stopPropagation(); setSel(o.id); setPin(null); setSetzen(false) }}
                    style={{ position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', minWidth: 34, height: 34, padding: '0 8px', borderRadius: 17, border: sel === o.id ? '3px solid #17251D' : '2px solid #fff', background: sel === o.id ? '#B7791F' : (o.probleme ? '#B3261E' : '#2F5D46'), color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>{kurz(o, i)}</button>
                ))}
                {pin && <span style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)', width: 26, height: 26, borderRadius: '50%', background: '#B7791F', border: '3px solid #fff' }}/>}
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            {pin && (
              <form onSubmit={pinSpeichern} style={{ ...card, display: 'grid', gap: 10 }}>
                <strong>Neue Markierung</strong>
                <div><label style={label}>Name (z. B. Kompostplatz, Raum IX)</label><input style={input} required autoFocus value={pf.titel} onChange={e => setPf({ ...pf, titel: e.target.value })}/></div>
                <div><label style={label}>Notiz</label><textarea style={{ ...input, minHeight: 70 }} value={pf.beschreibung} onChange={e => setPf({ ...pf, beschreibung: e.target.value })}/></div>
                <div><button type="submit" style={btn}>Speichern</button></div>
              </form>
            )}
            {orte.length === 0 && (
              <div style={card}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Räume aus der Bachelorarbeit</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>Legt für das Landhaus Arnaville alle Räume dieses Stockwerks als Markierungen an. Wähle das Stockwerk, das zu dieser Karte passt.</p>
                <select style={{ ...input, marginBottom: 8 }} value={vorlage} onChange={e => setVorlage(e.target.value)} aria-label="Stockwerk">
                  <option value="">Stockwerk wählen</option>
                  {Object.entries(RAUM_VORLAGEN).map(([key, v]) => <option key={key} value={key}>{v.label} ({v.raeume.length} Räume)</option>)}
                </select>
                <button type="button" style={btn} disabled={!vorlage} onClick={raeumeAnlegen}>Räume anlegen</button>
              </div>
            )}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Markierungen ({orte.length})</div>
              {orte.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Noch keine.</span>}
              {orte.map((o, i) => <button key={o.id} type="button" onClick={() => { setSel(o.id); setPin(null) }} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: sel === o.id ? 'var(--bg)' : 'none', color: 'var(--text)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 14, minHeight: 36 }}>{o.titel.includes(' · ') ? o.titel : `${i + 1} · ${o.titel}`}</button>)}
            </div>
          </div>
        </div>
      )}

      {karten.length === 0 && (
        <div style={{ ...card, border: '2px solid var(--g)', maxWidth: 520 }}>
          <strong>Arnaville: alle Grundrisse auf einmal</strong>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 10px' }}>Wähle die vier Dateien Grundriss-0-Untergeschoss, -1-Erdgeschoss, -2-Obergeschoss und -3-2-Obergeschoss gemeinsam aus (Dateien mit "roh" im Namen werden übersprungen). Die Karten mit allen Räumen entstehen automatisch.</p>
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={alle.busy} onChange={alleHochladen}/>
          {alle.busy && <p style={{ fontSize: 13, margin: '8px 0 0' }}>Lädt hoch: {alle.info}</p>}
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
  const [raeume, setRaeume] = useState([])
  const [pf, setPf] = useState('alle')
  const [neuProjekt, setNeuProjekt] = useState({ titel: '', laufend: false, ort_id: '' })
  const [f, setF] = useState({ titel: '', projekt_id: '', zustaendig: '', faellig: '', intervall: 0, ort_id: '' })
  const heute = dayKey(new Date())

  async function load() {
    const [p, a, o] = await Promise.all([
      supabase.from('kommune_projekte').select('*').eq('kommune_id', pid).order('created_at'),
      supabase.from('kommune_aufgaben').select('*').eq('kommune_id', pid).order('created_at'),
      supabase.from('kommune_orte').select('id,titel').eq('kommune_id', pid).order('titel'),
    ])
    if (p.error || a.error) { setMsg((p.error || a.error).message); return }
    setProjekte(p.data || [])
    setAufgaben(a.data || [])
    setRaeume(o.data || [])
  }
  useEffect(() => { load() }, [pid])

  const personen = [{ user_id: user.id, name: 'Ich' }, ...members.filter(m => m.rolle === 'bewohner' && m.user_id !== user.id)]
  const wer = id => id === user.id ? 'Ich' : (members.find(m => m.user_id === id)?.name || (id ? 'Bewohner' : 'frei'))
  const projektName = id => projekte.find(p => p.id === id)?.titel || 'Ohne Projekt'
  const raumName = id => raeume.find(r => r.id === id)?.titel || ''
  const kurzDatum = s => new Date(s + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })

  async function projektAnlegen(e) {
    e.preventDefault()
    if (!neuProjekt.titel.trim()) return
    const { error } = await supabase.from('kommune_projekte').insert({ kommune_id: pid, titel: neuProjekt.titel.trim(), laufend: neuProjekt.laufend, ort_id: neuProjekt.ort_id || null })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setNeuProjekt({ titel: '', laufend: false, ort_id: '' })
    load()
  }

  async function aufgabeAnlegen(e) {
    e.preventDefault()
    if (!f.titel.trim()) return
    const iv = Number(f.intervall) || null
    const faellig = f.faellig || (iv ? dayKey(addDays(new Date(), iv)) : null)
    const { error } = await supabase.from('kommune_aufgaben').insert({ kommune_id: pid, titel: f.titel.trim(), projekt_id: f.projekt_id || null, zustaendig: f.zustaendig || null, faellig, intervall_tage: iv, ort_id: f.ort_id || null })
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setF({ titel: '', projekt_id: f.projekt_id, zustaendig: '', faellig: '', intervall: 0, ort_id: f.ort_id })
    load()
  }

  async function aendern(a, patch) {
    const { error } = await supabase.from('kommune_aufgaben').update(patch).eq('id', a.id)
    if (error) { setMsg('Ändern fehlgeschlagen: ' + error.message); return }
    setAufgaben(list => list.map(x => x.id === a.id ? { ...x, ...patch } : x))
  }

  // Wiederkehrende Aufgabe erledigt: zurück auf "offen", wieder frei, nächste Fälligkeit
  function erledigt(a) {
    if (a.intervall_tage) return aendern(a, { status: 'offen', zustaendig: null, zuletzt_erledigt: heute, faellig: dayKey(addDays(new Date(), a.intervall_tage)) })
    return aendern(a, { status: 'fertig' })
  }

  async function aufgabeLoeschen(id) {
    const { error } = await supabase.from('kommune_aufgaben').delete().eq('id', id)
    if (error) { setMsg('Löschen fehlgeschlagen: ' + error.message); return }
    setAufgaben(list => list.filter(x => x.id !== id))
  }

  const sicht = aufgaben.filter(a => pf === 'alle' || (pf === 'ohne' ? !a.projekt_id : a.projekt_id === pf))
  const pill = on => ({ ...btn, background: on ? 'var(--text)' : 'var(--card)', color: on ? 'var(--bg)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 999 })
  const sortiert = liste => [...liste].sort((a, b) => (a.faellig || '9999') < (b.faellig || '9999') ? -1 : 1)

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>Aufgaben werden übernommen, nicht zugeteilt. Wiederkehrende Aufgaben (z. B. Kompost wenden, Laub rechen) kommen nach dem Erledigen von selbst wieder.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" style={pill(pf === 'alle')} onClick={() => setPf('alle')}>Alle Projekte</button>
        {projekte.map(p => <button key={p.id} type="button" style={pill(pf === p.id)} onClick={() => setPf(p.id)}>{p.titel}{p.laufend ? ' ↻' : ''}</button>)}
        <button type="button" style={pill(pf === 'ohne')} onClick={() => setPf('ohne')}>Ohne Projekt</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <form onSubmit={projektAnlegen} style={{ ...card, flex: '1 1 260px', margin: 0, display: 'grid', gap: 8 }}>
          <strong>Neues Projekt</strong>
          <input style={input} placeholder="z. B. Dach Scheune oder Garten & Hof" value={neuProjekt.titel} onChange={e => setNeuProjekt({ ...neuProjekt, titel: e.target.value })}/>
          <select style={input} value={neuProjekt.ort_id} onChange={e => setNeuProjekt({ ...neuProjekt, ort_id: e.target.value })} aria-label="Raum oder Ort"><option value="">Kein bestimmter Raum</option>{raeume.map(r => <option key={r.id} value={r.id}>{r.titel}</option>)}</select>
          <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', minHeight: 36 }}><input type="checkbox" checked={neuProjekt.laufend} onChange={e => setNeuProjekt({ ...neuProjekt, laufend: e.target.checked })}/> Laufendes Projekt (ohne Ende, für Daueraufgaben)</label>
          <div><button type="submit" style={btn}>Projekt anlegen</button></div>
        </form>
        <form onSubmit={aufgabeAnlegen} style={{ ...card, flex: '2 1 380px', margin: 0, display: 'grid', gap: 8 }}>
          <strong>Neue Aufgabe</strong>
          <input style={input} required placeholder="Was ist zu tun?" value={f.titel} onChange={e => setF({ ...f, titel: e.target.value })}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <select style={input} value={f.projekt_id} onChange={e => setF({ ...f, projekt_id: e.target.value })} aria-label="Projekt"><option value="">Ohne Projekt</option>{projekte.map(p => <option key={p.id} value={p.id}>{p.titel}</option>)}</select>
            <select style={input} value={f.ort_id} onChange={e => setF({ ...f, ort_id: e.target.value })} aria-label="Raum oder Ort"><option value="">Kein bestimmter Raum</option>{raeume.map(r => <option key={r.id} value={r.id}>{r.titel}</option>)}</select>
            <select style={input} value={f.zustaendig} onChange={e => setF({ ...f, zustaendig: e.target.value })} aria-label="Wer macht es"><option value="">Noch frei</option>{personen.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            <select style={input} value={f.intervall} onChange={e => setF({ ...f, intervall: e.target.value })} aria-label="Wiederholung">{INTERVALLE.map(i => <option key={i[0]} value={i[0]}>{i[1]}</option>)}</select>
            <input style={input} type="date" value={f.faellig} onChange={e => setF({ ...f, faellig: e.target.value })} aria-label="Fällig am"/>
          </div>
          <div><button type="submit" style={btn}>Aufgabe anlegen</button></div>
        </form>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        {STATUS.map((s, si) => {
          const liste = sortiert(sicht.filter(a => a.status === s.value))
          return (
            <div key={s.value} style={{ flex: '1 1 260px', minWidth: 0, background: 'var(--card)', borderRadius: 12, padding: 12, boxSizing: 'border-box' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.label} · {liste.length}</div>
              {liste.map(a => {
                const ueberfaellig = a.faellig && a.faellig < heute && a.status !== 'fertig'
                return (
                  <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{a.intervall_tage ? '↻ ' : ''}{a.titel}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 2px' }}>{projektName(a.projekt_id)}{a.ort_id && raumName(a.ort_id) ? ' · ' + raumName(a.ort_id) : ''} · {wer(a.zustaendig)}</div>
                    {a.intervall_tage ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{intervallLabel(a.intervall_tage)}{a.zuletzt_erledigt ? ' · zuletzt erledigt ' + kurzDatum(a.zuletzt_erledigt) : ''}</div> : null}
                    {a.faellig && <div style={{ fontSize: 13, fontWeight: ueberfaellig ? 600 : 400, color: ueberfaellig ? '#b3261e' : 'var(--muted)' }}>{ueberfaellig ? 'Überfällig seit ' : 'Fällig '}{kurzDatum(a.faellig)}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {!a.zustaendig && a.status !== 'fertig' && <button type="button" style={btnLight} onClick={() => aendern(a, { zustaendig: user.id })}>Übernehmen</button>}
                      {a.status === 'offen' && <button type="button" style={btnLight} onClick={() => aendern(a, { status: 'arbeit' })}>Starten</button>}
                      {a.status !== 'fertig' && <button type="button" style={btnLight} onClick={() => erledigt(a)}>{a.intervall_tage ? 'Erledigt, kommt wieder' : 'Erledigt'}</button>}
                      {a.status === 'fertig' && <button type="button" style={btnLight} onClick={() => aendern(a, { status: 'offen' })}>Wieder öffnen</button>}
                      <button type="button" aria-label="Aufgabe löschen" onClick={() => aufgabeLoeschen(a.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
