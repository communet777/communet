import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Kalender-Abgleich für den Internen Bereich:
//  Import: iCal-Link (z. B. von kalender.digital) wird beim Öffnen des Kalenders automatisch erneut gelesen,
//          solange der letzte Abgleich länger als 30 Minuten her ist. So kann man parallel weiterarbeiten.
//  Export: geheimer Link, den Verwandte in ihren eigenen Kalender einbinden können.
const card = { background: 'var(--card)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }
const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, minHeight: 36 }
const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
const input = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }
const AUTO_MIN = 30

function vor(ts) {
  if (!ts) return 'noch nie'
  const min = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  if (min < 1440) return `vor ${Math.round(min / 60)} Std.`
  return `vor ${Math.round(min / 1440)} Tagen`
}

export default function IcalPanel({ pid, onSynced, setMsg }) {
  const [feeds, setFeeds] = useState([])
  const [exp, setExp] = useState(undefined) // undefined = lädt, null = noch kein Link
  const [busy, setBusy] = useState('')
  const [f, setF] = useState({ name: '', url: '', gruppe: '', art: 'anwesenheit' })
  const [kopiert, setKopiert] = useState(false)
  const autoGelaufen = useRef(false)

  async function sync(feed) {
    setBusy(feed.id)
    try {
      const { data: s } = await supabase.auth.getSession()
      const r = await fetch('/api/ical-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` },
        body: JSON.stringify({ feedId: feed.id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!j.ok) setMsg(`Abgleich "${feed.name}" fehlgeschlagen: ${j.error || r.status}`)
      else setMsg('')
    } catch (e) {
      setMsg('Abgleich fehlgeschlagen: ' + e.message)
    }
    setBusy('')
  }

  async function laden() {
    const { data, error } = await supabase.from('kommune_ical_feeds').select('*').eq('kommune_id', pid).order('created_at')
    if (error) { setMsg(error.message); return [] }
    setFeeds(data || [])
    return data || []
  }
  async function ladenExport() {
    const { data } = await supabase.from('kommune_ical_export').select('token').eq('kommune_id', pid).maybeSingle()
    setExp(data?.token || null)
  }

  useEffect(() => {
    ;(async () => {
      const list = await laden()
      ladenExport()
      if (autoGelaufen.current) return
      autoGelaufen.current = true
      const faellig = list.filter(x => !x.letzter_abruf || Date.now() - new Date(x.letzter_abruf).getTime() > AUTO_MIN * 60000)
      for (const x of faellig) await sync(x)
      if (faellig.length) { await laden(); onSynced && onSynced() }
    })()
  }, [pid])

  async function hinzufuegen(e) {
    e.preventDefault()
    const url = f.url.trim()
    if (!f.name.trim() || !/^(https?|webcals?):\/\//i.test(url)) { setMsg('Bitte Name und einen Link, der mit https:// oder webcal:// beginnt, eingeben.'); return }
    const { data, error } = await supabase.from('kommune_ical_feeds').insert({ kommune_id: pid, name: f.name.trim(), url, gruppe: f.gruppe.trim() || null, art: f.art }).select().single()
    if (error) { setMsg('Speichern fehlgeschlagen: ' + error.message); return }
    setF({ name: '', url: '', gruppe: '', art: f.art })
    await sync(data)
    await laden()
    onSynced && onSynced()
  }

  async function jetzt(feed) { await sync(feed); await laden(); onSynced && onSynced() }

  async function entfernen(feed) {
    if (!window.confirm(`"${feed.name}" und alle daraus importierten Einträge entfernen?`)) return
    const { error } = await supabase.from('kommune_ical_feeds').delete().eq('id', feed.id)
    if (error) { setMsg('Entfernen fehlgeschlagen: ' + error.message); return }
    await laden()
    onSynced && onSynced()
  }

  const neuesToken = () => (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
  async function exportErzeugen() {
    const t = neuesToken()
    const { error } = exp === null
      ? await supabase.from('kommune_ical_export').insert({ kommune_id: pid, token: t })
      : await supabase.from('kommune_ical_export').update({ token: t }).eq('kommune_id', pid)
    if (error) { setMsg('Link erzeugen fehlgeschlagen: ' + error.message); return }
    setExp(t)
  }

  const link = exp && typeof window !== 'undefined' ? `${window.location.origin}/api/ical/${exp}.ics` : ''
  async function kopieren() {
    try { await navigator.clipboard.writeText(link); setKopiert(true); setTimeout(() => setKopiert(false), 2000) } catch { window.prompt('Link kopieren:', link) }
  }

  return (
    <details style={{ ...card, marginTop: 16 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 36, display: 'flex', alignItems: 'center' }}>🔄 Mit anderem Kalender abgleichen (iCal){feeds.length ? ` · ${feeds.length} verknüpft` : ''}</summary>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Einlesen (z. B. kalender.digital)</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
          Füge den iCal-Link eines Kalenders ein. Er wird jedes Mal neu eingelesen, wenn jemand den Kalender öffnet und der letzte Abgleich länger als {AUTO_MIN} Minuten her ist. Änderungen am Original erscheinen hier, Änderungen hier nicht im Original.
        </p>
        {feeds.map(x => (
          <div key={x.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'var(--bg)' }}>
            <div style={{ fontWeight: 600 }}>{x.name} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}>· {x.art === 'anwesenheit' ? 'Anwesenheit' : 'Termine'}{x.gruppe ? ` · Gruppe ${x.gruppe}` : ''}</span></div>
            <div style={{ fontSize: 12, color: x.letzter_fehler ? '#b3261e' : 'var(--muted)', margin: '2px 0 6px' }}>{x.letzter_fehler ? `Fehler: ${x.letzter_fehler}` : `Zuletzt abgeglichen ${vor(x.letzter_abruf)}`}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={btnLight} disabled={busy === x.id} onClick={() => jetzt(x)}>{busy === x.id ? 'Gleicht ab…' : 'Jetzt abgleichen'}</button>
              <button type="button" style={btnLight} onClick={() => entfernen(x)}>Entfernen</button>
            </div>
          </div>
        ))}
        <form onSubmit={hinzufuegen} style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <div><label style={label}>Name (z. B. Familie Müller)</label><input style={input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required/></div>
          <div><label style={label}>iCal-Link</label><input style={input} value={f.url} onChange={e => setF({ ...f, url: e.target.value })} placeholder="https://… oder webcal://…" required/></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <div><label style={label}>Gruppe (Farbe, optional)</label><input style={input} value={f.gruppe} onChange={e => setF({ ...f, gruppe: e.target.value })} placeholder="wie Name"/></div>
            <div><label style={label}>Einträge sind</label>
              <select style={input} value={f.art} onChange={e => setF({ ...f, art: e.target.value })}><option value="anwesenheit">Anwesenheit (ganze Tage)</option><option value="termin">Termine (mit Uhrzeit)</option></select>
            </div>
          </div>
          <div><button type="submit" style={btn}>Verknüpfen und abgleichen</button></div>
        </form>
      </div>

      <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Weitergeben an Verwandte</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
          Ein geheimer Link, den man in Google-, Apple- oder Outlook-Kalender als Abo einfügt. Wer ihn hat, sieht alle Einträge dieses Kalenders. Mit "Link erneuern" wird der alte Link ungültig.
        </p>
        {exp === undefined && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Lädt…</span>}
        {exp === null && <button type="button" style={btn} onClick={exportErzeugen}>Kalenderlink erzeugen</button>}
        {exp && (
          <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
            <input style={input} readOnly value={link} onFocus={e => e.target.select()} aria-label="Kalenderlink"/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={btn} onClick={kopieren}>{kopiert ? 'Kopiert' : 'Link kopieren'}</button>
              <button type="button" style={btnLight} onClick={() => { if (window.confirm('Der bisherige Link funktioniert danach nicht mehr. Fortfahren?')) exportErzeugen() }}>Link erneuern</button>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
