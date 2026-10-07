import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OfferChat({ offerId, asId }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const lastLen = useRef(0)

  async function load() {
    const { data } = await supabase.rpc('offer_chat_messages', { p_offer: offerId, p_as: asId })
    setMsgs(data || [])
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [offerId, asId])
  useEffect(() => {
    if (msgs.length !== lastLen.current) { lastLen.current = msgs.length; endRef.current?.scrollIntoView({ block: 'nearest' }) }
  }, [msgs])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('send_offer_message', { p_offer: offerId, p_body: text, p_as: asId })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setText(''); load()
  }

  return (
    <div style={{background:'var(--card)',borderRadius:14,padding:20,marginBottom:24}}>
      <div style={{fontWeight:700,marginBottom:12}}>💬 Gruppen-Chat</div>
      <div style={{maxHeight:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
        {msgs.length === 0 && <div style={{fontSize:13,color:'var(--muted)'}}>Noch keine Nachrichten. Sag Hallo 👋</div>}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const hue = [...(m.sender_name || '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
          const nameColor = m.mine ? 'rgba(255,255,255,.95)' : `hsl(${hue},55%,35%)`
          return (
            <div key={m.id} style={{display:'flex',flexDirection:'column'}}>
              {newDay && <div style={{alignSelf:'center',fontSize:11,color:'var(--muted)',margin:'6px 0'}}>{new Date(m.created_at).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'})}</div>}
              <div style={{alignSelf:m.mine?'flex-end':'flex-start',maxWidth:'85%',background:m.mine?'var(--g)':'var(--bg)',color:m.mine?'white':'var(--text)',border:m.mine?'none':'1px solid var(--border)',borderRadius:12,padding:'8px 12px',fontSize:14,wordBreak:'break-word'}}>
                <div style={{fontSize:12,fontWeight:700,color:nameColor,marginBottom:2}}>{m.mine ? `Du (${m.sender_name})` : m.sender_name}{m.from_kommune ? ' · Kommune' : ''}</div>
                <div style={{whiteSpace:'pre-wrap'}}>{m.body}</div>
                <div style={{fontSize:10,opacity:.6,marginTop:2,textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>
      <form onSubmit={send} style={{display:'flex',gap:8}}>
        <input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Nachricht an die Gruppe…" style={{flex:1,minWidth:0,padding:'10px 12px',borderRadius:10,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:14}}/>
        <button type="submit" disabled={busy||!text.trim()} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'var(--g)',color:'white',fontWeight:600,cursor:'pointer'}}>Senden</button>
      </form>
      {err && <p style={{color:'#c0392b',fontSize:13,margin:'8px 0 0'}}>{err}</p>}
    </div>
  )
}
