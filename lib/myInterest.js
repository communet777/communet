import { supabase } from './supabase'

// Eigene Anmeldungen (offer_interest) als Map offer_id -> status ('angefragt' | 'angenommen' | 'abgelehnt')
export async function loadMyInterest(userId) {
  if (!userId) return {}
  const { data } = await supabase.from('offer_interest').select('offer_id, status').eq('user_id', userId)
  const m = {}
  ;(data || []).forEach(r => { m[r.offer_id] = r.status || 'angefragt' })
  return m
}

// Angemeldete Angebote nach oben (angenommen vor angefragt), Reihenfolge sonst unverändert
const RANK = { angenommen: 0, angefragt: 1 }
export function sortMineFirst(list, m) {
  return list.map((o, i) => ({ o, i })).sort((a, b) => ((RANK[m[a.o.id]] ?? 9) - (RANK[m[b.o.id]] ?? 9)) || a.i - b.i).map(x => x.o)
}
