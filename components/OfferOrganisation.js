import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATS = ['Vorspeise', 'Hauptgericht', 'Beilage', 'Dessert', 'Getränke', 'Material / Sonstiges']
const TAGS = ['vegan', 'vegetarisch', 'glutenfrei', 'Nüsse', 'laktosefrei']
const card = { background: 'var(--card)', borderRadius: 14, padding: 20, marginBottom: 24 }
const inp = { padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, boxSizing: 'border-box', width: '100%' }
const btn = { padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--g)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
const ghost = { padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }

function Dishes({ offerId, asId, isOwner }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', category: CATS[1], note: '', tags: [], wish: false })
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_dishes_list', { p_offer: offerId, p_as: asId })
    setList(data || [])
  }, [offerId, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  const typed = form.name.trim().toLowerCase()
  const dupe = typed && list.find(d => d.name.trim().toLowerCase() === typed)

  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.rpc('dish_add', { p_offer: offerId, p_as: asId, p_category: form.category, p_name: form.name, p_tags: form.tags, p_note: form.note, p_wish: isOwner || form.wish })
    if (error) { setErr(error.message); load(); return }
    setForm(f => ({ ...f, name: '', note: '', tags: [] })); load()
  }
  async function act(id, action) {
    setErr('')
    const { error } = await supabase.rpc('dish_act', { p_id: id, p_as: asId, p_action: action })
    if (error) setErr(error.message)
    load()
  }
  const cats = [...new Set([...CATS, ...list.map(d => d.category)])].filter(c => list.some(d => d.category === c))

  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Noch nichts eingetragen. {isOwner ? 'Trage hier Wünsche ein, z.B. „Hauptgericht“ oder „Getränke“.' : 'Trag ein, was du mitbringst – bei Doppelungen bekommst du eine Warnung.'}</div>}
      {cats.map(c => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>{c}</div>
          {list.filter(d => d.category === c).map(d => (
            <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <strong>{d.name}</strong>
                {d.tags?.map(t => <span key={t} style={{ marginLeft: 6, fontSize: 11, background: '#E1ECEE', color: 'var(--g)', borderRadius: 10, padding: '1px 8px' }}>{t}</span>)}
                {d.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.note}</div>}
              </div>
              <span style={{ fontSize: 12, color: d.claimed_by ? 'var(--text)' : 'var(--muted)' }}>{d.claimed_by ? (d.mine ? '✓ Du bringst mit' : `✓ ${d.claimed_name || 'Jemand'}`) : '🙋 Gesucht'}</span>
              {!d.claimed_by && !isOwner && <button style={btn} onClick={() => act(d.id, 'claim')}>Ich bring’s</button>}
              {d.mine && <button style={ghost} onClick={() => act(d.id, 'release')}>Zurückziehen</button>}
              {isOwner && !d.mine && <button style={ghost} onClick={() => act(d.id, 'delete')}>Entfernen</button>}
            </div>
          ))}
        </div>
      ))}
      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
          <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Hummus" maxLength={80}/>
          <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        {dupe && <div style={{ fontSize: 13, color: '#b3261e' }}>⚠️ „{dupe.name}“ steht schon in der Liste{dupe.claimed_by ? ` – ${dupe.mine ? 'du bringst es mit' : (dupe.claimed_name || 'jemand') + ' bringt es mit'}` : ' auf der Wunschliste'}.</div>}
        <input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Notiz (optional), z.B. für 8 Personen" maxLength={200}/>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TAGS.map(t => {
            const on = form.tags.includes(t)
            return <button type="button" key={t} onClick={() => setForm(f => ({ ...f, tags: on ? f.tags.filter(x => x !== t) : [...f.tags, t] }))} style={{ ...ghost, background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--muted)' }}>{t}</button>
          })}
        </div>
        {isOwner && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Als Kommune trägst du Wünsche ein – Teilnehmende übernehmen sie mit „Ich bring’s“. Selbst etwas mitbringen kannst du mit deinem persönlichen Profil.</div>}
        <div><button type="submit" style={btn} disabled={!form.name.trim()}>{isOwner ? 'Wunsch eintragen' : dupe ? 'Trotzdem eintragen' : 'Ich bringe mit'}</button></div>
      </form>
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

function Tasks({ offerId, asId, isOwner }) {
  const [list, setList] = useState([])
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_tasks_list', { p_offer: offerId, p_as: asId })
    setList(data || [])
  }, [offerId, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  async function act(id, action) {
    setErr('')
    const { error } = await supabase.rpc('task_act', { p_id: id, p_as: asId, p_action: action })
    if (error) setErr(error.message)
    load()
  }
  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.rpc('task_add', { p_offer: offerId, p_as: asId, p_title: title })
    if (error) { setErr(error.message); return }
    setTitle(''); load()
  }
  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{isOwner ? 'Lege Aufgaben an, z.B. Aufbau, Einkauf, Küche, Abbau.' : 'Noch keine Aufgaben.'}</div>}
      {list.map(t => (
        <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ flex: 1, minWidth: 140, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'var(--text)' }}>{t.title}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.assignee ? (t.mine ? 'Du' : t.assignee_name) : 'offen'}</span>
          {!t.assignee && !isOwner && <button style={btn} onClick={() => act(t.id, 'take')}>Übernehmen</button>}
          {(t.mine || isOwner) && t.assignee && <button style={ghost} onClick={() => act(t.id, 'toggle')}>{t.done ? 'Wieder öffnen' : '✓ Erledigt'}</button>}
          {(t.mine || isOwner) && t.assignee && !t.done && <button style={ghost} onClick={() => act(t.id, 'release')}>Abgeben</button>}
          {isOwner && <button style={ghost} onClick={() => act(t.id, 'delete')}>Löschen</button>}
        </div>
      ))}
      {isOwner && (
        <form onSubmit={add} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Neue Aufgabe" maxLength={120}/>
          <button type="submit" style={btn} disabled={!title.trim()}>Hinzufügen</button>
        </form>
      )}
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

function Schedule({ offerId, isOwner, offer }) {
  const [list, setList] = useState([])
  const [f, setF] = useState({ tag: offer.datum || offer.von || '', uhrzeit: '', titel: '', beschreibung: '' })
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.from('offer_schedule').select('*').eq('offer_id', offerId).order('tag', { nullsFirst: true }).order('uhrzeit', { nullsFirst: true })
    setList(data || [])
  }, [offerId])
  useEffect(() => { load() }, [load])
  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.from('offer_schedule').insert({ offer_id: offerId, tag: f.tag || null, uhrzeit: f.uhrzeit || null, titel: f.titel.trim(), beschreibung: f.beschreibung.trim() || null })
    if (error) { setErr(error.message); return }
    setF(x => ({ ...x, uhrzeit: '', titel: '', beschreibung: '' })); load()
  }
  async function del(id) { await supabase.from('offer_schedule').delete().eq('id', id); load() }
  let last = null
  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{isOwner ? 'Trage den Ablauf ein, z.B. 14:00 Ankommen, 18:00 Gemeinsam kochen.' : 'Noch kein Zeitplan.'}</div>}
      {list.map(s => {
        const head = s.tag !== last ? (last = s.tag, s.tag ? new Date(s.tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Ohne Datum') : null
        return (
          <div key={s.id}>
            {head && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', margin: '10px 0 4px' }}>{head}</div>}
            <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)', alignItems: 'baseline' }}>
              <span style={{ width: 52, fontWeight: 700, flexShrink: 0 }}>{s.uhrzeit ? s.uhrzeit.slice(0, 5) : '–'}</span>
              <div style={{ flex: 1 }}><strong>{s.titel}</strong>{s.beschreibung && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.beschreibung}</div>}</div>
              {isOwner && <button style={ghost} onClick={() => del(s.id)}>×</button>}
            </div>
          </div>
        )
      })}
      {isOwner && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
            <input style={inp} type="date" value={f.tag} onChange={e => setF(x => ({ ...x, tag: e.target.value }))}/>
            <input style={inp} type="time" value={f.uhrzeit} onChange={e => setF(x => ({ ...x, uhrzeit: e.target.value }))}/>
          </div>
          <input style={inp} value={f.titel} onChange={e => setF(x => ({ ...x, titel: e.target.value }))} placeholder="Programmpunkt" maxLength={120}/>
          <input style={inp} value={f.beschreibung} onChange={e => setF(x => ({ ...x, beschreibung: e.target.value }))} placeholder="Details (optional)" maxLength={500}/>
          <div><button type="submit" style={btn} disabled={!f.titel.trim()}>Hinzufügen</button></div>
        </form>
      )}
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

const MAHL = ['Frühstück', 'Mittagessen', 'Abendessen']
const dayLabel = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })

function Meals({ offer, asId, isOwner }) {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [f, setF] = useState({ von: offer.von || offer.datum || '', bis: offer.bis || offer.datum || '', arten: ['Mittagessen', 'Abendessen'] })
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_meals_list', { p_offer: offer.id, p_as: asId })
    setList(data || [])
  }, [offer.id, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  async function act(id, action, titel) {
    setErr('')
    const { error } = await supabase.rpc('meal_act', { p_id: id, p_as: asId, p_action: action, p_titel: titel || null })
    if (error) setErr(error.message)
    load()
  }
  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.rpc('meals_add', { p_offer: offer.id, p_as: asId, p_von: f.von, p_bis: f.bis, p_arten: f.arten })
    if (error) setErr(error.message)
    load()
  }
  let last = null
  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{isOwner ? 'Lege unten die Mahlzeiten an. Danach tragen sich Teilnehmende als Köche ein.' : 'Noch keine Mahlzeiten angelegt.'}</div>}
      {list.map(m => {
        const head = m.tag !== last ? (last = m.tag, dayLabel(m.tag)) : null
        return (
          <div key={m.id}>
            {head && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', margin: '10px 0 4px' }}>{head}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ width: 96, fontWeight: 700, flexShrink: 0 }}>{m.mahlzeit}</span>
              <div style={{ flex: 1, minWidth: 140 }}>
                {m.titel && <div style={{ fontSize: 14 }}>{m.titel}</div>}
                <div style={{ fontSize: 12, color: m.cooks.length ? 'var(--text)' : 'var(--muted)' }}>{m.cooks.length ? `👩‍🍳 ${m.cooks.join(', ')}` : '🙋 Noch niemand – wer kocht?'}</div>
              </div>
              {m.mine
                ? <><button style={ghost} onClick={() => { const t = window.prompt('Was gibt es? (Menü)', m.titel || ''); if (t !== null) act(m.id, 'title', t) }}>Menü</button><button style={ghost} onClick={() => act(m.id, 'uncook')}>Abgeben</button></>
                : (!isOwner && <button style={btn} onClick={() => act(m.id, 'cook')}>Ich koche</button>)}
              {isOwner && <button style={ghost} onClick={() => act(m.id, 'delete')}>×</button>}
            </div>
          </div>
        )
      })}
      {isOwner && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Mahlzeiten anlegen</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
            <input style={inp} type="date" value={f.von} onChange={e => setF(x => ({ ...x, von: e.target.value }))}/>
            <input style={inp} type="date" value={f.bis} onChange={e => setF(x => ({ ...x, bis: e.target.value }))}/>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MAHL.map(a => {
              const on = f.arten.includes(a)
              return <button type="button" key={a} onClick={() => setF(x => ({ ...x, arten: on ? x.arten.filter(y => y !== a) : [...x.arten, a] }))} style={{ ...ghost, background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--muted)' }}>{a}</button>
            })}
          </div>
          <div><button type="submit" style={btn} disabled={!f.von || !f.bis || f.arten.length === 0}>Anlegen</button></div>
        </form>
      )}
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

function Rides({ offer, asId, isOwner }) {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ plaetze: 3, ort: '', abfahrt: '', notiz: '' })
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_rides_list', { p_offer: offer.id, p_as: asId })
    setList(data || [])
  }, [offer.id, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  async function act(id, action) {
    setErr('')
    const { error } = await supabase.rpc('ride_act', { p_id: id, p_as: asId, p_action: action })
    if (error) setErr(error.message)
    load()
  }
  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.rpc('ride_add', { p_offer: offer.id, p_as: asId, p_plaetze: parseInt(f.plaetze, 10), p_ort: f.ort, p_abfahrt: f.abfahrt || null, p_notiz: f.notiz })
    if (error) { setErr(error.message); return }
    setOpen(false); load()
  }
  const hasOwn = list.some(r => r.mine)
  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Noch kein Auto eingetragen. Kommst du mit dem Auto? Biete freie Plätze an.</div>}
      {list.map(r => {
        const free = r.plaetze - r.taken
        return (
          <div key={r.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>🚗</span>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div><strong>{r.mine ? 'Du' : r.driver_name}</strong>{r.ort ? ` · ab ${r.ort}` : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.abfahrt ? new Date(r.abfahrt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : 'Zeit offen'}</div>
              </div>
              <div style={{ minWidth: 110 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: r.plaetze }).map((_, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: i < r.taken ? 'var(--g)' : 'transparent', border: '1.5px solid var(--g)' }}/>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{free > 0 ? `${free} von ${r.plaetze} Plätzen frei` : 'voll'}</div>
              </div>
              {!isOwner && !r.mine && !r.i_ride && free > 0 && <button style={btn} onClick={() => act(r.id, 'join')}>{list.some(x => x.i_ride) ? 'Wechseln' : 'Mitfahren'}</button>}
              {r.i_ride && <button style={ghost} onClick={() => act(r.id, 'leave')}>Aussteigen</button>}
              {(r.mine || isOwner) && <button style={ghost} onClick={() => act(r.id, 'delete')}>{r.mine ? 'Löschen' : 'Entfernen'}</button>}
            </div>
            {(r.notiz || r.riders.length > 0) && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, marginLeft: 38 }}>{r.notiz}{r.notiz && r.riders.length ? ' · ' : ''}{r.riders.length ? `Mit: ${r.riders.join(', ')}` : ''}</div>}
          </div>
        )
      })}
      {isOwner && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Als Kommune kannst du keine Fahrt anbieten. Wechsle zu deinem persönlichen Profil, um selbst mitzufahren.</div>}
      {!isOwner && !hasOwn && !open && <button style={{ ...btn, marginTop: 12 }} onClick={() => setOpen(true)}>🚗 Ich komme mit dem Auto</button>}
      {open && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Freie Plätze<input style={inp} type="number" min="1" max="8" inputMode="numeric" value={f.plaetze} onChange={e => setF(x => ({ ...x, plaetze: e.target.value }))}/></label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Abfahrt<input style={inp} type="datetime-local" value={f.abfahrt} onChange={e => setF(x => ({ ...x, abfahrt: e.target.value }))}/></label>
          </div>
          <input style={inp} value={f.ort} onChange={e => setF(x => ({ ...x, ort: e.target.value }))} placeholder="Abfahrtsort, z.B. Köln Hbf" maxLength={80}/>
          <input style={inp} value={f.notiz} onChange={e => setF(x => ({ ...x, notiz: e.target.value }))} placeholder="Notiz (optional), z.B. Platz für Gepäck" maxLength={200}/>
          <div style={{ display: 'flex', gap: 8 }}><button type="submit" style={btn}>Eintragen</button><button type="button" style={ghost} onClick={() => setOpen(false)}>Abbrechen</button></div>
        </form>
      )}
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}

export default function OfferOrganisation({ offer, asId, role, onOfferChange }) {
  const isOwner = role === 'owner'
  const modus = offer.essen_modus
  const tabs = [
    ...(modus === 'gemeinschaft' ? [['meals', '🍲 Mahlzeiten']] : []),
    ...(modus === 'versorgt' ? [] : modus === 'gemeinschaft' ? [['essen', '🥙 Mitbringen']] : [['essen', '🥙 Mitbringen']]),
    ['aufgaben', '✅ Aufgaben'], ['rides', '🚗 Mitfahren'], ['plan', '🕒 Zeitplan'],
  ]
  const [tab, setTab] = useState(tabs[0][0])
  const cur = tabs.some(t => t[0] === tab) ? tab : tabs[0][0]
  async function setModus(v) {
    const { error } = await supabase.from('offers').update({ essen_modus: v || null }).eq('id', offer.id)
    if (!error && onOfferChange) onOfferChange({ essen_modus: v || null })
  }
  return (
    <div style={card}>
      {isOwner && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>🍽️ Essensorganisation (nur du als Kommune stellst das ein)
          <select value={modus || ''} onChange={e => setModus(e.target.value)} style={{ ...inp, marginTop: 4 }}>
            <option value="">– noch nicht festgelegt –</option>
            <option value="versorgt">Für Essen ist gesorgt (Veranstalter)</option>
            <option value="gemeinschaft">Gemeinschaftsessen (mehrere Mahlzeiten, wechselnde Köche)</option>
            <option value="buffet">Buffet (jeder bringt etwas mit)</option>
          </select>
        </label>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ ...ghost, fontSize: 13, padding: '7px 12px', background: cur === k ? 'var(--g)' : 'transparent', color: cur === k ? 'white' : 'var(--text)', fontWeight: 600 }}>{l}</button>)}
      </div>
      {modus === 'versorgt' && <div style={{ fontSize: 13, marginBottom: 12, background: 'var(--bg)', borderRadius: 10, padding: '8px 12px' }}>🍽️ Für das Essen ist gesorgt – du musst nichts mitbringen.</div>}
      {cur === 'meals' && <Meals offer={offer} asId={asId} isOwner={isOwner}/>}
      {cur === 'rides' && <Rides offer={offer} asId={asId} isOwner={isOwner}/>}
      {cur === 'essen' && <Dishes offerId={offer.id} asId={asId} isOwner={isOwner}/>}
      {cur === 'aufgaben' && <Tasks offerId={offer.id} asId={asId} isOwner={isOwner}/>}
      {cur === 'plan' && <Schedule offerId={offer.id} isOwner={isOwner} offer={offer}/>}
    </div>
  )
}
