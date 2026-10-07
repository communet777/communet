import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import Icon from '../../components/Icon'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import { supabase } from '../../lib/supabase'

export default function Leute() {
  const { user, loading } = useAuth()
  const { earlyAccess, profiles } = useActiveProfile()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login?next=/leute') }, [user, loading])
  useEffect(() => {
    if (!user || !earlyAccess) return
    const t = setTimeout(async () => {
      setBusy(true)
      const { data } = await supabase.rpc('search_people', { p_q: q })
      setPeople(data || []); setBusy(false)
    }, 250)
    return () => clearTimeout(t)
  }, [q, user, earlyAccess])

  if (loading || !user) return null
  const ready = profiles.length > 0
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'32px 20px 80px'}}>
        <h1 style={{margin:'0 0 6px'}}>Leute finden</h1>
        <p style={{color:'var(--muted)',fontSize:14,marginTop:0}}>Andere Mitglieder der Early-Access-Phase. Wer nicht gefunden werden möchte, kann das im eigenen Profil abschalten.</p>
        {ready && !earlyAccess && <p>Diese Funktion ist in der geschlossenen Testphase nur für Early-Access-Mitglieder verfügbar.</p>}
        {earlyAccess && (<>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Nach Namen suchen…" style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid var(--border)',fontSize:15,marginBottom:16}}/>
          {!busy && people.length === 0 && <p style={{color:'var(--muted)'}}>Niemand gefunden.</p>}
          {people.map(p => (
            <Link key={p.id} href={`/leute/${p.id}`} style={{textDecoration:'none'}}>
              <div style={{display:'flex',gap:14,alignItems:'center',background:'var(--card)',borderRadius:14,padding:14,marginBottom:10}}>
                <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {p.avatar_url ? <img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Icon name="person" size={26}/>}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,color:'var(--text)'}}>{p.name}</div>
                  {p.land && <div style={{fontSize:12,color:'var(--muted)'}}>{p.land}</div>}
                  {p.bio && <div style={{fontSize:13,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.bio}</div>}
                </div>
              </div>
            </Link>
          ))}
        </>)}
      </div>
    </div>
  )
}
