import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import OfferChat from './OfferChat'
import OfferFiles from './OfferFiles'

const CATS = ['Vorspeise', 'Hauptgericht', 'Beilage', 'Dessert', 'Getränke', 'Material / Sonstiges']
const TAGS = ['vegan', 'vegetarisch', 'glutenfrei', 'Nüsse', 'laktosefrei']
const card = { background: 'var(--card)', borderRadius: 14, padding: 20, marginBottom: 24 }
const inp = { padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, boxSizing: 'border-box', width: '100%' }
const btn = { padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--g)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
const ghost = { padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }

const subHead = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '8px 0 4px' }
const SLOTS = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snacks']
const SLOT_CAT = { 'Frühstück': 'Frühstück', 'Snacks': 'Snacks' }
const dayLabel = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
const dayShort = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })

function offerDays(offer, dishes) {
  const from = offer.von || offer.datum, to = offer.bis || from
  const out = []
  if (from) {
    const d = new Date(from + 'T12:00:00'), end = new Date((to < from ? from : to) + 'T12:00:00')
    for (let i = 0; d <= end && i < 31; i++, d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10))
  }
  for (const x of dishes) if (x.tag && !out.includes(x.tag)) out.push(x.tag)
  return out.sort()
}

function useDishes(offer, asId) {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_dishes_list2', { p_offer: offer.id, p_as: asId })
    setList(data || [])
  }, [offer.id, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  async function add(fields) {
    setErr('')
    const { error } = await supabase.rpc('dish_add2', { p_offer: offer.id, p_as: asId, p_category: fields.category, p_name: fields.name, p_tags: fields.tags || [], p_note: fields.note || '', p_wish: !!fields.wish, p_tag: fields.tag || null, p_slot: fields.slot || null })
    if (error) { setErr(error.message); return false }
    load(); return true
  }
  async function act(id, action) {
    setErr('')
    const { error } = await supabase.rpc('dish_act', { p_id: id, p_as: asId, p_action: action })
    if (error) setErr(error.message)
    load()
  }
  async function move(id, value) {
    setErr('')
    const [tag, slot] = value ? value.split('|') : [null, null]
    const { error } = await supabase.rpc('dish_move', { p_id: id, p_as: asId, p_tag: tag, p_slot: slot })
    if (error) setErr(error.message)
    load()
  }
  async function edit(id, fields) {
    setErr('')
    const { error } = await supabase.rpc('dish_edit', { p_id: id, p_as: asId, p_name: fields.name, p_category: fields.category, p_tags: fields.tags || [], p_note: fields.note || '' })
    if (error) { setErr(error.message); return false }
    load(); return true
  }
  return { list, err, add, act, move, edit }
}

function EditDish({ dish, onSave, onCancel }) {
  const [f, setF] = useState({ name: dish.name || '', category: dish.category || CATS[1], note: dish.note || '', tags: dish.tags || [] })
  const cats = [...new Set([...CATS, 'Frühstück', 'Snacks', dish.category].filter(Boolean))]
  async function submit(e) { e.preventDefault(); if (await onSave(dish.id, f)) onCancel() }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 6, width: '100%', padding: '8px 0' }}>
      <input autoFocus style={inp} value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} maxLength={80} placeholder="Name des Gerichts"/>
      <select style={inp} value={f.category} onChange={e => setF(x => ({ ...x, category: e.target.value }))}>{cats.map(c => <option key={c}>{c}</option>)}</select>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TAGS.map(t => { const on = f.tags.includes(t); return <button type="button" key={t} onClick={() => setF(x => ({ ...x, tags: on ? x.tags.filter(y => y !== t) : [...x.tags, t] }))} style={{ ...ghost, background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--muted)' }}>{t}</button> })}
      </div>
      <input style={inp} value={f.note} onChange={e => setF(x => ({ ...x, note: e.target.value }))} maxLength={200} placeholder="Notiz (optional)"/>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" style={btn} disabled={!f.name.trim()}>Speichern</button>
        <button type="button" style={ghost} onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  )
}

function MoveSelect({ dish, days, onMove, off = [] }) {
  if (!dish.can_move) return null
  const val = dish.tag && dish.slot ? `${dish.tag}|${dish.slot}` : ''
  return (
    <select value={val} onChange={e => onMove(dish.id, e.target.value)} style={{ ...inp, width: 'auto', maxWidth: '100%', padding: '5px 8px', fontSize: 12 }} title="Einer Mahlzeit zuordnen">
      <option value="">Keiner Mahlzeit zugeordnet</option>
      {days.map(d => <optgroup key={d} label={dayShort(d)}>{SLOTS.filter(sl => !off.includes(`${d}|${sl}`)).map(sl => <option key={sl} value={`${d}|${sl}`}>{dayShort(d)} · {sl}</option>)}</optgroup>)}
    </select>
  )
}

function Dishes({ offer, asId, isOwner, store }) {
  const { list, err, add, act, move, edit } = store
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: CATS[1], note: '', tags: [] })
  const days = offerDays(offer, list)
  const typed = form.name.trim().toLowerCase()
  const dupe = typed && list.find(d => d.name.trim().toLowerCase() === typed)

  async function submit(e) {
    e.preventDefault()
    if (await add({ ...form, wish: isOwner })) setForm(f => ({ ...f, name: '', note: '', tags: [] }))
  }
  const cats = [...new Set([...CATS, ...list.map(d => d.category)])].filter(c => list.some(d => d.category === c))

  return (
    <div>
      {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Noch nichts eingetragen. {isOwner ? 'Trage hier Wünsche ein, z.B. „Hauptgericht“ oder „Getränke“.' : 'Trag ein, was du mitbringst – bei Doppelungen bekommst du eine Warnung. Unter „Mahlzeiten“ kannst du es einem Tag zuordnen.'}</div>}
      {cats.map(c => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>{c}</div>
          {list.filter(d => d.category === c).map(d => editing === d.id ? (
            <div key={d.id} style={{ borderTop: '1px solid var(--border)' }}><EditDish dish={d} onSave={edit} onCancel={() => setEditing(null)}/></div>
          ) : (
            <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <strong>{d.name}</strong>
                {d.tags?.map(t => <span key={t} style={{ marginLeft: 6, fontSize: 11, background: '#E1ECEE', color: 'var(--g)', borderRadius: 10, padding: '1px 8px' }}>{t}</span>)}
                {d.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.note}</div>}
                {d.tag && d.slot && <div style={{ fontSize: 12, color: 'var(--g)' }}>🍲 {dayShort(d.tag)} · {d.slot}</div>}
              </div>
              <span style={{ fontSize: 12, color: d.claimed_by ? 'var(--text)' : 'var(--muted)' }}>{d.claimed_by ? (d.mine ? '✓ Du bringst mit' : `✓ ${d.claimed_name || 'Jemand'}`) : '🙋 Gesucht'}</span>
              {!d.claimed_by && !isOwner && <button style={btn} onClick={() => act(d.id, 'claim')}>Ich bring’s</button>}
              {(d.can_move || isOwner) && <button style={ghost} onClick={() => setEditing(d.id)}>✏️ Bearbeiten</button>}
              {d.mine && <button style={ghost} onClick={() => act(d.id, 'release')}>Zurückziehen</button>}
              {isOwner && !d.mine && <button style={ghost} onClick={() => act(d.id, 'delete')}>Entfernen</button>}
              {offer.essen_modus === 'gemeinschaft' && <MoveSelect dish={d} days={days} onMove={move} off={offer.mahlzeiten_aus || []}/>}
            </div>
          ))}
        </div>
      ))}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
          <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Hummus" maxLength={80}/>
          <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{[...CATS, 'Frühstück', 'Snacks'].map(c => <option key={c}>{c}</option>)}</select>
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

const ZEITEN = [['morgens', 'Morgens'], ['mittags', 'Mittags'], ['abends', 'Abends']]
const zeitLabel = z => (ZEITEN.find(x => x[0] === z) || [null, 'Ganztägig'])[1]
// Programmpunkt mit Uhrzeit -> Tageszeit
const zeitVon = uhr => !uhr ? null : (parseInt(uhr, 10) < 11 ? 'morgens' : parseInt(uhr, 10) < 17 ? 'mittags' : 'abends')

function useTasks(offerId, asId) {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('offer_tasks_list3', { p_offer: offerId, p_as: asId })
    setList(data || [])
  }, [offerId, asId])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  async function act(id, action) {
    setErr('')
    const { error } = await supabase.rpc('task_act2', { p_id: id, p_as: asId, p_action: action })
    if (error) setErr(error.message)
    load()
  }
  async function add(f) {
    setErr('')
    const { error } = await supabase.rpc('task_add3', { p_offer: offerId, p_as: asId, p_title: f.title, p_tag: f.tag || null, p_zeit: f.zeit || null, p_anzahl: f.anzahl ? parseInt(f.anzahl, 10) : null })
    if (error) { setErr(error.message); return false }
    load(); return true
  }
  async function setWhen(id, tag, zeit) {
    setErr('')
    const { error } = await supabase.rpc('task_set_when', { p_id: id, p_as: asId, p_tag: tag || null, p_zeit: zeit || null })
    if (error) setErr(error.message)
    load()
  }
  return { list, err, act, add, setWhen }
}

const mini = { padding: '3px 8px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }
const miniBtn = { ...mini, border: 'none', background: 'var(--g)', color: 'white', fontWeight: 600 }
const chip = on => ({ ...mini, fontSize: 12, padding: '5px 10px', background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--text)', borderColor: on ? 'var(--g)' : 'var(--border)' })

// Eine Aufgabe; mehrere Personen können mitmachen. compact = in der Ablauf-Spalte
function TaskRow({ t, isOwner, tasks, days, compact, allDay }) {
  const [more, setMore] = useState(false)
  const people = t.people || []
  const full = t.anzahl && people.length >= t.anzahl
  const canTick = t.mine || isOwner
  return (
    <div style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <button onClick={() => canTick && tasks.act(t.id, 'toggle')} aria-label={t.done ? 'Als offen markieren' : 'Als erledigt markieren'} style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1, borderRadius: 5, border: '1.5px solid var(--g)', background: t.done ? 'var(--g)' : 'transparent', color: 'white', fontSize: 11, lineHeight: '14px', padding: 0, cursor: canTick ? 'pointer' : 'default', opacity: canTick ? 1 : .5 }}>{t.done ? '✓' : ''}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'var(--text)', wordBreak: 'break-word' }}>{t.title}{allDay && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 5px', marginLeft: 4 }}>ganztägig</span>}</div>
          {!compact && (t.tag || t.zeit) && <div style={{ fontSize: 11, color: 'var(--g)', marginTop: 1 }}>{t.tag ? `${dayShort(t.tag)} · ${zeitLabel(t.zeit)}` : zeitLabel(t.zeit)}</div>}
          <div style={{ fontSize: 12, color: people.length ? 'var(--muted)' : '#b3261e', marginTop: 2, wordBreak: 'break-word' }}>
            {people.length ? `👥 ${people.map(p => p.name).join(', ')}` : '🙋 noch niemand'}{t.anzahl ? ` (${people.length}/${t.anzahl})` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            {!t.mine && !t.done && !full && <button style={miniBtn} onClick={() => tasks.act(t.id, 'join')}>Mitmachen</button>}
            {t.mine && !t.done && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g)' }}>✓ Du bist dabei</span>}
            <button style={{ ...mini, border: 'none', padding: '2px 4px' }} onClick={() => setMore(v => !v)} aria-label="Mehr">⋯</button>
          </div>
          {more && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {t.mine && <button style={mini} onClick={() => tasks.act(t.id, 'leave')}>Austragen</button>}
              {(t.can_edit || t.mine) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', width: '100%' }}>↔ Verschieben:
                <select value={`${t.tag || ''}|${t.zeit || ''}`} onChange={e => { const [d, z] = e.target.value.split('|'); tasks.setWhen(t.id, d, z); setMore(false) }} style={{ ...mini, padding: '4px 6px', fontSize: 12, color: 'var(--text)', maxWidth: '100%' }} aria-label="Verschieben nach">
                  <option value="|">📦 Ohne festen Tag</option>
                  {days.map(d => (
                    <optgroup key={d} label={dayLabel(d)}>
                      {[['', 'Ganztägig'], ...ZEITEN].map(([z, l]) => <option key={z} value={`${d}|${z}`}>{dayShort(d)} · {l}</option>)}
                    </optgroup>
                  ))}
                </select>
                </label>
              )}
              {t.can_edit && <button style={mini} onClick={() => tasks.act(t.id, 'delete')}>Löschen</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskAdd({ tasks, days, fixedDay, fixedZeit, label = '＋ Aufgabe', small }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', tag: fixedDay || '', zeit: fixedZeit || '', anzahl: '' })
  async function submit(e) {
    e.preventDefault()
    if (await tasks.add({ ...f, tag: fixedDay || f.tag, zeit: fixedZeit !== undefined ? fixedZeit : f.zeit })) { setF(x => ({ ...x, title: '', anzahl: '' })); setOpen(false) }
  }
  if (!open) return small
    ? <button style={{ ...mini, border: 'none', padding: '0 4px', fontSize: 15, color: 'var(--g)' }} onClick={() => setOpen(true)} aria-label="Aufgabe hinzufügen">＋</button>
    : <button style={{ ...ghost, border: '1.5px dashed var(--border)', marginTop: 6 }} onClick={() => setOpen(true)}>{label}</button>
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 6, marginTop: 6, width: '100%' }}>
      <input autoFocus style={inp} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="z.B. Rosen pflanzen" maxLength={120}/>
      {!fixedDay && days.length > 0 && (
        <select style={inp} value={f.tag} onChange={e => setF(x => ({ ...x, tag: e.target.value }))}>
          <option value="">Ohne festen Tag</option>
          {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>
      )}
      {fixedZeit === undefined && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['', 'Ganztägig'], ...ZEITEN].map(([k, l]) => <button type="button" key={k} style={chip(f.zeit === k)} onClick={() => setF(x => ({ ...x, zeit: k }))}>{l}</button>)}
        </div>
      )}
      <input style={inp} type="number" min="1" max="50" inputMode="numeric" value={f.anzahl} onChange={e => setF(x => ({ ...x, anzahl: e.target.value }))} placeholder="Wie viele Leute? (optional)"/>
      <div style={{ display: 'flex', gap: 6 }}><button type="submit" style={btn} disabled={!f.title.trim()}>Hinzufügen</button><button type="button" style={ghost} onClick={() => setOpen(false)}>Abbrechen</button></div>
    </form>
  )
}

function Tasks({ isOwner, tasks, days }) {
  const open = tasks.list.filter(t => !t.done), done = tasks.list.filter(t => t.done)
  return (
    <div>
      <div style={{ marginBottom: 8 }}><TaskAdd tasks={tasks} days={days} label="＋ Aufgabe hinzufügen"/></div>
      {tasks.list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Noch keine Aufgaben. Jeder in der Gruppe kann welche anlegen, z.B. Aufbau, Einkauf, Rosen pflanzen.</div>}
      {open.map(t => <TaskRow key={t.id} t={t} isOwner={isOwner} tasks={tasks} days={days}/>)}
      {done.length > 0 && <div style={{ ...subHead, marginTop: 16 }}>Erledigt ({done.length})</div>}
      {done.map(t => <TaskRow key={t.id} t={t} isOwner={isOwner} tasks={tasks} days={days}/>)}
      {tasks.err && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{tasks.err}</p>}
    </div>
  )
}

function useSchedule(offerId) {
  const [list, setList] = useState([])
  const load = useCallback(async () => {
    const { data } = await supabase.from('offer_schedule').select('*').eq('offer_id', offerId).order('tag', { nullsFirst: true }).order('uhrzeit', { nullsFirst: true })
    setList(data || [])
  }, [offerId])
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])
  return { list, load }
}

// Programmpunkte eines Tages (day = 'YYYY-MM-DD' oder null für "ohne Datum")
function ScheduleDay({ offerId, isOwner, day, items, reload, mode = 'all' }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ uhrzeit: '', titel: '', beschreibung: '' })
  const [err, setErr] = useState('')
  async function add(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.from('offer_schedule').insert({ offer_id: offerId, tag: day || null, uhrzeit: f.uhrzeit || null, titel: f.titel.trim(), beschreibung: f.beschreibung.trim() || null })
    if (error) { setErr(error.message); return }
    setF({ uhrzeit: '', titel: '', beschreibung: '' }); setOpen(false); reload()
  }
  async function del(id) { await supabase.from('offer_schedule').delete().eq('id', id); reload() }
  if (mode === 'form' && !isOwner) return null
  if (mode !== 'form' && !items.length && !isOwner) return null
  return (
    <div>
      {mode !== 'form' && items.map(s => (
        <div key={s.id} style={{ display: 'flex', gap: 6, padding: '6px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g)' }}>🕒 {s.uhrzeit ? s.uhrzeit.slice(0, 5) : 'ohne Uhrzeit'}</div>
            <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>{s.titel}</div>
            {s.beschreibung && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.beschreibung}</div>}
          </div>
          {isOwner && <button style={{ ...mini, border: 'none' }} onClick={() => del(s.id)} aria-label="Programmpunkt löschen">×</button>}
        </div>
      ))}
      {isOwner && mode !== 'rows' && !open && <button style={{ ...ghost, border: '1.5px dashed var(--border)', marginTop: 6 }} onClick={() => setOpen(true)}>＋ Programmpunkt mit Uhrzeit</button>}
      {isOwner && mode !== 'rows' && open && (
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 6, marginTop: 6 }}>
          <input style={inp} type="time" value={f.uhrzeit} onChange={e => setF(x => ({ ...x, uhrzeit: e.target.value }))} aria-label="Uhrzeit"/>
          <input autoFocus style={inp} value={f.titel} onChange={e => setF(x => ({ ...x, titel: e.target.value }))} placeholder="z.B. Schalung stellen" maxLength={120}/>
          <input style={{ ...inp, gridColumn: '1 / -1' }} value={f.beschreibung} onChange={e => setF(x => ({ ...x, beschreibung: e.target.value }))} placeholder="Details (optional)" maxLength={500}/>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6 }}><button type="submit" style={btn} disabled={!f.titel.trim()}>Hinzufügen</button><button type="button" style={ghost} onClick={() => setOpen(false)}>Abbrechen</button></div>
        </form>
      )}
      {err && <p style={{ color: '#b3261e', fontSize: 13, margin: '6px 0 0' }}>{err}</p>}
    </div>
  )
}


// Ablauf: pro Tag eine Karte mit Programm und (bei Gemeinschaftsessen) Mahlzeiten
// Tageszeit -> passende Mahlzeit(en) in der rechten Spalte
const ZEIT_MEALS = { morgens: ['Frühstück'], mittags: ['Mittagessen'], abends: ['Abendessen', 'Snacks'] }

function Ablauf({ offer, isOwner, store, tasks, days: baseDays, onOfferChange }) {
  const sched = useSchedule(offer.id)
  const meals = offer.essen_modus === 'gemeinschaft'
  const mealOff = useMealOff(offer, store, onOfferChange)
  const days = [...new Set([...baseDays, ...sched.list.map(s => s.tag).filter(Boolean)])].sort()
  const undated = sched.list.filter(s => !s.tag)
  const today = new Date().toLocaleDateString('sv-SE')
  const cols = meals ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)'
  const tag = <span style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 5px', marginLeft: 4 }}>ganztägig</span>
  if (days.length === 0 && undated.length === 0 && !isOwner) return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Noch kein Ablauf eingetragen.</div>
  return (
    <div>
      {meals && <MealsExtras offer={offer} isOwner={isOwner} store={store} onOfferChange={onOfferChange} days={days}/>}
      {days.length === 0 && isOwner && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Für die Tagesansicht braucht das Angebot ein Von-/Bis-Datum oder ein Veranstaltungsdatum. Programmpunkte ohne Datum kannst du unten eintragen.</div>}
      {days.map(day => {
        const allDayProg = sched.list.filter(x => x.tag === day && !x.uhrzeit)
        const allDayTasks = tasks.list.filter(t => t.tag === day && !t.zeit)
        return (
          <div key={day} style={{ marginBottom: 14, border: `1.5px solid ${day === today ? 'var(--gold,#E9AD55)' : 'var(--border)'}`, borderRadius: 12, padding: '10px 12px', background: 'var(--bg)' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{dayLabel(day)}{day === today && <span style={{ marginLeft: 8, fontSize: 11, color: '#173F4A', background: 'var(--gold,#E9AD55)', borderRadius: 10, padding: '1px 8px' }}>Heute</span>}</div>
            <TaskAdd tasks={tasks} days={days} fixedDay={day} label="＋ Aufgabe hinzufügen"/>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, marginTop: 8 }}>
              <div style={subHead}>🛠️ Aufgaben</div>
              {meals && <div style={{ ...subHead, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>🍲 Essen</div>}
            </div>
            {ZEITEN.map(([z, l]) => {
              const prog = sched.list.filter(x => x.tag === day && x.uhrzeit && zeitVon(x.uhrzeit) === z)
              const tl = tasks.list.filter(t => t.tag === day && t.zeit === z)
              const empty = !prog.length && !tl.length && !allDayProg.length && !allDayTasks.length
              return (
                <div key={z} style={{ borderTop: '1px solid var(--border)', padding: '6px 0 4px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g)', marginBottom: 2 }}>{l}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <ScheduleDay offerId={offer.id} isOwner={isOwner} day={day} items={prog} reload={sched.load} mode="rows"/>
                      {tl.map(t => <TaskRow key={t.id} t={t} isOwner={isOwner} tasks={tasks} days={days} compact/>)}
                      {allDayProg.map(x => <div key={x.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 14, fontWeight: 600 }}>{x.titel}{tag}</div>)}
                      {allDayTasks.map(t => <TaskRow key={t.id} t={t} isOwner={isOwner} tasks={tasks} days={days} compact allDay/>)}
                      {empty && <div style={{ fontSize: 12, color: 'var(--muted)' }}>–</div>}
                    </div>
                    {meals && (
                      <div style={{ minWidth: 0, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
                        {ZEIT_MEALS[z].map(sl => <MealSlot key={sl} offer={offer} isOwner={isOwner} store={store} mealOff={mealOff} day={day} sl={sl} days={days}/>)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <ScheduleDay offerId={offer.id} isOwner={isOwner} day={day} items={[]} reload={sched.load} mode="form"/>
            {meals && isOwner && SLOTS.some(sl => !mealOff.isOff(day, sl)) && <button style={{ ...mini, marginTop: 6, marginLeft: 6 }} onClick={() => mealOff.hide(day, SLOTS)}>Tag ohne Essen</button>}
          </div>
        )
      })}
      {(undated.length > 0 || isOwner) && (
        <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Programm ohne festen Tag</div>
          <ScheduleDay offerId={offer.id} isOwner={isOwner} day={null} items={undated} reload={sched.load}/>
        </div>
      )}
      {(tasks.err || mealOff.err || store.err) && <p style={{ color: '#b3261e', fontSize: 13, margin: '8px 0 0' }}>{tasks.err || mealOff.err || store.err}</p>}
    </div>
  )
}

function useMealOff(offer, store, onOfferChange) {
  const [err, setErr] = useState('')
  const off = offer.mahlzeiten_aus || []
  const isOff = (day, sl) => off.includes(`${day}|${sl}`)
  async function setOff(next) {
    setErr('')
    const { error } = await supabase.from('offers').update({ mahlzeiten_aus: next }).eq('id', offer.id)
    if (error) setErr(error.message)
    else if (onOfferChange) onOfferChange({ mahlzeiten_aus: next })
  }
  function hide(day, slots) {
    const busy = slots.filter(sl => store.list.some(d => d.tag === day && d.slot === sl))
    if (busy.length) { setErr(`„${busy.join(', ')}“ am ${dayShort(day)} enthält noch Gerichte – verschiebe oder entferne sie zuerst.`); return }
    setOff([...new Set([...off, ...slots.map(sl => `${day}|${sl}`)])])
  }
  function unhide(keys) { setOff(off.filter(k => !keys.includes(k))) }
  return { off, isOff, hide, unhide, err }
}

function MealItem({ d, isOwner, store, days, off }) {
  const { act, move, edit } = store
  const [more, setMore] = useState(false)
  const [editing, setEditing] = useState(false)
  if (editing) return <EditDish dish={d} onSave={edit} onCancel={() => setEditing(false)}/>
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>{d.name}{d.tags?.map(t => <span key={t} style={{ marginLeft: 4, fontSize: 10, fontWeight: 400, background: '#E1ECEE', color: 'var(--g)', borderRadius: 10, padding: '1px 6px' }}>{t}</span>)}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: d.claimed_by ? 'var(--muted)' : '#b3261e' }}>{d.claimed_by ? (d.mine ? '👩‍🍳 Du' : `👩‍🍳 ${d.claimed_name || 'Jemand'}`) : '🙋 Gesucht'}</span>
        {!d.claimed_by && !isOwner && <button style={miniBtn} onClick={() => act(d.id, 'claim')}>Ich bring’s</button>}
        {(d.can_move || isOwner || d.mine) && <button style={{ ...mini, border: 'none', padding: '2px 4px' }} onClick={() => setMore(v => !v)} aria-label="Mehr">⋯</button>}
      </div>
      {more && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {(d.can_move || isOwner) && <button style={mini} onClick={() => setEditing(true)}>✏️ Bearbeiten</button>}
          {d.mine && <button style={mini} onClick={() => act(d.id, 'release')}>Zurückziehen</button>}
          {isOwner && !d.mine && <button style={mini} onClick={() => act(d.id, 'delete')}>Entfernen</button>}
          <MoveSelect dish={d} days={days} onMove={move} off={off}/>
        </div>
      )}
    </div>
  )
}

// Eine Mahlzeit (z.B. Abendessen) eines Tages in der rechten Spalte
function MealSlot({ offer, isOwner, store, mealOff, day, sl, days }) {
  const [quick, setQuick] = useState(false)
  const [name, setName] = useState('')
  if (mealOff.isOff(day, sl)) return sl === 'Snacks' ? null : <div style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0' }}>{sl}: kein Essen</div>
  const items = store.list.filter(d => d.tag === day && d.slot === sl)
  async function submit(e) {
    e.preventDefault()
    const ok = await store.add({ name, category: SLOT_CAT[sl] || 'Hauptgericht', wish: isOwner, tag: day, slot: sl })
    if (ok) { setName(''); setQuick(false) }
  }
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
        <span style={{ flex: 1 }}>{sl}</span>
        {!quick && <button style={{ ...mini, border: 'none', padding: '0 4px', fontSize: 15, color: 'var(--g)' }} onClick={() => { setQuick(true); setName('') }} aria-label={`${isOwner ? 'Wunsch' : 'Gericht'} für ${sl} eintragen`}>＋</button>}
        {isOwner && <button title="Diese Mahlzeit ausblenden" style={{ ...mini, border: 'none', padding: '0 4px' }} onClick={() => mealOff.hide(day, [sl])}>×</button>}
      </div>
      {items.map(d => <MealItem key={d.id} d={d} isOwner={isOwner} store={store} days={days} off={mealOff.off}/>)}
      {items.length === 0 && !quick && <div style={{ fontSize: 12, color: 'var(--muted)' }}>–</div>}
      {quick && (
        <form onSubmit={submit} style={{ display: 'grid', gap: 4 }}>
          <input autoFocus style={inp} value={name} onChange={e => setName(e.target.value)} placeholder={isOwner ? 'Was wird gesucht?' : 'Was kochst du?'} maxLength={80}/>
          <div style={{ display: 'flex', gap: 4 }}><button type="submit" style={miniBtn} disabled={!name.trim()}>OK</button><button type="button" style={mini} onClick={() => setQuick(false)}>Abbrechen</button></div>
        </form>
      )}
    </div>
  )
}

// Über den Tageskarten: nicht zugeordnete Gerichte und ausgeblendete Mahlzeiten
function MealsExtras({ offer, isOwner, store, onOfferChange, days }) {
  const { off, unhide } = useMealOff(offer, store, onOfferChange)
  const [showOff, setShowOff] = useState(false)
  const unplaced = store.list.filter(d => d.can_move && !(d.tag && d.slot))
  if (!unplaced.length && !(isOwner && off.length)) return null
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
      {unplaced.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Noch keiner Mahlzeit zugeordnet</div>}
      {unplaced.map(d => (
        <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
          <span style={{ flex: 1, minWidth: 120 }}>{d.name} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({d.category})</span></span>
          <MoveSelect dish={d} days={days} onMove={store.move} off={off}/>
        </div>
      ))}
      {isOwner && off.length > 0 && (
        <div style={{ marginTop: unplaced.length ? 8 : 0 }}>
          <button style={ghost} onClick={() => setShowOff(v => !v)}>{showOff ? 'Ausgeblendete Mahlzeiten verbergen' : `Ausgeblendete Mahlzeiten (${off.length})`}</button>
          {showOff && off.slice().sort().map(k => { const [d, sl] = k.split('|'); return <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 13 }}><span style={{ flex: 1, color: 'var(--muted)' }}>{dayShort(d)} · {sl}</span><button style={ghost} onClick={() => unhide([k])}>Wieder anzeigen</button></div> })}
        </div>
      )}
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

export default function OfferOrganisation({ offer, asId, role, chat, onOfferChange }) {
  const isOwner = role === 'owner'
  const modus = offer.essen_modus
  const store = useDishes(offer, asId)
  const tasks = useTasks(offer.id, asId)
  const days = offerDays(offer, modus === 'gemeinschaft' ? store.list : [])
  // Vier Fragen der Teilnehmenden: Was ist los? Wann passiert was? Was mache ich? Wie komme ich hin? (+ Dateien)
  const tabs = [
    ['chat', '💬', 'Chat'],
    ['ablauf', '📅', 'Ablauf'],
    ['aufgaben', '✅', 'Aufgaben'],
    ['anreise', '🚗', 'Anreise'],
    ...(chat ? [['dateien', '📎', 'Dateien']] : []),
  ]
  const [tab, setTab] = useState('chat')
  const cur = tabs.some(t => t[0] === tab) ? tab : 'chat'
  // Wischen nach links/rechts wechselt den Reiter (nicht in Eingabefeldern)
  const touch = useRef(null)
  function onTouchStart(e) {
    if (e.target.closest('input,textarea,select')) { touch.current = null; return }
    const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    const st = touch.current; touch.current = null
    if (!st) return
    const t = e.changedTouches[0], dx = t.clientX - st.x, dy = t.clientY - st.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const i = tabs.findIndex(x => x[0] === cur)
    const next = tabs[i + (dx < 0 ? 1 : -1)]
    if (next) setTab(next[0])
  }
  async function setModus(v) {
    const { error } = await supabase.from('offers').update({ essen_modus: v || null }).eq('id', offer.id)
    if (!error && onOfferChange) onOfferChange({ essen_modus: v || null })
  }
  const buffet = modus !== 'gemeinschaft' && modus !== 'versorgt'
  return (
    <div style={card}>
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))`, gap: 2, background: 'var(--bg)', borderRadius: 12, padding: 3, marginBottom: 16 }}>
        {tabs.map(([k, ic, l]) => {
          const on = cur === k
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => setTab(k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 2px', borderRadius: 9, border: 'none', background: on ? 'var(--g)' : 'transparent', color: on ? 'white' : 'var(--text)', cursor: 'pointer', minWidth: 0 }}>
              <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{ic}</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{l}</span>
            </button>
          )
        })}
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y', minHeight: 120 }}>
      {cur === 'chat' && (chat
        ? <OfferChat offerId={offer.id} asId={asId} ankuendigung={offer.ankuendigung} embedded/>
        : <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>🔒 Der Gruppen-Chat und die Dateien sind nur für die Gruppe sichtbar. Als Bewohner kannst du dich mit deinem persönlichen Profil anmelden und dich anschließend als Kommune selbst freischalten.</div>)}

      {cur === 'ablauf' && (
        <div>
          {isOwner && (
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>🍽️ Essensorganisation (nur du als Kommune stellst das ein)
              <select value={modus || ''} onChange={e => setModus(e.target.value)} style={{ ...inp, marginTop: 4 }}>
                <option value="">– noch nicht festgelegt –</option>
                <option value="versorgt">Für Essen ist gesorgt (Veranstalter)</option>
                <option value="gemeinschaft">Gemeinschaftsessen (Mahlzeiten im Ablauf, wechselnde Köche)</option>
                <option value="buffet">Buffet (jeder bringt etwas mit – unter Aufgaben)</option>
              </select>
            </label>
          )}
          {modus === 'versorgt' && <div style={{ fontSize: 13, marginBottom: 12, background: 'var(--bg)', borderRadius: 10, padding: '8px 12px' }}>🍽️ Für das Essen ist gesorgt – du musst nichts mitbringen.</div>}
          <Ablauf offer={offer} isOwner={isOwner} store={store} tasks={tasks} days={days} onOfferChange={onOfferChange}/>
        </div>
      )}

      {cur === 'aufgaben' && (
        <div>
          <div style={subHead}>✅ Aufgaben</div>
          <Tasks isOwner={isOwner} tasks={tasks} days={days}/>
          {buffet && (
            <div style={{ marginTop: 20 }}>
              <div style={subHead}>🥙 Mitbringen</div>
              <Dishes offer={offer} asId={asId} isOwner={isOwner} store={store}/>
            </div>
          )}
        </div>
      )}

      {cur === 'anreise' && <Rides offer={offer} asId={asId} isOwner={isOwner}/>}
      {cur === 'dateien' && chat && <OfferFiles offerId={offer.id} asId={asId} isOwner={isOwner}/>}
      </div>
    </div>
  )
}
