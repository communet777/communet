import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Wird nach dem Senden einer Nachricht aufgerufen. Die Datenbank liefert nur dann Empfänger zurück,
// wenn der Aufrufer wirklich die letzte Nachricht dieser Unterhaltung gesendet hat.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
  const conv = req.body?.conv
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!token || !conv || !pub || !priv) return res.status(400).json({ ok: false })

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:communet@outlook.de', pub, priv)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: targets, error } = await supabase.rpc('push_targets', { p_conv: conv })
  if (error || !targets?.length) return res.status(200).json({ ok: true, sent: 0 })

  let sent = 0
  await Promise.all(targets.map(async t => {
    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth_key } },
        JSON.stringify({ title: t.title || 'Communet', body: t.body, url: t.url }),
        { TTL: 3600 }
      )
      sent++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await supabase.rpc('drop_push_subscription', { p_endpoint: t.endpoint })
    }
  }))
  res.status(200).json({ ok: true, sent })
}
