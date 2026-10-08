import { supabase } from './supabase'

// Gleicht verknüpfte iCal-Kalender (z. B. kalender.digital) automatisch ab, sobald der Interne Bereich geöffnet wird.
// Die Feeds stehen in der Tabelle kommune_ical_feeds. Abgleich nur, wenn der letzte länger als AUTO_MIN Minuten her ist.
const AUTO_MIN = 15

async function syncFeed(feed) {
  try {
    const { data: s } = await supabase.auth.getSession()
    const r = await fetch('/api/ical-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` },
      body: JSON.stringify({ feedId: feed.id }),
    })
    const j = await r.json().catch(() => ({}))
    return !!j.ok
  } catch (e) {
    return false
  }
}

// Gibt die Zahl der abgeglichenen Feeds zurück
export async function syncFaellige(pid) {
  const { data } = await supabase.from('kommune_ical_feeds').select('*').eq('kommune_id', pid)
  const faellig = (data || []).filter(x => !x.letzter_abruf || Date.now() - new Date(x.letzter_abruf).getTime() > AUTO_MIN * 60000)
  for (const x of faellig) await syncFeed(x)
  return faellig.length
}
