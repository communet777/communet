import webpush from 'web-push'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Sendet eine Test-Mitteilung an alle eigenen Geräte und meldet Details zurück (zur Fehlersuche).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const info = { hasPublic: !!pub, hasPrivate: !!priv, subject: process.env.VAPID_SUBJECT || null, publicTail: pub ? pub.slice(-6) : null }
  if (!token) return res.status(401).json({ ...info, error: 'nicht angemeldet' })
  if (!pub || !priv) return res.status(200).json({ ...info, error: 'Schlüssel fehlen im Server' })
  try {
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.setPrivateKey(Buffer.from(priv, 'base64url'))
    info.keysMatch = ecdh.getPublicKey().toString('base64url') === pub
  } catch (e) { info.keysMatch = false; info.keyError = e.message }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: subs, error } = await supabase.from('push_subscriptions').select('endpoint,p256dh,auth_key')
  if (error) return res.status(200).json({ ...info, error: error.message })
  info.devices = subs.length
  try {
    webpush.setVapidDetails('mailto:communet@outlook.de', pub, priv)
  } catch (e) { return res.status(200).json({ ...info, error: 'VAPID: ' + e.message }) }
  info.results = await Promise.all(subs.map(async s => {
    try {
      const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({ title: 'Communet', body: 'Test-Mitteilung funktioniert ✓', url: '/nachrichten' }), { TTL: 300 })
      return { host: new URL(s.endpoint).host, status: r.statusCode }
    } catch (e) { return { host: new URL(s.endpoint).host, status: e.statusCode || null, error: String(e.body || e.message).slice(0, 200) } }
  }))
  res.status(200).json(info)
}
