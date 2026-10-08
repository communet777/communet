import { createClient } from '@supabase/supabase-js'
import { parseIcs, eventsToRows } from '../../lib/ical'

// Gleicht einen iCal-Feed (z. B. von kalender.digital) mit dem Kalender des Internen Bereichs ab.
// Läuft mit den Rechten der angemeldeten Person (Row Level Security), nicht mit einem Dienstschlüssel.

const MAX_BYTES = 5 * 1024 * 1024

function hostErlaubt(hostname) {
  const h = hostname.toLowerCase()
  if (!h.includes('.')) return false
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return false
  if (/^[0-9.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return false
  return true
}

async function holen(startUrl) {
  let url = startUrl
  for (let i = 0; i < 4; i++) {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !hostErlaubt(u.hostname)) throw new Error('Nur https-Adressen von öffentlichen Servern sind erlaubt.')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    let r
    try { r = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'Communet-Kalenderabgleich', Accept: 'text/calendar, text/plain, */*' } }) }
    finally { clearTimeout(timer) }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), url).toString(); continue }
    if (!r.ok) throw new Error(`Der Kalender-Server antwortet mit Fehler ${r.status}.`)
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX_BYTES) throw new Error('Die Kalenderdatei ist zu groß.')
    return buf.toString('utf8')
  }
  throw new Error('Zu viele Weiterleitungen.')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' })
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Nicht angemeldet' })
  const feedId = req.body?.feedId
  if (!feedId) return res.status(400).json({ error: 'feedId fehlt' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: u } = await sb.auth.getUser(token)
  if (!u?.user) return res.status(401).json({ error: 'Nicht angemeldet' })

  const { data: feed } = await sb.from('kommune_ical_feeds').select('*').eq('id', feedId).maybeSingle()
  if (!feed) return res.status(404).json({ error: 'Feed nicht gefunden oder kein Zugriff' })

  try {
    const url = feed.url.trim().replace(/^webcals?:\/\//i, 'https://')
    const text = await holen(url)
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('Das ist keine iCal-Datei. Prüfe den Link.')
    const events = parseIcs(text).slice(0, 3000)
    const rows = eventsToRows(events, { art: feed.art, gruppe: feed.gruppe || feed.name, kommuneId: feed.kommune_id, feedId: feed.id, userId: u.user.id })

    const del = await sb.from('kommune_termine').delete().eq('feed_id', feed.id)
    if (del.error) throw new Error(del.error.message)
    for (let i = 0; i < rows.length; i += 200) {
      const ins = await sb.from('kommune_termine').insert(rows.slice(i, i + 200))
      if (ins.error) throw new Error(ins.error.message)
    }
    await sb.from('kommune_ical_feeds').update({ letzter_abruf: new Date().toISOString(), letzter_fehler: null }).eq('id', feed.id)
    return res.status(200).json({ ok: true, anzahl: rows.length })
  } catch (e) {
    await sb.from('kommune_ical_feeds').update({ letzter_abruf: new Date().toISOString(), letzter_fehler: String(e.message || e).slice(0, 300) }).eq('id', feed.id)
    return res.status(200).json({ ok: false, error: String(e.message || e) })
  }
}
