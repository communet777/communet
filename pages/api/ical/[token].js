import { createClient } from '@supabase/supabase-js'
import { buildIcs } from '../../../lib/ical'

// Geheimer Kalenderlink, den Verwandte in Handy-Kalender oder kalender.digital einbinden können.
// Wer den Link hat, sieht alle Einträge. Der Link lässt sich im Internen Bereich erneuern.
export default async function handler(req, res) {
  const token = String(req.query.token || '').replace(/\.ics$/i, '')
  if (!/^[a-f0-9]{32,80}$/i.test(token)) return res.status(404).end()
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await sb.rpc('kommune_ical_daten', { p_token: token })
  if (error || !data) return res.status(404).end()
  const name = data[0]?.kommune || 'Gemeinschaft'
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.status(200).send(buildIcs(data, `${name} (Communet)`))
}
