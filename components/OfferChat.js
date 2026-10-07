import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OfferChat({ offerId }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const lastLen = useRef(0)

  async function load() {
    const { data } = await supabase.rpc('offer_chat_messages', { p_offer: offerId })
    setMsgs(data || [])
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [offerId])
  useEffect(() => {
    if (msgs.length !== lastLen.current) { lastLen.current = msgs.length; endRef.current?.scrollIntoView({ block: 'nearest' }) }
  }, [msgs])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('send_offer_message', { p_offer: offerId, p_body: text })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setText(''); load()
  }

  return (
    <div style={{background:'var(--card)',borderRadius:14,padding:20,marginBottom:24}}>
      <div style={{fontWeight:700,marginBottom:12}}>💬 Gruppen-Chat</div>
      <div style={{maxHeight:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
        {msgs.length === 0 && <div style={{fontSize:13,color:'var(--muted)'}}>Noch keine Nachrichten. Sag Hallo 👋</div>}
        {msgs.map(m => (
          <div key={m.id} style={{alignSelf:m.mine?'flex-end':'flex-start',maxWidth:'85%',background:m.mine?'var(--g)':'var(--bg)',color:m.mine?'white':'var(--text)',borderRadius:12,padding:'8px 12px',fontSize:14,wordBreak:'break-word'}}>
            {!m.mine && <div style={{fontSize:11,fontWeight:700,opacity:.75,marginBottom:2}}>{m.sender_name}{m.from_kommune ? ' (Kommune)' : ''}</div>}
            <div style={{whiteSpace:'pre-wrap'}}>{m.body}</div>
            <div style={{fontSize:10,opacity:.6,marginTop:2,textAlign:'right'}}>{new Date(m.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        ))}
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
