import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const KEY = 'communet_active_profile'
const COLS = 'id,name,typ,avatar_url,kommune_typ,status,hidden,early_access,auffindbar'
const Ctx = createContext({ profiles: [], active: null, setActiveId: () => {}, reload: () => {}, earlyAccess: false, person: null, unread: 0, refreshUnread: () => {} })

// Ein Login hat ein persönliches Profil, höchstens eine eigene Kommune und beliebig viele Gemeinschaften,
// in denen die Person als Bewohner mitverwaltet (managed: true).
export function ActiveProfileProvider({ children }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveIdState] = useState(null)
  const [unreadMap, setUnreadMap] = useState({})

  const reload = useCallback(async () => {
    if (!user) { setProfiles([]); return }
    const { data } = await supabase.from('profiles')
      .select(COLS)
      .eq('owner_id', user.id).order('created_at')
    let list = data || []
    // Gemeinschaften, die die Person als Bewohner mitverwaltet
    const { data: mem } = await supabase.from('kommune_members').select('kommune_id').eq('user_id', user.id).eq('rolle', 'bewohner')
    const ids = (mem || []).map(m => m.kommune_id).filter(id => !list.some(p => p.id === id))
    if (ids.length) {
      const { data: extra } = await supabase.from('profiles').select(COLS).in('id', ids).eq('typ', 'kommune')
      list = [...list, ...(extra || []).map(p => ({ ...p, managed: true }))]
    }
    list = list.sort((a, b) => (a.typ === 'person' ? -1 : 0) - (b.typ === 'person' ? -1 : 0))
    setProfiles(list)
    let stored = null
    try { stored = localStorage.getItem(KEY) } catch {}
    setActiveIdState(cur => {
      const want = cur || stored
      return list.find(p => p.id === want) ? want : (list[0]?.id || null)
    })
  }, [user])

  useEffect(() => { reload() }, [reload])

  const setActiveId = useCallback(id => {
    setActiveIdState(id)
    try { localStorage.setItem(KEY, id) } catch {}
  }, [])

  const person = profiles.find(p => p.typ === 'person') || null
  const earlyAccess = !!person?.early_access || profiles.some(p => p.early_access)

  const refreshUnread = useCallback(async () => {
    if (!user || !earlyAccess) { setUnreadMap({}); return }
    const { data } = await supabase.rpc('my_conversations')
    const m = {}
    for (const c of (data || [])) m[c.my_profile_id] = (m[c.my_profile_id] || 0) + (c.unread || 0)
    setUnreadMap(m)
  }, [user, earlyAccess])

  useEffect(() => {
    refreshUnread()
    if (!user || !earlyAccess) return
    const t = setInterval(refreshUnread, 30000)
    return () => clearInterval(t)
  }, [refreshUnread, user, earlyAccess])

  const active = profiles.find(p => p.id === activeId) || profiles[0] || null
  const unread = active ? (unreadMap[active.id] || 0) : 0
  const unreadOther = Object.entries(unreadMap).filter(([k]) => k !== active?.id).reduce((a, [, v]) => a + v, 0)
  return <Ctx.Provider value={{ profiles, active, setActiveId, reload, earlyAccess, person, unread, unreadOther, refreshUnread }}>{children}</Ctx.Provider>
}

export function useActiveProfile() { return useContext(Ctx) }
