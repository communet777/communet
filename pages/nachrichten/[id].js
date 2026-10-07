import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import { supabase } from '../../lib/supabase'

export default function Thread() {
  const router = useRouter()
  const { id, as } = router.query
  const { user, loading } = useAuth()
  const { earlyAccess, refreshUnread } = useActiveProfile()
  const [info, setInfo] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  async function load() {
    const { data: convs } = await supabase.rpc('my_conversations')
    const mine = (convs || []).filter(c => c.conversation_id === id)
    const c = mine.find(x => x.my_profile_id === as) || mine[0]
    if (!c) return
    setInfo(c)
    const { data } = await supabase.from('messages').select('id,sender_profile_id,body,created_at')
      .eq('conversation_id', id).order('created_at')
    setMsgs(data || [])
    await supabase.rpc('mark_read', { p_conv: id, p_me: c.my_profile_id })
    refreshUnread()
  }

  useEffect(() => {
    if (!id || !user || !earlyAccess) return
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [id, as, user, earlyAccess])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send(e) {
    e.preventDefault()
    if (!info || !text.trim()) return
    setSending(true); setError('')
    const { error: err } = await supabase.rpc('send_message', { p_from: info.my_profile_id, p_to: info.other_id, p_body: text })
    setSending(false)
    if (err) { setError(err.message); return }
    setText(''); load()
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'24px 20px 80px'}}>
        <Link href="/nachrichten" style={{fontSize:13,color:'var(--muted)',textDecoration:'none'}}>← Nachrichten</Link>
        <h1 style={{margin:'10px 0 2px',fontSize:24}}>{info ? info.other_name : '…'}</h1>
        {info && <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>
          {info.other_typ === 'person' ? <Link href={`/leute/${info.other_id}`} style={{color:'var(--g)'}}>Profil ansehen</Link> : <Link href={`/profil/p/${info.other_id}`} style={{color:'var(--g)'}}>Kommune ansehen</Link>}
          {' · '}du schreibst als {info.my_name}
        </div>}
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {msgs.map(m => {
            const mine = info && m.sender_profile_id === info.my_profile_id
            return (
              <div key={m.id} style={{alignSelf:mine?'flex-end':'flex-start',maxWidth:'80%',background:mine?'var(--g)':'var(--card)',color:mine?'white':'var(--text)',borderRadius:14,padding:'9px 13px',fontSize:14,lineHeight:1.5,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                {m.body}
                <div style={{fontSize:10,opacity:0.65,marginTop:3,textAlign:'right'}}>{new Date(m.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            )
          })}
          <div ref={endRef}/>
        </div>
        {info && (
          <form onSubmit={send} style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <textarea rows={2} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Nachricht schreiben…" style={{flex:1,padding:10,borderRadius:12,border:'1.5px solid var(--border)',fontFamily:'inherit',fontSize:14}}/>
            <button type="submit" disabled={sending || !text.trim()} style={{padding:'11px 18px',background:'var(--g)',color:'white',border:'none',borderRadius:12,fontWeight:600,cursor:'pointer',opacity:sending||!text.trim()?0.6:1}}>Senden</button>
          </form>
        )}
        {error && <div style={{color:'#b3261e',fontSize:13,marginTop:8}}>{error}</div>}
      </div>
    </div>
  )
}
