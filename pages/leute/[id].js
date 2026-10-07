import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import Icon from '../../components/Icon'
import MessageBox from '../../components/MessageBox'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import { supabase } from '../../lib/supabase'

export default function Person() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading } = useAuth()
  const { earlyAccess } = useActiveProfile()
  const [p, setP] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])
  useEffect(() => {
    if (!id || !user || !earlyAccess) return
    supabase.rpc('get_person', { p_id: id }).then(({ data }) => { setP(data?.[0] || null); setDone(true) })
  }, [id, user, earlyAccess])

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:600,margin:'0 auto',padding:'32px 20px 80px'}}>
        <Link href="/leute" style={{fontSize:13,color:'var(--muted)',textDecoration:'none'}}>← Leute</Link>
        {done && !p && <p style={{marginTop:24,color:'var(--muted)'}}>Profil nicht gefunden.</p>}
        {p && (
          <div style={{marginTop:20,background:'var(--card)',borderRadius:16,padding:24,textAlign:'center'}}>
            <div style={{width:88,height:88,borderRadius:'50%',overflow:'hidden',margin:'0 auto 12px',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {p.avatar_url ? <img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Icon name="person" size={44}/>}
            </div>
            <h1 style={{margin:'0 0 4px'}}>{p.name}</h1>
            {p.land && <div style={{fontSize:13,color:'var(--muted)'}}><Icon name="standort"/> {p.land}</div>}
            {p.bio && <p style={{fontSize:14,lineHeight:1.6,margin:'14px 0'}}>{p.bio}</p>}
            <div style={{fontSize:13,display:'flex',gap:14,justifyContent:'center',margin:'10px 0 18px'}}>
              {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{color:'var(--g)'}}>🔗 Website</a>}
              {p.instagram && <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" style={{color:'var(--g)'}}>📸 @{p.instagram}</a>}
            </div>
            <div style={{textAlign:'left'}}><MessageBox toId={p.id}/></div>
          </div>
        )}
      </div>
    </div>
  )
}
