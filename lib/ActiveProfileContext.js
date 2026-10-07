import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const KEY = 'communet_active_profile'
const Ctx = createContext({ profiles: [], active: null, setActiveId: () => {}, reload: () => {}, earlyAccess: false, person: null, unread: 0, refreshUnread: () => {} })

// Ein Login kann mehrere Profile besitzen: das persönliche Profil und beliebig viele Kommunen.
export function ActiveProfileProvider({ children }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveIdState] = useState(null)
  const [unread, setUnread] = useState(0)

  const reload = useCallback(async () => {
    if (!user) { setProfiles([]); return }
    const { data } = await supabase.from('profiles')
      .select('id,name,typ,avatar_url,kommune_typ,status,hidden,early_access,auffindbar')
      .eq('owner_id', user.id).order('created_at')
    const list = (data || []).sort((a, b) => (a.typ === 'person' ? -1 : 0) - (b.typ === 'person' ? -1 : 0))
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
    if (!user || !earlyAccess) { setUnread(0); return }
    const { data } = await supabase.rpc('my_conversations')
    setUnread((data || []).reduce((s, c) => s + (c.unread || 0), 0))
  }, [user, earlyAccess])

  useEffect(() => {
    refreshUnread()
    if (!user || !earlyAccess) return
    const t = setInterval(refreshUnread, 30000)
    return () => clearInterval(t)
  }, [refreshUnread, user, earlyAccess])

  const active = profiles.find(p => p.id === activeId) || profiles[0] || null
  return <Ctx.Provider value={{ profiles, active, setActiveId, reload, earlyAccess, person, unread, refreshUnread }}>{children}</Ctx.Provider>
}

export function useActiveProfile() { return useContext(Ctx) }
