import { supabase } from './supabase'

// Meldet dem Server eine neue Nachricht, damit der Empfänger eine Mitteilung bekommt. Fehler sind unkritisch.
export async function notifyPush(conv) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ conv }),
    })
  } catch {}
}

export function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Push zu Angeboten: kind = 'chat' | 'request' | 'accepted' | 'announce'
export async function notifyOfferPush(offer, as, kind, user) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/push/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ offer, as, kind, user }),
    })
  } catch {}
}
