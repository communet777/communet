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
  const { earlyAccess, profiles, active, unreadOther, refreshUnread } = useActiveProfile()
  const router = useRouter()
  const [convs, setConvs] = useState(null)
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])

  useEffect(() => { if (!loading && !user) router.replace('/auth/login?next=/nachrichten') }, [user, loading])
  useEffect(() => {
    if (!user || !earlyAccess) return
    const load = () => supabase.rpc('my_conversations').then(({ data }) => { setConvs(data || []); refreshUnread() })
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [user, earlyAccess])

  useEffect(() => {
    if (!user || !earlyAccess || q.trim().length < 2) { setPeople([]); return }
    const t = setTimeout(async () => { const { data } = await supabase.rpc('search_people', { p_q: q.trim() }); setPeople(data || []) }, 250)
    return () => clearTimeout(t)
  }, [q, user, earlyAccess])

  if (loading || !user) return null
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'32px 20px 80px'}}>
        <h1 style={{margin:'0 0 16px'}}>Nachrichten</h1>
        {earlyAccess && <PushToggle/>}
        {active && profiles.length > 1 && <p style={{fontSize:13,color:'var(--muted)',margin:'0 0 12px'}}>Du bist gerade als <strong>{active.name}</strong> unterwegs.{unreadOther > 0 ? ` Ungelesen im anderen Profil: ${unreadOther}.` : ''}</p>}
        {profiles.length > 0 && !earlyAccess && <p>Nachrichten sind in der geschlossenen Testphase nur für Early-Access-Mitglieder verfügbar.</p>}
        {earlyAccess && (
          <div style={{marginBottom:16}}>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Person suchen und anschreiben…" style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid var(--border)',fontSize:15}}/>
            {q.trim().length >= 2 && (
              <div style={{marginTop:8}}>
                {people.length === 0 && <p style={{color:'var(--muted)',fontSize:13,margin:'8px 2px'}}>Niemand gefunden.</p>}
                {people.map(p => (
                  <Link key={p.id} href={`/leute/${p.id}`} style={{textDecoration:'none'}}>
                    <div style={{display:'flex',gap:12,alignItems:'center',background:'var(--card)',borderRadius:12,padding:10,marginBottom:6}}>
                      <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {p.avatar_url ? <img src={p.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <Icon name="person" size={20}/>}
                      </div>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontWeight:700,color:'var(--text)'}}>{p.name}</div>
                        {p.land && <div style={{fontSize:12,color:'var(--muted)'}}>{p.land}</div>}
                      </div>
                      <span style={{fontSize:13,color:'var(--g)',fontWeight:600}}>✉️ Schreiben</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        {earlyAccess && convs && convs.filter(c => !active || c.my_profile_id === active.id).length === 0 && (
          <p style={{color:'var(--muted)'}}>Noch keine Unterhaltungen. <Link href="/leute" style={{color:'var(--g)'}}>Leute finden</Link> oder auf einer Kommunen-Seite schreiben.</p>
        )}
        {(convs || []).filter(c => !active || c.my_profile_id === active.id).map(c => (
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
