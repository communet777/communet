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
    const { error } = await supabase.rpc('dish_add', { p_offer: offerId, p_as: asId, p_category: form.category, p_name: form.name, p_tags: form.tags, p_note: form.note, p_wish: form.wish })
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
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Noch nichts eingetragen. Trag ein, was du mitbringst – doppelte Einträge werden verhindert.</div>}
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
              {!d.claimed_by && <button style={btn} onClick={() => act(d.id, 'claim')}>Ich bring’s</button>}
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
        {dupe && <div style={{ fontSize: 13, color: '#b3261e' }}>⚠️ „{dupe.name}“ gibt es schon{dupe.claimed_by ? ` – ${dupe.mine ? 'du bringst es mit' : (dupe.claimed_name || 'jemand') + ' bringt es mit'}` : ' auf der Wunschliste'}.</div>}
        <input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Notiz (optional), z.B. für 8 Personen" maxLength={200}/>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TAGS.map(t => {
            const on = form.tags.includes(t)
            return <button type="button" key={t} onClick={() => setForm(f => ({ ...f, tags: on ? f.tags.filter(x => x !== t) : [...f.tags, t] }))} style={{ ...ghost, background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--muted)' }}>{t}</button>
          })}
        </div>
        {isOwner && <label style={{ fontSize: 13 }}><input type="checkbox" checked={form.wish} onChange={e => setForm(f => ({ ...f, wish: e.target.checked }))}/> Als Wunsch eintragen (andere übernehmen es mit „Ich bring’s“)</label>}
        <div><button type="submit" style={btn} disabled={!form.name.trim() || !!dupe}>{form.wish ? 'Wunsch eintragen' : 'Ich bringe mit'}</button></div>
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
          {!t.assignee && <button style={btn} onClick={() => act(t.id, 'take')}>Übernehmen</button>}
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

export default function OfferOrganisation({ offer, asId, role }) {
  const [tab, setTab] = useState('essen')
  const isOwner = role === 'owner'
  const tabs = [['essen', '🥙 Mitbringen'], ['aufgaben', '✅ Aufgaben'], ['plan', '🕒 Zeitplan']]
  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ ...ghost, fontSize: 13, padding: '7px 12px', background: tab === k ? 'var(--g)' : 'transparent', color: tab === k ? 'white' : 'var(--text)', fontWeight: 600 }}>{l}</button>)}
      </div>
      {tab === 'essen' && <Dishes offerId={offer.id} asId={asId} isOwner={isOwner}/>}
      {tab === 'aufgaben' && <Tasks offerId={offer.id} asId={asId} isOwner={isOwner}/>}
      {tab === 'plan' && <Schedule offerId={offer.id} isOwner={isOwner} offer={offer}/>}
    </div>
  )
}
