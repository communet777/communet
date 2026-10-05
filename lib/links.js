// Verknüpfung Gemeinschaft <-> Hofladen (Supabase-Tabelle community_farm_links).
// Ein Hof kann beides sein (z. B. Örkhof): Gemeinschaftsprofil und Hofladen verweisen aufeinander.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

let cache = null
let pending = null

function build(rows) {
  const byFarm = {}
  const byCommunity = {}
  for (const r of rows || []) {
    byFarm[r.farm_id] = r.community_id
    ;(byCommunity[r.community_id] = byCommunity[r.community_id] || []).push(r)
  }
  return { byFarm, byCommunity }
}

export function useFarmLinks() {
  const [links, setLinks] = useState(cache || { byFarm: {}, byCommunity: {} })
  useEffect(() => {
    if (cache) { setLinks(cache); return }
    if (!pending) {
      pending = supabase.from('community_farm_links').select('farm_id,community_id,farm_name')
        .then(({ data }) => { cache = build(data); return cache })
    }
    pending.then(setLinks)
  }, [])
  return links
}
