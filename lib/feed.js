import { supabase } from './supabase'

// Lädt die Angebote aller Kommunen, denen die Person folgt (Favoriten), neueste zuerst.
// Gemeinsam genutzt von der Profilseite (Vorschau) und der eigenen Seite /feed.
export async function loadFeedOffers(userId) {
  const { data: favs } = await supabase.from('favorites').select('community_id').eq('user_id', userId)
  if (!favs || favs.length === 0) return []
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uuidIds = favs.map(f => f.community_id).filter(id => uuidRegex.test(id))
  if (uuidIds.length === 0) return []
  const { data: offs } = await supabase.from('offers').select('*')
    .in('kommune_id', uuidIds).order('created_at', { ascending: false })
  if (!offs || offs.length === 0) return []
  const { data: kommunen } = await supabase.from('profiles').select('id, name, avatar_url').in('id', uuidIds)
  const kommuneMap = {}
  if (kommunen) kommunen.forEach(k => { kommuneMap[k.id] = k })
  return offs.map(o => ({ ...o, kommune: kommuneMap[o.kommune_id] || null }))
}
