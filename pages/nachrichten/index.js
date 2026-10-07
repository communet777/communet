import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import Icon from '../../components/Icon'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import { supabase } from '../../lib/supabase'
import PushToggle from '../../components/PushToggle'

function timeLabel(ts) {
  const d = new Date(ts), now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export default function Nachrichten() {
  const { user, loading } = useAuth()
  const { earlyAccess, profiles, refreshUnread } = useActiveProfile()
  const router = useRouter()
  const [convs, setConvs] = useState(null)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login?next=/nachrichten') }, [user, loading])
  useEffect(() => {
    if (!user || !earlyAccess) return
    const load = () => supabase.rpc('my_conversations').then(({ data }) => { setConvs(data || []); refreshUnread() })
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [user, earlyAccess])

  if (loading || !user) return null
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'32px 20px 80px'}}>
        <h1 style={{margin:'0 0 16px'}}>Nachrichten</h1>
        {earlyAccess && <PushToggle/>}
        {profiles.length > 0 && !earlyAccess && <p>Nachrichten sind in der geschlossenen Testphase nur für Early-Access-Mitglieder verfügbar.</p>}
        {earlyAccess && convs && convs.length === 0 && (
          <p style={{color:'var(--muted)'}}>Noch keine Unterhaltungen. <Link href="/leute" style={{color:'var(--g)'}}>Leute finden</Link> oder auf einer Kommunen-Seite schreiben.</p>
        )}
        {(convs || []).map(c => (
          <Link key={`${c.conversation_id}-${c.my_profile_id}`} href={`/nachrichten/${c.conversation_id}?as=${c.my_profile_id}`} style={{textDecoration:'none'}}>
            <div style={{display:'flex',gap:14,alignItems:'center',background:'var(--card)',borderRadius:14,padding:14,marginBottom:10,borderLeft:c.unread>0?'3px solid var(--gold,#E9AD55)':'3px solid transparent'}}>
              <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {c.other_avatar ? <img src={c.other_avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Icon name={c.other_typ === 'person' ? 'person' : 'globus'} size={26}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                  <strong style={{color:'var(--text)'}}>{c.other_name}</strong>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{c.last_at && timeLabel(c.last_at)}</span>
                </div>
                {profiles.length > 1 && <div style={{fontSize:11,color:'var(--muted)'}}>als {c.my_name}</div>}
                <div style={{fontSize:13,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:c.unread>0?700:400}}>{c.last_sender === c.my_profile_id ? 'Du: ' : ''}{c.last_body}</div>
              </div>
              {c.unread > 0 && <span style={{background:'var(--gold,#E9AD55)',color:'#173F4A',borderRadius:12,padding:'2px 8px',fontSize:12,fontWeight:700}}>{c.unread}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
