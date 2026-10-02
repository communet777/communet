import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { useLang } from '../../lib/LanguageContext'
import { supabase } from '../../lib/supabase'
import { translations } from '../../lib/i18n'
import { TYPEN, getTypIcon } from '../../data/communities'
import { fetchCatalogRows, mergeCatalogAll, invalidateCatalog } from '../../lib/catalog'
import styles from '../../styles/Admin.module.css'

const TABS = [
  { key: 'katalog', label: '🌍 Kommunen' },
  { key: 'texte', label: '✏️ Texte' },
  { key: 'freischaltung', label: '✅ Freischaltungen' },
  { key: 'nachrichten', label: '✉️ Nachrichten' },
]

const BESUCHER = [
  ['offen', 'Besucher willkommen'],
  ['anmeldung', 'Nach Anmeldung'],
  ['volontaere', 'Nur Volontäre'],
  ['einladung', 'Nur auf Einladung'],
  ['geschlossen', 'Keine Besucher'],
  ['unbekannt', 'Unbekannt'],
]
const STATUS = [
  ['nicht-registriert', 'Noch nicht registriert'],
  ['einrichtung', 'Profil in Einrichtung'],
  ['aktiv', 'Aktiv auf Communet'],
]

export default function Admin() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(null)
  const [tab, setTab] = useState('katalog')

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/'); return }
    supabase.rpc('is_admin').then(({ data }) => {
      setIsAdmin(!!data)
      if (!data) router.replace('/')
    })
  }, [user, loading])

  useEffect(() => {
    const q = router.query.tab
    if (q && TABS.some(t => t.key === q)) setTab(q)
  }, [router.query.tab])

  function switchTab(k) {
    setTab(k)
    router.replace({ pathname: '/admin', query: { tab: k } }, undefined, { shallow: true })
  }

  if (loading || !user || isAdmin === null) return <div className={styles.loading}><div className={styles.spinner} /></div>
  if (!isAdmin) return null

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.container}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
          ))}
        </div>
        {tab === 'katalog' && <Katalog />}
        {tab === 'texte' && <Texte />}
        {tab === 'freischaltung' && <Freischaltung />}
        {tab === 'nachrichten' && <Nachrichten />}
      </div>
    </div>
  )
}

/* ───────────────────────── Kommunen-Katalog ───────────────────────── */

function Katalog() {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('alle')
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const rows = await fetchCatalogRows()
      setList(mergeCatalogAll(rows).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const laender = useMemo(() => [...new Set((list || []).map(k => k.land).filter(Boolean))].sort(), [list])

  if (error) return <p className={styles.error}>Fehler beim Laden: {error}</p>
  if (!list) return <div className={styles.spinner} />

  if (editing) {
    return <KommuneForm
      initial={editing}
      laender={laender}
      onCancel={() => setEditing(null)}
      onSaved={async (msg) => { setEditing(null); setNotice(msg); invalidateCatalog(); await load() }}
    />
  }

  const q = search.trim().toLowerCase()
  const shown = list.filter(k => {
    if (view === 'geaendert' && !k.edited) return false
    if (view === 'ausgeblendet' && !k.hidden) return false
    if (view === 'neu' && !k.isNew) return false
    if (!q) return true
    return [k.name, k.ort, k.region, k.land, k.typ].some(v => (v || '').toLowerCase().includes(q))
  })
  const counts = {
    alle: list.length,
    geaendert: list.filter(k => k.edited).length,
    neu: list.filter(k => k.isNew).length,
    ausgeblendet: list.filter(k => k.hidden).length,
  }

  return (
    <section>
      {notice && <div className={styles.notice} onClick={() => setNotice('')}>{notice}</div>}
      <div className={styles.toolbar}>
        <input className={styles.input} placeholder="Name, Ort oder Land suchen …" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={styles.btnPrimary} onClick={() => setEditing({ isNew: true, typ: 'Ökodorf', besucher: 'unbekannt', status: 'nicht-registriert', tags: [] })}>+ Neue Kommune</button>
      </div>
      <div className={styles.chips}>
        {[['alle', 'Alle'], ['geaendert', 'Von dir geändert'], ['neu', 'Neu angelegt'], ['ausgeblendet', 'Ausgeblendet']].map(([k, l]) => (
          <button key={k} className={`${styles.chip} ${view === k ? styles.chipActive : ''}`} onClick={() => setView(k)}>{l} ({counts[k]})</button>
        ))}
      </div>
      {shown.length === 0 && <p className={styles.empty}>Keine Treffer.</p>}
      <div className={styles.rows}>
        {shown.map(k => (
          <button key={k.id} className={`${styles.row} ${k.hidden ? styles.rowHidden : ''}`} onClick={() => setEditing(k)}>
            <span className={styles.rowIcon}>{k.icon || getTypIcon(k.typ)}</span>
            <span className={styles.rowMain}>
              <span className={styles.rowName}>{k.name}</span>
              <span className={styles.rowMeta}>{[k.ort, k.land].filter(Boolean).join(', ')} · {k.typ}</span>
            </span>
            <span className={styles.rowBadges}>
              {k.isNew && <span className={styles.badgeNew}>Neu</span>}
              {k.edited && !k.isNew && <span className={styles.badgeEdited}>Geändert</span>}
              {k.hidden && <span className={styles.badgeHidden}>Ausgeblendet</span>}
            </span>
            <span className={styles.rowArrow}>›</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function KommuneForm({ initial, laender, onCancel, onSaved }) {
  const [f, setF] = useState(() => ({
    ...initial,
    lat: initial.lat ?? '',
    lon: initial.lon ?? '',
    jahr: initial.jahr ?? '',
    members: initial.members ?? '',
    tagsText: (initial.tags || []).join(', '),
    hidden: !!initial.hidden,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function num(v, int) {
    if (v === '' || v === null || v === undefined) return null
    const n = int ? parseInt(v, 10) : parseFloat(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : NaN
  }

  async function save() {
    setError('')
    const lat = num(f.lat), lon = num(f.lon), jahr = num(f.jahr, true), members = num(f.members, true)
    if (!f.name || !f.name.trim()) return setError('Bitte einen Namen eingeben.')
    if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) return setError('Bitte Breiten- und Längengrad als Zahl eingeben (z. B. 52.675 und 11.099).')
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return setError('Koordinaten außerhalb des gültigen Bereichs.')
    if (Number.isNaN(jahr) || Number.isNaN(members)) return setError('Gründungsjahr und Mitglieder bitte als ganze Zahl.')
    const row = {
      name: f.name.trim(),
      land: f.land || null, region: f.region || null, ort: f.ort || null,
      lat, lon, typ: f.typ, jahr, members,
      angebote: initial.angebote ?? 0,
      besucher: f.besucher, status: f.status,
      verified: !!initial.verified,
      icon: f.icon || null,
      beschreibung: f.beschreibung || null, beschreibung_en: f.beschreibung_en || null,
      website: f.website ? (/^https?:\/\//.test(f.website) ? f.website.trim() : 'https://' + f.website.trim()) : null,
      tags: f.tagsText.split(',').map(s => s.trim()).filter(Boolean),
      hidden: !!f.hidden,
      updated_at: new Date().toISOString(),
    }
    setSaving(true)
    let res
    if (initial.isNew && !initial.id) res = await supabase.from('catalog_communities').insert(row)
    else res = await supabase.from('catalog_communities').upsert({ id: initial.id, ...row })
    setSaving(false)
    if (res.error) return setError('Speichern fehlgeschlagen: ' + res.error.message)
    onSaved(`„${row.name}" gespeichert — ist sofort auf der Website sichtbar.`)
  }

  async function removeOverride() {
    const msg = initial.isNew
      ? `„${initial.name}" endgültig löschen?`
      : `Deine Änderungen an „${initial.name}" verwerfen und den ursprünglichen Eintrag wiederherstellen?`
    if (!window.confirm(msg)) return
    setSaving(true)
    const { error } = await supabase.from('catalog_communities').delete().eq('id', initial.id)
    setSaving(false)
    if (error) return setError('Fehlgeschlagen: ' + error.message)
    onSaved(initial.isNew ? `„${initial.name}" gelöscht.` : `„${initial.name}" auf den Originalzustand zurückgesetzt.`)
  }

  const osm = f.lat && f.lon ? `https://www.openstreetmap.org/?mlat=${String(f.lat).replace(',', '.')}&mlon=${String(f.lon).replace(',', '.')}#map=12/${String(f.lat).replace(',', '.')}/${String(f.lon).replace(',', '.')}` : null

  return (
    <section className={styles.form}>
      <button className={styles.back} onClick={onCancel}>← Zurück zur Liste</button>
      <h2 className={styles.formTitle}>{initial.isNew && !initial.id ? 'Neue Kommune' : initial.name}</h2>
      {initial.id && <p className={styles.hint}>Kommune #{initial.id}{!initial.isNew && !initial.edited ? ' · noch unverändert' : ''}</p>}

      <div className={styles.grid2}>
        <Field label="Name *"><input className={styles.input} value={f.name || ''} onChange={set('name')} /></Field>
        <Field label="Typ">
          <select className={styles.input} value={f.typ || 'Ökodorf'} onChange={set('typ')}>
            {TYPEN.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Land">
          <input className={styles.input} list="laender" value={f.land || ''} onChange={set('land')} />
          <datalist id="laender">{laender.map(l => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Region"><input className={styles.input} value={f.region || ''} onChange={set('region')} /></Field>
        <Field label="Ort"><input className={styles.input} value={f.ort || ''} onChange={set('ort')} /></Field>
        <Field label="Icon (ein Emoji)"><input className={styles.input} value={f.icon || ''} onChange={set('icon')} placeholder={getTypIcon(f.typ)} /></Field>
        <Field label="Breitengrad (lat) *"><input className={styles.input} inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="52.675" /></Field>
        <Field label="Längengrad (lon) *"><input className={styles.input} inputMode="decimal" value={f.lon} onChange={set('lon')} placeholder="11.099" /></Field>
      </div>
      <p className={styles.hint}>
        Koordinaten findest du auf openstreetmap.org: Rechtsklick auf den Ort → „Adresse anzeigen". {osm && <a href={osm} target="_blank" rel="noreferrer" className={styles.link}>Aktuelle Position prüfen ↗</a>}
      </p>

      <div className={styles.grid2}>
        <Field label="Gründungsjahr"><input className={styles.input} inputMode="numeric" value={f.jahr} onChange={set('jahr')} /></Field>
        <Field label="Mitglieder (ca.)"><input className={styles.input} inputMode="numeric" value={f.members} onChange={set('members')} /></Field>
        <Field label="Besucher">
          <select className={styles.input} value={f.besucher || 'unbekannt'} onChange={set('besucher')}>
            {BESUCHER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={styles.input} value={f.status || 'nicht-registriert'} onChange={set('status')}>
            {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Website"><input className={styles.input} value={f.website || ''} onChange={set('website')} placeholder="https://…" /></Field>
      <Field label="Schlagworte (mit Komma getrennt)"><input className={styles.input} value={f.tagsText} onChange={set('tagsText')} placeholder="Permakultur, Strohballenbau" /></Field>
      <Field label="Beschreibung (Deutsch)"><textarea className={styles.textarea} rows={4} value={f.beschreibung || ''} onChange={set('beschreibung')} /></Field>
      <Field label="Beschreibung (Englisch)"><textarea className={styles.textarea} rows={4} value={f.beschreibung_en || ''} onChange={set('beschreibung_en')} /></Field>

      <label className={styles.check}>
        <input type="checkbox" checked={f.hidden} onChange={set('hidden')} />
        Auf der Website ausblenden (bleibt hier gespeichert und lässt sich wieder einblenden)
      </label>

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btnPrimary} onClick={save} disabled={saving}>{saving ? 'Speichert …' : 'Speichern'}</button>
        <button className={styles.btnGhost} onClick={onCancel} disabled={saving}>Abbrechen</button>
        <span className={styles.spacer} />
        {initial.edited && initial.id && (
          <button className={styles.btnDanger} onClick={removeOverride} disabled={saving}>
            {initial.isNew ? 'Endgültig löschen' : 'Original wiederherstellen'}
          </button>
        )}
      </div>
      {initial.id && !initial.hidden && <p className={styles.hint}><Link href={`/kommunen/${initial.id}`} target="_blank" className={styles.link}>Profilseite öffnen ↗</Link></p>}
    </section>
  )
}

function Field({ label, children }) {
  return <label className={styles.field}><span className={styles.label}>{label}</span>{children}</label>
}

/* ───────────────────────── Texte ───────────────────────── */

const GROUPS = [
  ['home_', 'Startseite'],
  ['nav_', 'Navigation'],
  ['communities_', 'Kommunen-Liste'],
  ['profile_', 'Kommunen-Profil'],
  ['map_', 'Karte'],
  ['supply_', 'Versorgung'],
  ['hof_', 'Bio-Hofläden'],
  ['reg_', 'Anmeldung / Warteliste'],
  ['about', 'Über uns'],
  ['contact', 'Kontakt'],
  ['privacy', 'Datenschutz'],
  ['support', 'Unterstützen'],
  ['lh_', 'Lebensstunden'],
  ['coming_soon', 'Platzhalter „Bald verfügbar"'],
  ['status_', 'Status-Anzeigen'],
]
function groupOf(key) {
  const g = GROUPS.find(([p]) => key.startsWith(p))
  return g ? g[1] : 'Sonstiges'
}

function Texte() {
  const { reloadTexts } = useLang()
  const [overrides, setOverrides] = useState(null)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('Startseite')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase.from('site_texts').select('key,lang,value')
    if (error) return setError(error.message)
    const o = { de: {}, en: {} }
    data.forEach(r => { if (o[r.lang]) o[r.lang][r.key] = r.value })
    setOverrides(o)
  }
  useEffect(() => { load() }, [])

  const keys = Object.keys(translations.de)
  const groups = [...new Set(keys.map(groupOf))]

  if (error) return <p className={styles.error}>Fehler beim Laden: {error}</p>
  if (!overrides) return <div className={styles.spinner} />

  const q = search.trim().toLowerCase()
  const shown = keys.filter(k => {
    const changed = overrides.de[k] !== undefined || overrides.en[k] !== undefined
    if (onlyChanged && !changed) return false
    if (q) {
      const hay = [k, translations.de[k], translations.en[k], overrides.de[k], overrides.en[k]].join(' ').toLowerCase()
      return hay.includes(q)
    }
    return onlyChanged || groupOf(k) === group
  })

  async function afterSave() { await load(); await reloadTexts() }

  return (
    <section>
      <p className={styles.hint}>Änderungen sind nach dem Speichern sofort auf der Website sichtbar. „Standard" setzt einen Text auf die ursprüngliche Fassung zurück.</p>
      <div className={styles.toolbar}>
        <input className={styles.input} placeholder="In allen Texten suchen …" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className={styles.chips}>
        {!q && !onlyChanged && groups.map(g => (
          <button key={g} className={`${styles.chip} ${group === g ? styles.chipActive : ''}`} onClick={() => setGroup(g)}>{g}</button>
        ))}
        <button className={`${styles.chip} ${onlyChanged ? styles.chipActive : ''}`} onClick={() => setOnlyChanged(!onlyChanged)}>
          Nur geänderte ({new Set([...Object.keys(overrides.de), ...Object.keys(overrides.en)]).size})
        </button>
      </div>
      {shown.length === 0 && <p className={styles.empty}>Keine Treffer.</p>}
      {shown.map(k => <TextRow key={k} k={k} overrides={overrides} onSaved={afterSave} />)}
    </section>
  )
}

function TextRow({ k, overrides, onSaved }) {
  const defDe = translations.de[k] || ''
  const defEn = translations.en[k] || ''
  const [de, setDe] = useState(overrides.de[k] ?? defDe)
  const [en, setEn] = useState(overrides.en[k] ?? defEn)
  const [state, setState] = useState('')
  useEffect(() => { setDe(overrides.de[k] ?? defDe); setEn(overrides.en[k] ?? defEn) }, [overrides, k])

  const dirty = de !== (overrides.de[k] ?? defDe) || en !== (overrides.en[k] ?? defEn)
  const changed = overrides.de[k] !== undefined || overrides.en[k] !== undefined

  async function persist(lang, value, def) {
    if (!value.trim() || value === def) {
      return supabase.from('site_texts').delete().eq('key', k).eq('lang', lang)
    }
    return supabase.from('site_texts').upsert({ key: k, lang, value, updated_at: new Date().toISOString() })
  }

  async function save() {
    setState('saving')
    const r1 = await persist('de', de, defDe)
    const r2 = await persist('en', en, defEn)
    if (r1.error || r2.error) { setState('error'); return }
    setState('saved')
    await onSaved()
    setTimeout(() => setState(''), 2000)
  }

  async function reset() {
    if (!window.confirm('Diesen Text auf die ursprüngliche Fassung zurücksetzen?')) return
    setState('saving')
    const { error } = await supabase.from('site_texts').delete().eq('key', k)
    if (error) { setState('error'); return }
    setDe(defDe); setEn(defEn)
    setState('saved')
    await onSaved()
    setTimeout(() => setState(''), 2000)
  }

  const long = defDe.length > 60 || defEn.length > 60
  const Input = long ? 'textarea' : 'input'

  return (
    <div className={`${styles.textRow} ${changed ? styles.textRowChanged : ''}`}>
      <div className={styles.textKey}>{k}{changed && <span className={styles.badgeEdited}>Geändert</span>}</div>
      <div className={styles.grid2}>
        <label className={styles.field}><span className={styles.label}>Deutsch</span>
          <Input className={long ? styles.textarea : styles.input} rows={long ? 3 : undefined} value={de} onChange={e => setDe(e.target.value)} />
        </label>
        <label className={styles.field}><span className={styles.label}>Englisch</span>
          <Input className={long ? styles.textarea : styles.input} rows={long ? 3 : undefined} value={en} onChange={e => setEn(e.target.value)} />
        </label>
      </div>
      <div className={styles.textActions}>
        <button className={styles.btnPrimarySmall} onClick={save} disabled={!dirty || state === 'saving'}>
          {state === 'saving' ? 'Speichert …' : state === 'saved' ? 'Gespeichert ✓' : 'Speichern'}
        </button>
        {changed && <button className={styles.btnGhostSmall} onClick={reset} disabled={state === 'saving'}>Standard</button>}
        {state === 'error' && <span className={styles.error}>Speichern fehlgeschlagen</span>}
      </div>
    </div>
  )
}

/* ───────────────────────── Freischaltungen ───────────────────────── */

function Freischaltung() {
  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [working, setWorking] = useState(null)

  async function loadData() {
    const { data } = await supabase.from('profiles').select('*').eq('typ', 'kommune').order('created_at', { ascending: false })
    if (data) {
      setPending(data.filter(p => p.status === 'pending'))
      setApproved(data.filter(p => p.status === 'approved'))
    }
  }
  useEffect(() => { loadData() }, [])

  async function setStatus(id, status) {
    setWorking(id)
    await supabase.from('profiles').update({ status }).eq('id', id)
    await loadData()
    setWorking(null)
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>⏳ Warten auf Freischaltung ({pending.length})</h2>
        {pending.length === 0 && <p className={styles.empty}>Keine offenen Anfragen.</p>}
        {pending.map(p => (
          <div key={p.id} className={styles.card}>
            <div className={styles.cardInfo}>
              <div className={styles.cardName}>{p.name || '(kein Name)'}</div>
              <div className={styles.cardMeta}>{p.email} · {p.kommune_typ || 'Kommune'} · {p.land || 'kein Ort'}</div>
              {p.bio && <div className={styles.cardBio}>{p.bio}</div>}
            </div>
            <div className={styles.cardActions}>
              <button className={styles.btnApprove} onClick={() => setStatus(p.id, 'approved')} disabled={working === p.id}>{working === p.id ? '...' : '✅ Freischalten'}</button>
              <button className={styles.btnReject} onClick={() => setStatus(p.id, 'rejected')} disabled={working === p.id}>{working === p.id ? '...' : '❌ Ablehnen'}</button>
            </div>
          </div>
        ))}
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>✅ Freigeschaltet ({approved.length})</h2>
        {approved.map(p => (
          <div key={p.id} className={`${styles.card} ${styles.cardApproved}`}>
            <div className={styles.cardInfo}>
              <div className={styles.cardName}>{p.name}</div>
              <div className={styles.cardMeta}>{p.email} · {p.kommune_typ || 'Kommune'} · {p.land || 'kein Ort'}</div>
            </div>
            <button className={styles.btnReject} onClick={() => setStatus(p.id, 'rejected')} disabled={working === p.id}>Sperren</button>
          </div>
        ))}
      </section>
    </>
  )
}

/* ───────────────────────── Nachrichten & Warteliste ───────────────────────── */

function Nachrichten() {
  const [messages, setMessages] = useState(null)
  const [waitlist, setWaitlist] = useState(null)

  async function load() {
    const [m, w] = await Promise.all([
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
    ])
    setMessages(m.data || [])
    setWaitlist(w.error ? null : (w.data || []))
  }
  useEffect(() => { load() }, [])

  async function toggleRead(msg) {
    await supabase.from('contact_messages').update({ read: !msg.read }).eq('id', msg.id)
    load()
  }

  const fmt = (d) => d ? new Date(d).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : ''

  if (!messages) return <div className={styles.spinner} />
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>✉️ Kontaktformular ({messages.filter(m => !m.read).length} ungelesen)</h2>
        {messages.length === 0 && <p className={styles.empty}>Noch keine Nachrichten.</p>}
        {messages.map(m => (
          <div key={m.id} className={`${styles.card} ${m.read ? '' : styles.cardUnread}`}>
            <div className={styles.cardInfo}>
              <div className={styles.cardName}>{m.name || '(ohne Name)'}</div>
              <div className={styles.cardMeta}><a className={styles.link} href={`mailto:${m.email}`}>{m.email}</a> · {fmt(m.created_at)}</div>
              <div className={styles.cardBio} style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
            </div>
            <button className={styles.btnGhostSmall} onClick={() => toggleRead(m)}>{m.read ? 'Als ungelesen' : 'Gelesen ✓'}</button>
          </div>
        ))}
      </section>
      {waitlist && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📋 Warteliste ({waitlist.length})</h2>
          {waitlist.length === 0 && <p className={styles.empty}>Noch niemand auf der Warteliste.</p>}
          {waitlist.map(w => (
            <div key={w.id} className={styles.card}>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{w.name || w.email}</div>
                <div className={styles.cardMeta}>{w.email} · {fmt(w.created_at)}{w.quelle ? ` · ${w.quelle}` : ''}</div>
                {w.notiz && <div className={styles.cardBio}>{w.notiz}</div>}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
