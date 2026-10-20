import { supabase } from './supabase'
import { loadMyInterest, sortMineFirst } from './myInterest'

// Lädt die Angebote aller Kommunen, denen die Person folgt (Favoriten), neueste zuerst.
// Gemeinsam genutzt von der Profilseite (Vorschau) und der eigenen Seite /feed.
// Zusätzlich: Angebote, für die man angemeldet ist (auch ohne Favorit), mit my_status; diese stehen oben.
export async function loadFeedOffers(userId) {
  const [{ data: favs }, mine] = await Promise.all([
    supabase.from('favorites').select('community_id').eq('user_id', userId),
    loadMyInterest(userId),
  ])
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uuidIds = (favs || []).map(f => f.community_id).filter(id => uuidRegex.test(id))
  const mineIds = Object.keys(mine).filter(id => mine[id] !== 'abgelehnt')
  if (uuidIds.length === 0 && mineIds.length === 0) return []
  const [favRes, mineRes] = await Promise.all([
    uuidIds.length ? supabase.from('offers').select('*').in('kommune_id', uuidIds).order('created_at', { ascending: false }) : { data: [] },
    mineIds.length ? supabase.from('offers').select('*').in('id', mineIds) : { data: [] },
  ])
  const seen = new Set(), offs = []
  for (const o of [...(favRes.data || []), ...(mineRes.data || [])]) if (!seen.has(o.id)) { seen.add(o.id); offs.push(o) }
  if (offs.length === 0) return []
  const kIds = [...new Set(offs.map(o => o.kommune_id))]
  const { data: kommunen } = await supabase.from('profiles').select('id, name, avatar_url, kommune_typ').in('id', kIds)
  const kommuneMap = {}
  if (kommunen) kommunen.forEach(k => { kommuneMap[k.id] = k })
  return sortMineFirst(offs.map(o => ({ ...o, kommune: kommuneMap[o.kommune_id] || null, my_status: mine[o.id] || null })), mine)
}
